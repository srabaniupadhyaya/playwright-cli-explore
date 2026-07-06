# Playwright Test Suite Design — Codemify Store Demo App

## Overview

Build an end-to-end Playwright test suite against the Codemify Store demo app
(`baseUrl` + `demoAppPath` from `config/config.json`, currently
`https://codemify-demo-app.vercel.app/demo-app`). The app was explored live via
`playwright-cli` before writing this design: it's a small e-commerce demo with
login, a 6-item product list, a cart, and a checkout form.

Findings from exploration that shape this design:

- Login has three states: valid (`standard_user`), locked-out (`locked_out_user`),
  and invalid credentials — all share password `my_secret_code`. Errors are
  rendered as inline text, not native browser validation.
- Products have no detail page — clicking the image/name is a no-op. The only
  interactive element per product is "Add to Cart".
- The cart nav badge shows the total quantity across items, and disappears
  entirely (not "0") when the cart is empty.
- Cart line items support quantity `+`/`−` and a direct "Remove" button.
  Decrementing a line item's quantity to 0 auto-removes it.
- Checkout is a single form (shipping + payment) using native HTML5 `required`
  validation — submitting empty focuses the first invalid field, no custom
  error text appears.
- A successful order shows an "Order Placed Successfully!" confirmation with
  the total, and clears the cart on return to Products.

## Scope

Full E2E coverage across four scenario groups:

### 1. Login
- 1.1 Valid login (`standard_user`) → redirects to Products
- 1.2 Invalid credentials → shows "Username and password do not match any user in this service"
- 1.3 Locked-out user (`locked_out_user`) → shows "Sorry, this user has been locked out."
- 1.4 Logout → returns to login screen

### 2. Products
- 2.1 Product list renders all 6 items with name/price/Add to Cart
- 2.2 Adding a product updates the cart badge count

### 3. Cart
- 3.1 Add single item → shows in cart with correct line total
- 3.2 Add multiple items → cart total sums correctly
- 3.3 Increment quantity (+) → line total and badge update
- 3.4 Decrement quantity (−) → line total and badge update
- 3.5 Decrementing to 0 auto-removes the line item
- 3.6 Remove button removes an item directly
- 3.7 Empty cart shows "Your cart is empty" and no checkout button

### 4. Checkout
- 4.1 Required-field validation blocks submission when fields are empty
- 4.2 Full valid submission → "Order Placed Successfully!" with correct total
- 4.3 Cart is cleared after a successful order
- 4.4 Cancel button returns to cart without placing an order

## Architecture

**Page Object Model** — one class per page/component:
- `LoginPage` — username/password fields, login button, error message locator
- `ProductsPage` — product list, add-to-cart buttons, cart badge
- `CartPage` — line items, qty `+`/`−`, remove, total, checkout/continue buttons
- `CheckoutPage` — shipping/payment form fields, submit/cancel, confirmation banner

**Auth via shared storage state**: a `global-setup.ts` logs in once as
`standard_user` and saves `storageState` to `.playwright/.auth/user.json`
(already gitignored). Products/Cart/Checkout tests reuse this state via a
Playwright project config, avoiding a fresh UI login per test. Login-flow
tests (1.1–1.4) run unauthenticated since they test the login form itself.

**Credentials**: sourced from `config/config.json`'s existing (currently
empty) `credentials` block, populated locally with `standard_user` /
`my_secret_code`. Since `config/config.json` is gitignored, a committed
`config/config.example.json` will hold these same values pre-filled — they
are public demo credentials displayed directly on the login page, not real
secrets. A fresh clone runs `cp config/config.example.json config/config.json`
once before running tests.

**Folder layout:**
```
tests/
  fixtures.ts              # extends test with POM fixtures + seed navigation
  seed.spec.ts             # navigates to demo app (spec-driven generation entry point)
  pages/
    login.page.ts
    products.page.ts
    cart.page.ts
    checkout.page.ts
  login/
    should-login-with-valid-user.spec.ts
    should-reject-invalid-credentials.spec.ts
    should-reject-locked-out-user.spec.ts
    should-logout.spec.ts
  cart/
    ...one file per 3.x scenario
  checkout/
    ...one file per 4.x scenario
specs/
  login.plan.md
  cart.plan.md
  checkout.plan.md
```

## Workflow

Test generation follows the `playwright-cli` skill's spec-driven-testing
process (plan → generate → heal), not hand-authored code:

1. Write `specs/<group>.plan.md` for each scenario group first (scenario id,
   file path, numbered steps, `- expect:` outcomes).
2. Generate scenarios one at a time: start the seed test in `--debug=cli`,
   `playwright-cli attach` to the paused session, walk the steps, capture the
   real generated Playwright locators, write the `.spec.ts` file, close the
   session, move to the next scenario. Never run generation in parallel within
   a group — scenarios share the seed session.
3. Run each generated test once immediately after writing it; failures go
   through the skill's "heal" loop (diagnose via snapshot/console/requests,
   fix, reconcile the spec if the app's real behavior differs from what was
   planned).

## Error Handling / Edge Cases

- Login errors are inline text, not native validation — assert on the error
  message locator's text content.
- Checkout required fields use native HTML5 `required` — assert focus or
  `:invalid` pseudo-state rather than expecting custom error text.
- The cart badge is absent entirely (not "0") when the cart is empty —
  assertions must check for the badge's absence, not a zero value.

## CI

The existing `.github/workflows/playwright.yml` (currently disabled via the
GitHub UI) will pick up this suite automatically once re-enabled — no changes
to the workflow's test-running steps are needed. Since `config/config.json`
is gitignored, a step to generate it from `config.example.json` (or from
repository secrets, should the values ever become real secrets) will be
needed before `npx playwright test` can run in CI. No workflow changes are
being made as part of this project — noted here for whenever the workflow is
re-enabled.
