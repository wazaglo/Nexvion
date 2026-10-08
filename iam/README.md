# NEXVION — IAM policies

Infrastructure-as-code for the IAM permissions this project needs. Committing
policy documents is the point: a reviewer can read exactly what the application
is permitted to do, without granting anyone console access to check.

---

## `nexvion-albc-policy.json`

Attached to **`arn:aws:iam::195675606509:role/nexvion-albc`**, the AWS Load
Balancer Controller's role.

### Why customer-managed

The AWS-managed equivalent
(`arn:aws:iam::aws:policy/service-role/AWSLoadBalancerControllerPolicy`) returns
`NoSuchEntity` in this account and does not appear in the AWS managed-policy
catalogue, so there was nothing to attach. Writing our own is the better outcome
regardless: the permissions are auditable in git and reviewable in a pull request.

### How it is bound

Through IRSA (IAM Roles for Service Accounts). The trust policy on the role
pins the OIDC subject:

```
Principal: arn:aws:iam::195675606509:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/<CLUSTER_ID>
Action:    sts:AssumeRoleWithWebIdentity
Condition:
  aud = sts.amazonaws.com
  sub = system:serviceaccount:eks:aws-load-balancer-controller
```

The `sub` condition is the security-relevant part. Without it, **any** service
account in the `eks` namespace could mint a token and assume a role that creates
and modifies load balancers. With it, only the controller's own service account
can. Same role, very different blast radius.

The service account itself is created by the Helm chart, annotated with:

```yaml
eks.amazonaws.com/role-arn: arn:aws:iam::195675606509:role/nexvion-albc
```

### Scope

| Area | Why |
|---|---|
| `elasticloadbalancing:*` create/delete/listener/rule/target-group | Creating and reconciling the ALB, target groups and listener rules from Ingress objects |
| `elasticloadbalancing:AddTags` | Scoped by resource to `loadbalancer/*` only |
| `ec2:Describe*` on subnets, SGs, VPCs, ENIs, instances | The controller discovers subnets and security groups by tag to place the ALB. These are all read-only |
| `iam:CreateServiceLinkedRole` | One-time creation of the ELB service-linked role, gated on `iam:AWSServiceName == elasticloadbalancing.amazonaws.com` |
| `wafv2:*` | Optional — required only if a WAF web ACL is attached to the ALB |

The service-linked-role statement is deliberately conditioned. Unconditional
`iam:CreateServiceLinkedRole` on `"Resource": "*"` is a recognised privilege-
escalation vector; the condition means the role can only be created for the ELB
service and nothing else.

---

## Drift warning

The policy in this directory currently has **16 statements / 86 actions**, while
the policy live in IAM has **8 statements / 60 actions**.

This file was **not** the one applied to AWS. The applied policy was authored
separately and is narrower. The extra permissions in this file include things
such as `wafv2` mutations that the running controller does not need.

Before this file is treated as the source of truth, one of the following must
happen:

1. **Narrow the file** to match what is actually attached, or
2. **Apply the file** with `aws iam put-role-policy` after reviewing the
   additional 26 actions, or
3. **Document it** as the intended future state, and keep the narrower live
   policy until WAF is genuinely attached

Applying it blindly would widen the controller's permissions without review.
Least privilege means the committed document and the live policy should agree.

### Verifying they match

```bash
POLICY_ARN=arn:aws:iam::195675606509:policy/nexvion-albc-policy
VERSION=$(aws iam get-policy --policy-arn $POLICY_ARN \
  --query 'Policy.DefaultVersionId' --output text)

aws iam get-policy-version --policy-arn $POLICY_ARN --version-id $VERSION \
  --query 'PolicyVersion.Document' --output json > /tmp/live.json

# compare statement counts first — the cheapest useful signal
jq '.Statement | length' /tmp/live.json iam/nexvion-albc-policy.json
```

Compare statements before comparing the document: statement count catches almost
all real drift immediately, and a full document diff is noisy because IAM
re-serialises the JSON with different key order and whitespace.