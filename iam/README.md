# NEXVION — IAM roles

Reference notes for the IAM roles this project creates. The policy documents
themselves are authored and maintained outside this repository; this file
explains how each role is wired and why it is scoped the way it is, so a reviewer
can follow the reasoning without needing console access.

---

## `nexvion-fargate-pod-exec`

```
arn:aws:iam::195675606509:role/nexvion-fargate-pod-exec
```

The **pod execution role** for both Fargate profiles (`fp-kube-system`,
`fp-nexvion`). Fargate has no node instance, so the node role's usual duties have
no home and must be replaced. This role fills the gap.

### Trust

```
Principal: { "Service": "eks-fargate-pods.amazonaws.com" }
Action:    sts:AssumeRole
Condition: StringEquals { "aws:SourceAccount": "195675606509" }
```

The service is `eks-fargate-pods.amazonaws.com`, **not** `eks.amazonaws.com`.
The latter is the control plane's service principal; a trust policy using it is a
common mistake and it fails silently — the profile is created, pods schedule,
and then every pod dies in `ImagePullBackOff` because nothing can pull an image.

`aws:SourceAccount` is a confused-deputy guard: only an EKS Fargate profile in
this account can assume the role.

### Permissions

| Policy | Why |
|---|---|
| `AmazonEC2ContainerRegistryPullOnly` | Pulls the NEXVION images from our ECR repositories |
| `CloudWatchAgentServerPolicy` | Ships container stdout to CloudWatch Logs |

`PullOnly` rather than `ReadOnly` — the latter also grants `ListImages` and
`DescribeImages`, which a workload never needs. No inline policies are attached,
so every permission stays visible in these two managed policies.

### Where it is referenced

Selected when each Fargate profile is created. It is **not** referenced by the
Helm chart, which is correct: pod execution roles are bound at profile creation,
not per pod.

---

## `nexvion-albc`

```
arn:aws:iam::195675606509:role/nexvion-albc
```

The **AWS Load Balancer Controller's** role. The controller creates the ALB,
target groups and listener rules from Ingress objects, so it needs ELB and EC2
permissions plus permission to create the ELB service-linked role on first use.

### Trust — IRSA with a pinned subject

```
Principal: arn:aws:iam::195675606509:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/<CLUSTER_ID>
Action:    sts:AssumeRoleWithWebIdentity
Condition:
  <issuer>:aud = sts.amazonaws.com
  <issuer>:sub = system:serviceaccount:eks:aws-load-balancer-controller
```

The `sub` condition is the security-relevant part. Without it, **any** service
account in the `kube-system` namespace could mint a token and assume a role that
creates and modifies internet-facing load balancers. With it, only the
controller's own service account can. Same role, very different blast radius.

`<CLUSTER_ID>` must match the cluster's OIDC issuer exactly. Get it with:

```bash
aws eks describe-cluster --name nexvion-demo --region us-east-1 \
  --query 'cluster.identity.oidc.issuer' --output text
```

Strip the `https://` for the `Federated` principal; keep it in the condition
keys.

### Service account binding

Created by the Helm chart, not by hand:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::195675606509:role/nexvion-albc
```

Note the syntax for chart 3.6.0+. Older AWS documentation and most tutorials
use `serviceAccount.iamRoleArn=arn:...`, which **does not exist in that chart**
and silently produces a ServiceAccount with no IAM role at all.

### OIDC provider registration — easy to miss

IRSA is three parts, not two. Creating the role and annotating the ServiceAccount
is necessary but **not sufficient**. The OIDC provider must also be registered on
the cluster:

```bash
aws eks create-identity-provider-config --region us-east-1 \
  --cluster-name nexvion-demo \
  --name nexvion \
  --oidc-issuer-url https://oidc.eks.us-east-1.amazonaws.com/id/<CLUSTER_ID>
```

Without it the API server will not issue a usable identity token, and every AWS
call from the controller fails with:

```
InvalidIdentityToken: The web identity token provided could not be validated
```

The controller then retries indefinitely and the Ingress `ADDRESS` stays empty
with **no ALB ever created**. The symptom points at IAM but not at the missing
registration, which is what makes it expensive to debug.

---

## Verifying a role can actually be assumed

Rather than trusting that the trust policy *looks* right, ask STS directly. For
IRSA this needs a real projected token, so the practical check is to look for the
absence of `InvalidIdentityToken` in the controller's logs after restarting it:

```bash
kubectl -n kube-system rollout restart deploy/aws-load-balancer-controller
kubectl -n kube-system logs -l app.kubernetes.io/name=aws-load-balancer-controller \
  --tail=50 | grep -i 'InvalidIdentityToken\|Forbidden'
```

An empty result means IRSA is working.