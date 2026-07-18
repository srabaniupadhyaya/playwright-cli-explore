# Playwright best practices for this repo

Read this before writing or reviewing test code (specs, page objects, or
fixtures). It is not loaded by default — open it explicitly when the task
touches locators, waits, or assertions.

**No hard waits.** Never use `page.waitForTimeout()`, `setTimeout`, or manual
sleeps to "let the UI catch up." Playwright's locators and web-first
assertions (`expect(locator).toBeVisible()`, `.toHaveText()`, `.toHaveCount()`,
etc.) already auto-retry until the condition is true or the timeout in
`config/config.json` elapses. If a test is flaky, the fix is a better
locator/assertion, not a `waitForTimeout`. If you inherit or generate a test
containing one, remove it and replace it with the assertion it was standing
in for.

**Locator priority** (use the first one that uniquely and semantically
identifies the element):
1. `getByRole(role, { name })` — matches how users/assistive tech perceive
   the element; prefer `{ exact: true }` when the accessible name could
   otherwise partial-match a sibling (see `productHeading()` in
   `products.page.ts`).
2. `getByLabel` / `getByPlaceholder` — form fields without a strong role name.
3. `getByText(text, { exact: true })` — static content with no role,
   preferring exact matches over substring matches to avoid picking up
   unrelated text.
4. `getByTestId` — only when the app exposes `data-testid` and no accessible
   locator is available.
5. CSS/XPath (`page.locator('.foo')`) — last resort only; do not use for new
   scenarios, since it's the first thing to break on markup changes.

Avoid chaining brittle structural locators (`.locator('div > span:nth-child(2)')`);
prefer scoping a role/text locator inside another locator instead
(`cartPage.lineItem('Codemify Backpack').getByRole('button', { name: '−' })`).

**Waiting on network activity.** When an action triggers a request whose
response the UI depends on (e.g. checkout submission calling an API before
navigating), wrap the action in `page.waitForResponse()` (or
`page.waitForRequest()` when only the request matters) rather than waiting on
a resulting UI element that might render before the response settles:

```ts
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/checkout') && res.ok()),
  checkoutPage.submitButton.click(),
]);
```

Always pair the `waitForResponse`/`waitForRequest` call with the triggering
action inside `Promise.all` (not awaited sequentially before or after) so the
listener is attached before the request fires.

**Assertions, not manual polling.** Use `expect(locator).toBeVisible()` /
`toHaveText()` / `toHaveCount()` / `toBeEnabled()` etc. instead of reading a
locator's state with `.isVisible()`/`.textContent()` and asserting on the
result — the latter checks once and doesn't retry, which is a common source
of flakiness disguised as a hard wait.

**Page Objects only expose locators and multi-step actions**, never
assertions — keep `expect(...)` calls in the `.spec.ts` files so test intent
stays visible there. A POM method should either return a `Locator` (for the
test to assert on) or perform a user action (`login()`, `addToCart()`), not
both silently combine an action with a pass/fail check.
