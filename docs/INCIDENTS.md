# NEXVION — incident log and lessons

Real failures hit while bringing this deployment up, recorded because the *diagnosis*
is the transferable part. Each of these presented as something other than its cause.

---

## 1. Pods `Pending` — image pulls timing out

**Symptom**

```
FailedScheduling  no nodes available to schedule pods
...
dial tcp 3.211.78.238:443: i/o timeout
```

**Apparent cause:** the cluster had no worker nodes.

**Actual cause:** nodes existed and were `Ready`, but had **no public IP**. The
subnets had `MapPublicIpOnLaunch: false`, there was no NAT gateway, and there
were no VPC endpoints. A packet from an instance with no public address is
dropped at the internet gateway.

Nodes bootstrapped fine because EKS Auto Mode bootstraps over the control
plane; only *image pulls* need node-level egress. That asymmetry is what makes
this confusing — a `Ready` node that cannot pull an image.

**Fix:** enable auto-assign public IP on the public subnets, then replace the
nodes so new ones receive addresses.

**Lesson:** `Pending` is a *scheduling* message. Check the specific reason —
`kubectl describe pod` distinguishes "no nodes" from "node taints" from
`ImagePullBackOff`. They have completely different fixes.

---

## 2. `metrics-server` stuck `Pending` on a healthy cluster

**Symptom**

```
2 node(s) had untolerated taint(s)
```

with a valid Fargate profile already selecting `kube-system`.

**Actual cause:** Fargate presents each pod as a *node*, and those nodes carry a
taint that EC2 nodes do not:

```
eks.amazonaws.com/compute-type=fargate:NoSchedule
```

CoreDNS tolerates `CriticalAddonsOnly` and `control-plane`, so it scheduled.
`metrics-server` only tolerates `CriticalAddonsOnly`, so it could not go
anywhere.

**Fix:** set the add-on's `computeType: Fargate` so it does not request node
placement at all, then `kubectl rollout restart`.

**Lesson:** when a workload schedules on Fargate but another does not, compare
their `tolerations` before touching the Fargate profile. The profile was fine.

---

## 3. CoreDNS and everything downstream broken by one add-on setting

CoreDNS defaults to EC2 compute. On a Fargate-only cluster it sits `Pending` on
the `CriticalAddonsOnly` taint, and **every DNS lookup in the cluster fails** —
which surfaces as "my application cannot reach its database", never as "an add-on
is misconfigured".

**Fix:** set `computeType: Fargate` on the CoreDNS add-on **and** restart the
deployment. Editing the add-on does not restart existing pods, so without the
rollout it stays `Pending` and you wrongly conclude the profile is broken.

---

## 4. ALB never created — three separate causes in sequence

This one took several rounds. Each fix moved the failure somewhere further along.

### 4a. Wrong `sub` in the trust policy

```
InvalidIdentityToken: The web identity token provided could not be validated
```

The role trusted:

```
sub = system:serviceaccount:eks:aws-load-balancer-controller
```

but the controller runs in `kube-system`, so the token carried:

```
sub = system:serviceaccount:kube-system:aws-load-balancer-controller
```

`eks` vs `kube-system`. **Never copy a trust policy without checking the
namespace it is actually used from.**

### 4b. The OIDC provider did not exist in IAM

With the `sub` fixed, the error persisted. Checking IAM directly:

```
aws iam list-open-id-connect-providers
→ only token.actions.githubusercontent.com
```

There was **no provider for this cluster at all.** EKS is supposed to create it
automatically; it had not. `AssociateIdentityProviderConfig` also refuses to
register the cluster's own issuer ("URL cannot be same as OIDC issuer URL"), so
the provider had to be created directly:

```bash
aws iam create-open-id-connect-provider \
  --url https://oidc.eks.us-east-1.amazonaws.com/id/<CLUSTER_ID> \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list <thumbprint>
```

### 4c. Missing EC2 security-group permissions

Then it authenticated correctly and failed on:

```
not authorized to perform: ec2:AuthorizeSecurityGroupIngress
```

The IAM policy had `CreateSecurityGroup` and `DeleteSecurityGroup` but not the
`Authorize`/`Revoke` pair. Missing permissions surface one at a time as the
controller progresses — expect several rounds.

### 4d. `AddTags` scoped too narrowly

```
not authorized to perform: elasticloadbalancing:AddTags on resource:
.../targetgroup/k8s-nexvion-nexviona-1b0090ea79/*
```

The policy scoped `AddTags` to `loadbalancer/*`, but the controller tags target
groups as well.

**Lesson:** scoping an action by resource ARN is correct but must cover every
resource type the caller touches. Narrowing permissions iteratively by watching
403s is slower and riskier than starting from AWS's documented policy and
removing what is genuinely unnecessary.

---

## 5. `helm test` reported a false failure

```
nexvion/assets:      UNREACHABLE  FAIL
nexvion/checkout:    UNREACHABLE  FAIL
nexvion/storefront:  UNREACHABLE  FAIL
```

All three services were healthy. The test pod's image (`amazonlinux:2023`) **does
not ship `wget`**; it ships `curl`. The test was measuring its own missing
binary, not the services.

This is the worst class of failure: a green-to-red test that sends you debugging
a system that is working. A test asserting on the wrong thing is worse than no
test, because it manufactures false confidence in both directions.

**Lesson:** when a smoke test fails, verify the test harness before the system.

---

## 6. My own bug — `preserve_client_ip` broke every deploy

```
InvalidConfigurationRequest: A target group with HTTP protocol does not
support the attribute preserve_client_ip.enabled
```

I added this annotation to "preserve the client IP", which is only valid for
**HTTPS** target groups. Unconditionally, it broke every deployment without an
ACM certificate — which is the dev path, and the first thing anyone tries.

The related `listen-ports` annotation had the same shape: it declared an HTTPS
listener with no certificate, so `CreateListener` failed with *"A certificate
must be specified"*.

Both are now gated on `ingress.certificateArn`.

**Lesson:** an annotation that changes AWS-side resources must be validated
against every configuration it can appear in, not just the one it was written
for. Both bugs were caught only by actually deploying.

---

## 7. ECR scan-on-push silently did nothing

Images were pushed as OCI **indexes** (BuildKit provenance), a type ECR's basic
scanner rejects. The repository reported no findings and no error — so "no
vulnerabilities found" was indistinguishable from "never scanned".

**Fix:** build and push with `--provenance=false --platform linux/amd64`.

**Lesson:** verify the security control actually ran. An empty result from a
scanner is not evidence of cleanliness until you have confirmed the scanner
engaged.

---

## Cross-cutting themes

1. **Read the actual error.** Each of these had a precise message naming the
   missing permission, the mismatched string, or the rejected media type.
2. **Verify control-plane state separately from data-plane state.** Ready nodes,
   valid profiles and active add-ons coexisted with a completely broken Ingress.
3. **Failures move; they do not disappear.** Fixing authentication revealed a
   permission gap, which revealed a resource-scoping gap.
4. **Prefer AWS's documented policy, then subtract.** Starting from the official
   ALB permissions and removing what is unused beats adding actions in response
   to 403s.
5. **Assert, do not assume.** Digest pinning, integrity checks, and tests that
   exercise real logic are what turn silent breakage into a loud failure.