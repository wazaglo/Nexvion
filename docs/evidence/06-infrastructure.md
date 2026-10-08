# Networking topology

## Subnets
```
{
    "Subnets": [
        {
            "AvailabilityZoneId": "use1-az2",
            "MapCustomerOwnedIpOnLaunch": false,
            "OwnerId": "195675606509",
            "AssignIpv6AddressOnCreation": false,
            "Ipv6CidrBlockAssociationSet": [],
            "Tags": [
                {
                    "Key": "kubernetes.io/cluster/nexvion-demo",
                    "Value": "shared"
                },
                {
                    "Key": "Name",
                    "Value": "nexvion-public-b"
                },
                {
                    "Key": "kubernetes.io/role/elb",
                    "Value": "1"
                },
                {
                    "Key": "project",
                    "Value": "nexvion"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-east-1:195675606509:subnet/subnet-0ebd02c07cfaa38e1",
            "EnableDns64": false,
            "Ipv6Native": false,
            "PrivateDnsNameOptionsOnLaunch": {
                "HostnameType": "ip-name",
                "EnableResourceNameDnsARecord": false,
                "EnableResourceNameDnsAAAARecord": false
            },
            "BlockPublicAccessStates": {
                "InternetGatewayBlockMode": "off"
            },
            "SubnetId": "subnet-0ebd02c07cfaa38e1",
            "State": "available",
            "VpcId": "vpc-073beddd75d9c4830",
            "CidrBlock": "10.0.16.0/24",
            "AvailableIpAddressCount": 249,
            "AvailabilityZone": "us-east-1b",
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": true
        },
        {
            "AvailabilityZoneId": "use1-az1",
            "MapCustomerOwnedIpOnLaunch": false,
            "OwnerId": "195675606509",
            "AssignIpv6AddressOnCreation": false,
            "Ipv6CidrBlockAssociationSet": [],
            "Tags": [
                {
                    "Key": "project",
                    "Value": "nexvion"
                },
                {
                    "Key": "kubernetes.io/cluster/nexvion-demo",
                    "Value": "shared"
                },
                {
                    "Key": "kubernetes.io/role/elb",
                    "Value": "1"
                },
                {
                    "Key": "Name",
                    "Value": "nexvion-public-a"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-east-1:195675606509:subnet/subnet-051af79b71f230d38",
            "EnableDns64": false,
            "Ipv6Native": false,
            "PrivateDnsNameOptionsOnLaunch": {
                "HostnameType": "ip-name",
                "EnableResourceNameDnsARecord": false,
                "EnableResourceNameDnsAAAARecord": false
            },
            "BlockPublicAccessStates": {
                "InternetGatewayBlockMode": "off"
            },
            "SubnetId": "subnet-051af79b71f230d38",
            "State": "available",
            "VpcId": "vpc-073beddd75d9c4830",
            "CidrBlock": "10.0.0.0/24",
            "AvailableIpAddressCount": 249,
            "AvailabilityZone": "us-east-1a",
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": true
        },
        {
            "AvailabilityZoneId": "use1-az1",
            "MapCustomerOwnedIpOnLaunch": false,
            "OwnerId": "195675606509",
            "AssignIpv6AddressOnCreation": false,
            "Ipv6CidrBlockAssociationSet": [],
            "Tags": [
                {
                    "Key": "kubernetes.io/role/elb",
                    "Value": "1"
                },
                {
                    "Key": "project",
                    "Value": "nexvion"
                },
                {
                    "Key": "Name",
                    "Value": "nexvion-private-a"
                },
                {
                    "Key": "kubernetes.io/cluster/nexvion-demo",
                    "Value": "shared"
                }
            ],
            "SubnetArn": "arn:aws:ec2:us-east-1:195675606509:subnet/subnet-092b1e3f43862f06c",
            "EnableDns64": false,
            "Ipv6Native": false,
            "PrivateDnsNameOptionsOnLaunch": {
                "HostnameType": "ip-name",
                "EnableResourceNameDnsARecord": false,
                "EnableResourceNameDnsAAAARecord": false
            },
            "BlockPublicAccessStates": {
                "InternetGatewayBlockMode": "off"
            },
            "SubnetId": "subnet-092b1e3f43862f06c",
            "State": "available",
            "VpcId": "vpc-073beddd75d9c4830",
            "CidrBlock": "10.0.32.0/24",
            "AvailableIpAddressCount": 238,
            "AvailabilityZone": "us-east-1a",
            "DefaultForAz": false,
            "MapPublicIpOnLaunch": false
        }
    ]
}
```

## NAT gateway (private subnet egress for Fargate pods to reach ECR)
```
{
    "NatGateways": [
        {
            "CreateTime": "2026-10-08T09:40:35+00:00",
            "NatGatewayAddresses": [
                {
                    "AllocationId": "eipalloc-0f7ae2275cc922a5d",
                    "NetworkInterfaceId": "eni-0d027790617dda819",
                    "PrivateIp": "10.0.0.113",
                    "PublicIp": "52.4.25.90",
                    "AssociationId": "eipassoc-0e1711884be15efc0",
                    "IsPrimary": true,
                    "Status": "succeeded"
                }
            ],
            "NatGatewayId": "nat-0adb6bfc59c4e1980",
            "State": "available",
            "SubnetId": "subnet-051af79b71f230d38",
            "VpcId": "vpc-073beddd75d9c4830",
            "Tags": [
                {
                    "Key": "project",
                    "Value": "nexvion"
                },
                {
                    "Key": "Name",
                    "Value": "nexvion-nat"
                }
            ],
            "ConnectivityType": "public",
            "AvailabilityMode": "zonal",
            "AttachedAppliances": []
        }
    ]
}
```

## Route tables
```
nexvion-rt-private:
   10.0.0.0/16 -> local
   0.0.0.0/0 -> nat-0adb6bfc59c4e1980
nexvion-rt-public:
   10.0.0.0/16 -> local
   0.0.0.0/0 -> igw-0aae2e92d701f5149
rtb-05b8aa2c18a60a6e0:
   172.31.0.0/16 -> local
   0.0.0.0/0 -> igw-04834f6d20f343af8
rtb-091affc4ba9864a35:
   10.0.0.0/16 -> local
```

## Fargate profiles
```
{
    "fargateProfile": {
        "fargateProfileName": "fp-default",
        "fargateProfileArn": "arn:aws:eks:us-east-1:195675606509:fargateprofile/nexvion-demo/fp-default/e4d08d90-b1ca-c108-eacd-7b4313de126b",
        "clusterName": "nexvion-demo",
        "createdAt": "2026-10-08T10:48:56.096000+00:00",
        "podExecutionRoleArn": "arn:aws:iam::195675606509:role/nexvion-fargate-pod-exec",
        "subnets": [
            "subnet-092b1e3f43862f06c"
        ],
        "selectors": [
            {
                "namespace": "default"
            }
        ],
        "status": "ACTIVE",
        "tags": {
            "Value": "nexvion",
            "Key": "project"
        },
        "health": {
            "issues": []
        }
    }
}
{
    "fargateProfile": {
        "fargateProfileName": "fp-kube-system",
        "fargateProfileArn": "arn:aws:eks:us-east-1:195675606509:fargateprofile/nexvion-demo/fp-kube-system/a6d08d84-3011-3a52-8914-be3e7d52ed0d",
        "clusterName": "nexvion-demo",
        "createdAt": "2026-10-08T10:21:36.994000+00:00",
        "podExecutionRoleArn": "arn:aws:iam::195675606509:role/nexvion-fargate-pod-exec",
        "subnets": [
            "subnet-092b1e3f43862f06c"
        ],
        "selectors": [
            {
                "namespace": "kube-system",
                "labels": {}
            }
        ],
        "status": "ACTIVE",
        "tags": {
            "project": "nexvion"
        },
        "health": {
            "issues": []
        }
    }
}
{
    "fargateProfile": {
        "fargateProfileName": "fp-nexvion",
        "fargateProfileArn": "arn:aws:eks:us-east-1:195675606509:fargateprofile/nexvion-demo/fp-nexvion/ded08d85-9d82-870a-50ef-41f0c5aa5550",
        "clusterName": "nexvion-demo",
        "createdAt": "2026-10-08T10:24:43.970000+00:00",
        "podExecutionRoleArn": "arn:aws:iam::195675606509:role/nexvion-fargate-pod-exec",
        "subnets": [
            "subnet-092b1e3f43862f06c"
        ],
        "selectors": [
            {
                "namespace": "nexvion",
                "labels": {}
            }
        ],
        "status": "ACTIVE",
        "tags": {},
        "health": {
            "issues": []
        }
    }
}
```

## IAM roles
```
{
    "name": "nexvion-fargate-pod-exec",
    "arn": "arn:aws:iam::195675606509:role/nexvion-fargate-pod-exec",
    "trust": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "eks-fargate-pods.amazonaws.com"
                },
                "Action": "sts:AssumeRole",
                "Condition": {
                    "StringEquals": {
                        "aws:SourceAccount": "195675606509"
                    }
                }
            }
        ]
    }
}
{
    "name": "nexvion-albc",
    "arn": "arn:aws:iam::195675606509:role/nexvion-albc",
    "trust": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "arn:aws:iam::195675606509:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/F9549582096C05362B9190DA7F218568"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "oidc.eks.us-east-1.amazonaws.com/id/F9549582096C05362B9190DA7F218568:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller",
                        "oidc.eks.us-east-1.amazonaws.com/id/F9549582096C05362B9190DA7F218568:aud": "sts.amazonaws.com"
                    }
                }
            }
        ]
    }
}
```

## ECR images (digests deployed)
```
--- nexvion-storefront ---
[
    {
        "tags": null,
        "digest": "sha256:3c905c6fa1b1527fa4ab91570f547c99da9e28e8b2e946af887b6f4a841401c4",
        "pushed": "2026-10-08T08:52:36.478000+00:00"
    },
    {
        "tags": null,
        "digest": "sha256:61f2c5a65af0bc000b8dee4d96d5b5aea0122e633554f1fd5d2eaeca4d8c59e9",
        "pushed": "2026-10-08T08:52:36.480000+00:00"
    },
    {
        "tags": [
            "be22c04",
            "0.1.0"
        ],
        "digest": "sha256:c99f7a21df1fb616bf2bda00012af4b2397c668d3da135bebaa8a9599a9dbe6f",
        "pushed": "2026-10-08T08:52:37.159000+00:00"
    },
    {
        "tags": [
            "0.1.1"
        ],
        "digest": "sha256:89f82b01576c90a80e051d391cfadee200adc79f313ac0b3956c8c46c331a39e",
        "pushed": "2026-10-08T09:02:07.302000+00:00"
    }
]
--- nexvion-checkout ---
[
    {
        "tags": null,
        "digest": "sha256:4a78c869aff4db0d12d925364c8f0a53deda1c7827ceac069314c0f9ab5c9ac8",
        "pushed": "2026-10-08T08:53:00.427000+00:00"
    },
    {
        "tags": null,
        "digest": "sha256:9649768a3e61aac429e1dfb6c1fc2bfd3505266390c2a2830b1f68891ea6c4c8",
        "pushed": "2026-10-08T08:53:00.447000+00:00"
    },
    {
        "tags": [
            "be22c04",
            "0.1.0"
        ],
        "digest": "sha256:2155be5427f7386e44ac761411b6e4c129c0b10adb0e534f3858b56a12aec0a6",
        "pushed": "2026-10-08T08:53:01.071000+00:00"
    },
    {
        "tags": [
            "0.1.1"
        ],
        "digest": "sha256:115dbfecddbe8478ca7f37f2a6f5846ab51ce3d7a9ae87121907892a6454980e",
        "pushed": "2026-10-08T09:02:21.597000+00:00"
    }
]
--- nexvion-assets ---
[
    {
        "tags": null,
        "digest": "sha256:bb7728a89c84babc4bb137b44ca5a7b546c38a7f669ea72d6601420da876dd15",
        "pushed": "2026-10-08T08:53:20.174000+00:00"
    },
    {
        "tags": null,
        "digest": "sha256:b05e30f80537727c58033f159dd24f72ce7f83042af3e9658b443fe3c12c96f6",
        "pushed": "2026-10-08T08:53:20.165000+00:00"
    },
    {
        "tags": [
            "0.1.1"
        ],
        "digest": "sha256:b72514ba80309e546463744fbdd6cac180946ca156db68ceedb0a1d5d0d1b8fa",
        "pushed": "2026-10-08T09:02:28.150000+00:00"
    },
    {
        "tags": [
            "0.1.0",
            "be22c04"
        ],
        "digest": "sha256:3dcfa61ec7e0c217195dbde3bd2b105be3722badf1c1dd29a32687f21ed88879",
        "pushed": "2026-10-08T08:53:20.796000+00:00"
    }
]
```
