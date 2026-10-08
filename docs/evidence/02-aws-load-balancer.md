# AWS-side evidence — 2026-10-08

## Load balancer
```
{
    "LoadBalancers": [
        {
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:loadbalancer/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0",
            "DNSName": "k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com",
            "CanonicalHostedZoneId": "Z35SXDOTRQ7X7K",
            "CreatedTime": "2026-10-08T13:37:16.950000+00:00",
            "LoadBalancerName": "k8s-nexvion-nexvion-629ab9ec7a",
            "Scheme": "internet-facing",
            "VpcId": "vpc-073beddd75d9c4830",
            "State": {
                "Code": "active"
            },
            "Type": "application",
            "AvailabilityZones": [
                {
                    "ZoneName": "us-east-1a",
                    "SubnetId": "subnet-051af79b71f230d38",
                    "LoadBalancerAddresses": []
                },
                {
                    "ZoneName": "us-east-1b",
                    "SubnetId": "subnet-0ebd02c07cfaa38e1",
                    "LoadBalancerAddresses": []
                }
            ],
            "SecurityGroups": [
                "sg-00b229a7ddcf07e01",
                "sg-0f2ef66b4633fe175"
            ],
            "IpAddressType": "ipv4",
            "EnablePrefixForIpv6SourceNat": "off"
        }
    ]
}
```

## Listener
```
{
    "Listeners": [
        {
            "ListenerArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:listener/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0/f821d71cf778897d",
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:loadbalancer/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0",
            "Port": 80,
            "Protocol": "HTTP",
            "DefaultActions": [
                {
                    "Type": "fixed-response",
                    "Order": 1,
                    "FixedResponseConfig": {
                        "StatusCode": "404",
                        "ContentType": "text/plain"
                    }
                }
            ]
        }
    ]
}
```

## Listener rules (path routing)
```
{
    "Rules": [
        {
            "RuleArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:listener-rule/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0/f821d71cf778897d/e53a476b38da2411",
            "Priority": "1",
            "Conditions": [
                {
                    "Field": "path-pattern",
                    "Values": [
                        "/payment.html"
                    ],
                    "PathPatternConfig": {
                        "Values": [
                            "/payment.html"
                        ]
                    }
                }
            ],
            "Actions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexvionc-cb1c37f4f7/d7c79eef1a2e46d8",
                    "Order": 1,
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexvionc-cb1c37f4f7/d7c79eef1a2e46d8",
                                "Weight": 1
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ],
            "IsDefault": false,
            "Transforms": []
        },
        {
            "RuleArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:listener-rule/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0/f821d71cf778897d/517f349672c20c6c",
            "Priority": "2",
            "Conditions": [
                {
                    "Field": "path-pattern",
                    "Values": [
                        "/logo.png"
                    ],
                    "PathPatternConfig": {
                        "Values": [
                            "/logo.png"
                        ]
                    }
                }
            ],
            "Actions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexviona-1b0090ea79/72adf10a6845e57c",
                    "Order": 1,
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexviona-1b0090ea79/72adf10a6845e57c",
                                "Weight": 1
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ],
            "IsDefault": false,
            "Transforms": []
        },
        {
            "RuleArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:listener-rule/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0/f821d71cf778897d/223fa24bd7433cae",
            "Priority": "3",
            "Conditions": [
                {
                    "Field": "path-pattern",
                    "Values": [
                        "/*"
                    ],
                    "PathPatternConfig": {
                        "Values": [
                            "/*"
                        ]
                    }
                }
            ],
            "Actions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexvions-3e932a19d4/343d48ade26f7fdb",
                    "Order": 1,
                    "ForwardConfig": {
                        "TargetGroups": [
                            {
                                "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:targetgroup/k8s-nexvion-nexvions-3e932a19d4/343d48ade26f7fdb",
                                "Weight": 1
                            }
                        ],
                        "TargetGroupStickinessConfig": {
                            "Enabled": false
                        }
                    }
                }
            ],
            "IsDefault": false,
            "Transforms": []
        },
        {
            "RuleArn": "arn:aws:elasticloadbalancing:us-east-1:195675606509:listener-rule/app/k8s-nexvion-nexvion-629ab9ec7a/c6fbda3e8542f6d0/f821d71cf778897d/2f40e71c6f4eafe0",
            "Priority": "default",
            "Conditions": [],
            "Actions": [
                {
                    "Type": "fixed-response",
                    "Order": 1,
                    "FixedResponseConfig": {
                        "StatusCode": "404",
                        "ContentType": "text/plain"
                    }
                }
            ],
            "IsDefault": true,
            "Transforms": []
        }
    ]
}
```

## Target groups + health
```
--- k8s-nexvion-nexviona-1b0090ea79 ---
{
    "TargetHealthDescriptions": [
        {
            "Target": {
                "Id": "10.0.32.196",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        },
        {
            "Target": {
                "Id": "10.0.32.4",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        }
    ]
}
--- k8s-nexvion-nexvionc-cb1c37f4f7 ---
{
    "TargetHealthDescriptions": [
        {
            "Target": {
                "Id": "10.0.32.216",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        },
        {
            "Target": {
                "Id": "10.0.32.177",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        }
    ]
}
--- k8s-nexvion-nexvions-3e932a19d4 ---
{
    "TargetHealthDescriptions": [
        {
            "Target": {
                "Id": "10.0.32.180",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        },
        {
            "Target": {
                "Id": "10.0.32.6",
                "Port": 8080,
                "AvailabilityZone": "us-east-1a"
            },
            "HealthCheckPort": "8080",
            "TargetHealth": {
                "State": "healthy"
            },
            "AdministrativeOverride": {
                "State": "no_override",
                "Reason": "AdministrativeOverride.NoOverride",
                "Description": "No override is currently active on target"
            }
        }
    ]
}
```
