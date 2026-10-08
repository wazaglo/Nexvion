# Captured 2026-10-08T14:09:14Z — live NEXVION deployment

## Helm releases
```
NAME                        	NAMESPACE  	REVISION	UPDATED                                	STATUS  	CHART                             	APP VERSION
aws-load-balancer-controller	kube-system	1       	2026-10-08 10:59:36.64943613 +0000 UTC 	deployed	aws-load-balancer-controller-3.6.0	v3.6.0     
nexvion                     	nexvion    	3       	2026-10-08 13:54:55.692384716 +0000 UTC	deployed	nexvion-0.1.0                     	0.1.0      
```

## Deployments
```
NAME                 READY   UP-TO-DATE   AVAILABLE   AGE
nexvion-assets       2/2     2            2           137m
nexvion-checkout     2/2     2            2           137m
nexvion-storefront   2/2     2            2           137m
```

## Pods
```
NAMESPACE     NAME                                            READY   STATUS    RESTARTS   AGE
kube-system   aws-load-balancer-controller-5996479598-2jkzm   1/1     Running   0          7m8s
kube-system   aws-load-balancer-controller-5996479598-nz5hm   1/1     Running   0          8m12s
kube-system   coredns-6c5f8f4f76-b7rqj                        1/1     Running   0          3h35m
kube-system   coredns-6c5f8f4f76-dsn6s                        1/1     Running   0          3h35m
kube-system   metrics-server-54959df7bc-7fw5x                 1/1     Running   0          3h30m
kube-system   metrics-server-54959df7bc-knptl                 1/1     Running   0          3h30m
nexvion       nexvion-assets-577ccff554-m6cbb                 1/1     Running   0          137m
nexvion       nexvion-assets-577ccff554-x2xn4                 1/1     Running   0          137m
nexvion       nexvion-checkout-b575cdf9f-mkdgz                1/1     Running   0          137m
nexvion       nexvion-checkout-b575cdf9f-zg4ww                1/1     Running   0          137m
nexvion       nexvion-storefront-56f69c99f6-2rz7c             1/1     Running   0          137m
nexvion       nexvion-storefront-56f69c99f6-xlhfs             1/1     Running   0          137m
```

## Services
```
NAME                 TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
nexvion-assets       ClusterIP   172.20.193.199   <none>        8080/TCP   137m
nexvion-checkout     ClusterIP   172.20.153.102   <none>        8080/TCP   137m
nexvion-storefront   ClusterIP   172.20.75.10     <none>        8080/TCP   137m
```

## Ingress
```
NAME      CLASS   HOSTS   ADDRESS                                                                PORTS   AGE
nexvion   alb     *       k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com   80      137m
```

## HorizontalPodAutoscaler
```
NAME                 REFERENCE                       TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
nexvion-assets       Deployment/nexvion-assets       cpu: 4%/70%   2         4         2          137m
nexvion-checkout     Deployment/nexvion-checkout     cpu: 2%/70%   2         4         2          137m
nexvion-storefront   Deployment/nexvion-storefront   cpu: 2%/70%   2         4         2          137m
```

## PodDisruptionBudget
```
NAME                 MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
nexvion-assets       1               N/A               1                     137m
nexvion-checkout     1               N/A               1                     137m
nexvion-storefront   1               N/A               1                     137m
```
