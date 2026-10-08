# Functional tests against the live ALB

Target: `http://k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com`

The application JavaScript served here is the **minified** bundle built in
the Docker builder stage and pulled from ECR. These assertions exercise the
real cart and auth logic in a real DOM, so a regression in the minifier
would fail here.

```
  NEXVION live test via ALB: http://k8s-nexvion-nexvion-629ab9ec7a-599425356.us-east-1.elb.amazonaws.com
  Serving the MINIFIED bundle from ECR
    PASS  money() exposed and callable
    PASS  money(2999) => INR
    PASS  escapeHTML blocks script tags
    PASS  cart starts empty
    PASS  addToCart(1) x2 => count 2
    PASS  addToCart(11) => 3 lines
    PASS  cartTotal = 2x2999 + 999 = 6997
    PASS  changeQuantity(1,-1) decrements one
    PASS  cart persists to localStorage
    PASS  removeFromCart(11)
    PASS  empty the cart
    PASS  4 featured products rendered
    PASS  register persists + signs in
    PASS  checkout blocked while signed out
    PASS  checkout snapshot written once signed in
  ----------------------------------------------------------
    15 passed, 0 failed
  ----------------------------------------------------------
```

The same suite runs against a locally built container as part of image
verification, where it covers the checkout service's payment validation too.
