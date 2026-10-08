# Security posture — captured live

## Pod security context (all three services)
```
### nexvion-assets
pod: {"fsGroup":101,"runAsGroup":101,"runAsNonRoot":true,"runAsUser":101,"seccompProfile":{"type":"RuntimeDefault"}}
container: {"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"runAsUser":101}
automountServiceAccountToken: false
serviceAccountName: nexvion

### nexvion-checkout
pod: {"fsGroup":101,"runAsGroup":101,"runAsNonRoot":true,"runAsUser":101,"seccompProfile":{"type":"RuntimeDefault"}}
container: {"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"runAsUser":101}
automountServiceAccountToken: false
serviceAccountName: nexvion

### nexvion-storefront
pod: {"fsGroup":101,"runAsGroup":101,"runAsNonRoot":true,"runAsUser":101,"seccompProfile":{"type":"RuntimeDefault"}}
container: {"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"privileged":false,"readOnlyRootFilesystem":true,"runAsNonRoot":true,"runAsUser":101}
automountServiceAccountToken: false
serviceAccountName: nexvion

```

## Namespace Pod Security Standards labels
```
NAME      STATUS   AGE     LABELS
nexvion   Active   3h48m   k8slens-edit-resource-version=v1,kubernetes.io/metadata.name=nexvion,pod-security.kubernetes.io/audit=restricted,pod-security.kubernetes.io/enforce=restricted,pod-security.kubernetes.io/warn=restricted
```

## Images pinned by digest
```
nexvion-assets	195675606509.dkr.ecr.us-east-1.amazonaws.com/nexvion-assets@sha256:b72514ba80309e546463744fbdd6cac180946ca156db68ceedb0a1d5d0d1b8fa
nexvion-checkout	195675606509.dkr.ecr.us-east-1.amazonaws.com/nexvion-checkout@sha256:115dbfecddbe8478ca7f37f2a6f5846ab51ce3d7a9ae87121907892a6454980e
nexvion-storefront	195675606509.dkr.ecr.us-east-1.amazonaws.com/nexvion-storefront@sha256:89f82b01576c90a80e051d391cfadee200adc79f313ac0b3956c8c46c331a39e
```

## Pod user identity (must be 101, not root)
```
nexvion-assets-577ccff554-m6cbb          101
nexvion-assets-577ccff554-x2xn4          101
nexvion-checkout-b575cdf9f-mkdgz         101
nexvion-checkout-b575cdf9f-zg4ww         101
nexvion-storefront-56f69c99f6-2rz7c      101
nexvion-storefront-56f69c99f6-xlhfs      101
```

## Writeable volume mounts (nginx needs only /tmp)
```
nexvion-assets: [{"emptyDir":{"sizeLimit":"16Mi"},"name":"tmp"}]
nexvion-checkout: [{"emptyDir":{"sizeLimit":"16Mi"},"name":"tmp"}]
nexvion-storefront: [{"emptyDir":{"sizeLimit":"16Mi"},"name":"tmp"}]
```
