# Playwright Test Suite for Codemify Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Playwright E2E test suite covering login, products, cart, and checkout on the Codemify Store demo app, using Page Object Model and the `playwright-cli` spec-driven-testing workflow to generate verified test code.

**Architecture:** One Page Object class per screen (Login/Products/Cart/Checkout), a shared unauthenticated fixture for login-flow tests and a separate authenticated fixture (backed by a saved `storageState`) for post-login tests, and one `.spec.ts` file per scenario, generated from the single combined scenario plan at `specs/spec.md` per the `playwright-cli` skill's plan → generate → heal workflow.

**Tech Stack:** `@playwright/test` ^1.61, `@playwright/cli`, TypeScript, Node 22.

## Global Constraints

- Design doc: `docs/superpowers/specs/2026-07-06-playwright-test-suite-design.md` — every task below implements a section of it.
- Scenario plan: `specs/spec.md` — the single combined spec-driven-testing document (all 4 groups, 17 scenarios). Tasks 1–4 generate `.spec.ts` files from this file's sections; no task creates its own separate `specs/<group>.plan.md`.
- App under test: `${config.baseUrl}${config.demoAppPath}` (currently `https://codemify-demo-app.vercel.app/demo-app`), read from `config/config.json`.
- `config/config.json` is gitignored. A committed `config/config.example.json` holds the same shape with the one real authenticated account (`standard_user` / `my_secret_code`) pre-filled — these are public demo credentials shown directly on the login page, not real secrets.
- The locked-out (`locked_out_user` / `my_secret_code`) and invalid (`wrong_user` / `wrong_pass`) login combos are **not** stored in `config.json` (that field is reserved for the one real authenticated account used to build `storageState`). Define them as local constants directly in the login spec files that need them.
- Decrement button label uses the Unicode minus sign **−** (U+2212), not a hyphen. Multiplication in cart line totals uses **×** (U+00D7). Copy these exact characters when matching button/text locators — do not substitute ASCII `-`/`x`.
- The cart nav button's accessible name is `"Cart"` when empty and `"Cart N"` (e.g. `"Cart 3"`) when it holds N total items — there is no `"Cart 0"` state.
- Checkout's required fields use native HTML5 validation (no custom error text) — assert via focus/`:invalid`, not text assertions.
- This is E2E testing against an already-live external app, not new application code, so the usual TDD red→green cycle is adapted: write the POM method(s) + the test, run it once, and treat a FAIL as a signal to re-diagnose the locator/assertion (via `playwright-cli` snapshot/generate-locator/eval) rather than as an expected first-round failure.
- Every scenario's generation step must be run against its group's seed file via `playwright-cli attach`, one scenario at a time (never in parallel — they share the seed's debug session). Close the debug session before moving to the next scenario.
- Commit after each task.

---

### Task 0: Project Scaffolding & Auth Setup

**Files:**
- Create: `config/config.example.json`
- Create: `tests/global-setup.ts`
- Modify: `playwright.config.ts`
- Create: `tests/fixtures.ts`
- Create: `tests/fixtures-authenticated.ts`
- Create: `tests/seed.spec.ts`
- Create: `tests/seed-authenticated.spec.ts`

**Interfaces:**
- Produces: `test`/`expect` exported from `tests/fixtures.ts` (unauthenticated — lands on the login screen) and from `tests/fixtures-authenticated.ts` (authenticated — lands on the Products screen). All later scenario spec files import one of these two, never `@playwright/test` directly.
- Produces: `.playwright/.auth/user.json` — the saved storage state file, written by `tests/global-setup.ts`, consumed by `tests/fixtures-authenticated.ts`.

- [ ] **Step 1: Create `config/config.example.json`**

```json
{
  "environment": "dev",
  "baseUrl": "https://codemify-demo-app.vercel.app",
  "demoAppPath": "/demo-app",
  "credentials": {
    "username": "standard_user",
    "password": "my_secret_code"
  },
  "timeouts": {
    "defaultTimeout": 30000,
    "navigationTimeout": 30000,
    "actionTimeout": 15000
  },
  "headless": true
}
```

- [ ] **Step 2: Populate the local (gitignored) `config/config.json` the same way**

Run: `cp config/config.example.json config/config.json` (PowerShell: `Copy-Item config/config.example.json config/config.json -Force`)

This is a local, untracked step — `config/config.json` is not committed.

- [ ] **Step 3: Fix `playwright.config.ts` baseURL to include `demoAppPath`**

The current config sets `baseURL: config.baseUrl`, which omits `/demo-app`. Fixtures below navigate to `'/'`, so the base URL must already point at the app root.

Modify `playwright.config.ts:28-30`:

```ts
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: `${config.baseUrl}${config.demoAppPath}`,
```

Also add `globalSetup` near the top of the `defineConfig({...})` object (after `testDir`):

```ts
export default defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./tests/global-setup'),
```

- [ ] **Step 4: Create `tests/global-setup.ts`**

```ts
import { chromium, type FullConfig } from '@playwright/test';
import config from '../config/config.json';

export default async function globalSetup(fullConfig: FullConfig) {
  const project = fullConfig.projects[0];
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: project.use.baseURL });

  await page.goto('/');
  await page.getByRole('textbox', { name: 'Username' }).fill(config.credentials.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(config.credentials.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('heading', { name: 'Products' }).waitFor();

  await page.context().storageState({ path: '.playwright/.auth/user.json' });
  await browser.close();
}
```

- [ ] **Step 5: Create `tests/fixtures.ts` (unauthenticated)**

```ts
import { test as baseTest } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});
```

- [ ] **Step 6: Create `tests/fixtures-authenticated.ts`**

```ts
import { test as baseTest } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  storageState: '.playwright/.auth/user.json',
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});
```

- [ ] **Step 7: Create `tests/seed.spec.ts`**

```ts
import { test } from './fixtures';

test('seed', async () => {
  // Fixture already navigates to the (unauthenticated) login screen.
});
```

- [ ] **Step 8: Create `tests/seed-authenticated.spec.ts`**

```ts
import { test } from './fixtures-authenticated';

test('seed-authenticated', async () => {
  // Fixture already navigates to the (authenticated) Products screen.
});
```

- [ ] **Step 9: Verify both seeds run and land on the expected screen**

Run: `npx playwright test tests/seed.spec.ts tests/seed-authenticated.spec.ts --project=chromium`
Expected: `2 passed`

- [ ] **Step 10: Commit**

```bash
git add config/config.example.json playwright.config.ts tests/global-setup.ts tests/fixtures.ts tests/fixtures-authenticated.ts tests/seed.spec.ts tests/seed-authenticated.spec.ts
git commit -m "test: scaffold Playwright fixtures, global auth setup, and seed tests"
```

---

### Task 1: Login Page Object + Login Scenarios (1.1–1.4)

**Files:**
- Create: `tests/pages/login.page.ts`
- Create: `tests/login/should-login-with-valid-user.spec.ts`
- Create: `tests/login/should-reject-invalid-credentials.spec.ts`
- Create: `tests/login/should-reject-locked-out-user.spec.ts`
- Create: `tests/login/should-logout.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `tests/fixtures.ts` (Task 0).
- Produces: `LoginPage` class — `constructor(page: Page)`, `usernameInput: Locator`, `passwordInput: Locator`, `loginButton: Locator`, `login(username: string, password: string): Promise<void>`, `errorMessage(text: string): Locator`.

- [ ] **Step 1: Create `tests/pages/login.page.ts`**

```ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
```

- [ ] **Step 2: Read the "1. Login" section of `specs/spec.md`**

Open `specs/spec.md` and locate scenarios 1.1–1.4 under "### 1. Login" — this is the scenario source for the steps below (no file is created in this step).

- [ ] **Step 3: Generate and write `should-login-with-valid-user.spec.ts`**

Run in background: `PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed.spec.ts --debug=cli`, then `playwright-cli attach tw-XXXX`, `playwright-cli resume`, `playwright-cli snapshot` to confirm the "Username"/"Password"/"Login" refs match `login.page.ts`, then close the session (`playwright-cli close`, stop the background run).

Write the test:

```ts
// spec: specs/spec.md (Section 1: Login)
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/login.page';

test('should login with valid user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // 1. Fill "Username" with "standard_user" and "Password" with "my_secret_code"
  await loginPage.login('standard_user', 'my_secret_code');

  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
});
```

- [ ] **Step 4: Run it**

Run: `npx playwright test tests/login/should-login-with-valid-user.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 5: Write `should-reject-invalid-credentials.spec.ts`**

```ts
// spec: specs/spec.md (Section 1: Login)
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/login.page';

test('should reject invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // 1. Fill "Username" with "wrong_user" and "Password" with "wrong_pass", click "Login"
  await loginPage.login('wrong_user', 'wrong_pass');

  await expect(
    loginPage.errorMessage('Username and password do not match any user in this service')
  ).toBeVisible();
});
```

- [ ] **Step 6: Run it**

Run: `npx playwright test tests/login/should-reject-invalid-credentials.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 7: Write `should-reject-locked-out-user.spec.ts`**

```ts
// spec: specs/spec.md (Section 1: Login)
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/login.page';

test('should reject locked out user', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // 1. Fill "Username" with "locked_out_user" and "Password" with "my_secret_code", click "Login"
  await loginPage.login('locked_out_user', 'my_secret_code');

  await expect(loginPage.errorMessage('Sorry, this user has been locked out.')).toBeVisible();
});
```

- [ ] **Step 8: Run it**

Run: `npx playwright test tests/login/should-reject-locked-out-user.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 9: Write `should-logout.spec.ts`**

```ts
// spec: specs/spec.md (Section 1: Login)
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/login.page';

test('should logout', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // 1. Fill "Username" with "standard_user" and "Password" with "my_secret_code", click "Login"
  await loginPage.login('standard_user', 'my_secret_code');
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

  // 2. Click "Logout"
  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page.getByText('Please login to continue')).toBeVisible();
});
```

- [ ] **Step 10: Run it**

Run: `npx playwright test tests/login/should-logout.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 11: Run the whole login group together**

Run: `npx playwright test tests/login/ --project=chromium`
Expected: `4 passed`

- [ ] **Step 12: Commit**

```bash
git add tests/pages/login.page.ts tests/login/
git commit -m "test: add login page object and login flow scenarios"
```

---

### Task 2: Products Page Object + Products Scenarios (2.1–2.2)

**Files:**
- Create: `tests/pages/products.page.ts`
- Create: `tests/products/should-list-all-products.spec.ts`
- Create: `tests/products/should-update-cart-badge-on-add.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `tests/fixtures-authenticated.ts` (Task 0).
- Produces: `ProductsPage` class — `constructor(page: Page)`, `heading: Locator`, `itemCount: Locator`, `cartButton: Locator`, `productCard(name: string): Locator`, `addToCartButton(name: string): Locator`, `getCartCount(): Promise<number>`.

- [ ] **Step 1: Create `tests/pages/products.page.ts`**

```ts
import { type Page, type Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly itemCount: Locator;
  readonly cartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Products' });
    this.itemCount = page.getByText(/^\d+ items$/);
    this.cartButton = page.getByRole('button', { name: /^Cart(\s\d+)?$/ });
  }

  productCard(name: string): Locator {
    return this.page.getByRole('listitem').filter({ has: this.page.getByRole('heading', { name }) });
  }

  addToCartButton(name: string): Locator {
    return this.productCard(name).getByRole('button', { name: 'Add to Cart' });
  }

  async getCartCount(): Promise<number> {
    const accessibleName = await this.cartButton.innerText();
    const match = accessibleName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
```

- [ ] **Step 2: Read the "2. Products" section of `specs/spec.md`**

Open `specs/spec.md` and locate scenarios 2.1–2.2 under "### 2. Products" — this is the scenario source for the steps below (no file is created in this step).

- [ ] **Step 3: Generate and write `should-list-all-products.spec.ts`**

Run in background: `PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed-authenticated.spec.ts --debug=cli`, `playwright-cli attach tw-XXXX`, `playwright-cli resume`, `playwright-cli snapshot` to confirm the 6 product headings are present, then close the session.

```ts
// spec: specs/spec.md (Section 2: Products)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';

test('should list all products', async ({ page }) => {
  const productsPage = new ProductsPage(page);

  // 1. Load the Products page
  await expect(productsPage.itemCount).toHaveText('6 items');
  await expect(productsPage.productCard('Codemify Backpack')).toBeVisible();
  await expect(productsPage.productCard('Codemify Bike Light')).toBeVisible();
  await expect(productsPage.productCard('Codemify Bolt T-Shirt')).toBeVisible();
  await expect(productsPage.productCard('Codemify Fleece Jacket')).toBeVisible();
  await expect(productsPage.productCard('Codemify Onesie')).toBeVisible();
  await expect(productsPage.productCard('Test.allTheThings() T-Shirt (Red)')).toBeVisible();
});
```

- [ ] **Step 4: Run it**

Run: `npx playwright test tests/products/should-list-all-products.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 5: Write `should-update-cart-badge-on-add.spec.ts`**

```ts
// spec: specs/spec.md (Section 2: Products)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';

test('should update cart badge on add', async ({ page }) => {
  const productsPage = new ProductsPage(page);

  // 1. Click "Add to Cart" on "Codemify Backpack"
  await productsPage.addToCartButton('Codemify Backpack').click();
  expect(await productsPage.getCartCount()).toBe(1);

  // 2. Click "Add to Cart" on "Codemify Bike Light"
  await productsPage.addToCartButton('Codemify Bike Light').click();
  expect(await productsPage.getCartCount()).toBe(2);
});
```

- [ ] **Step 6: Run it**

Run: `npx playwright test tests/products/should-update-cart-badge-on-add.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 7: Run the whole products group together**

Run: `npx playwright test tests/products/ --project=chromium`
Expected: `2 passed`

- [ ] **Step 8: Commit**

```bash
git add tests/pages/products.page.ts tests/products/
git commit -m "test: add products page object and product listing scenarios"
```

---

### Task 3: Cart Page Object + Cart Scenarios (3.1–3.7)

**Files:**
- Create: `tests/pages/cart.page.ts`
- Create: `tests/cart/should-add-single-item.spec.ts`
- Create: `tests/cart/should-sum-multiple-items.spec.ts`
- Create: `tests/cart/should-increment-quantity.spec.ts`
- Create: `tests/cart/should-decrement-quantity.spec.ts`
- Create: `tests/cart/should-auto-remove-at-zero-quantity.spec.ts`
- Create: `tests/cart/should-remove-item-directly.spec.ts`
- Create: `tests/cart/should-show-empty-cart-state.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `tests/fixtures-authenticated.ts` (Task 0), `ProductsPage` from Task 2 (to add items before opening the cart).
- Produces: `CartPage` class — `constructor(page: Page)`, `heading: Locator`, `emptyMessage: Locator`, `totalAmount: Locator`, `checkoutButton: Locator`, `continueShoppingButton: Locator`, `lineItem(name): Locator`, `lineItemSubtotalText(name): Locator`, `incrementButton(name): Locator`, `decrementButton(name): Locator`, `removeButton(name): Locator`.

- [ ] **Step 1: Create `tests/pages/cart.page.ts`**

```ts
import { type Page, type Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emptyMessage: Locator;
  readonly totalAmount: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Your Shopping Cart' });
    this.emptyMessage = page.getByText('Your cart is empty');
    this.totalAmount = page.getByText(/^\$\d+\.\d{2}$/).last();
    this.checkoutButton = page.getByRole('button', { name: 'Proceed to Checkout' });
    this.continueShoppingButton = page.getByRole('button', { name: 'Continue Shopping' });
  }

  lineItem(name: string): Locator {
    return this.page.getByRole('listitem').filter({ has: this.page.getByRole('heading', { name }) });
  }

  lineItemSubtotalText(name: string): Locator {
    return this.lineItem(name).getByText(/^\$\d+\.\d{2} × \d+ = \$\d+\.\d{2}$/);
  }

  incrementButton(name: string): Locator {
    return this.lineItem(name).getByRole('button', { name: '+' });
  }

  decrementButton(name: string): Locator {
    return this.lineItem(name).getByRole('button', { name: '−' });
  }

  removeButton(name: string): Locator {
    return this.lineItem(name).getByRole('button', { name: 'Remove' });
  }
}
```

- [ ] **Step 2: Read the "3. Cart" section of `specs/spec.md`**

Open `specs/spec.md` and locate scenarios 3.1–3.7 under "### 3. Cart" — this is the scenario source for the steps below (no file is created in this step).

- [ ] **Step 3: Generate and write `should-add-single-item.spec.ts`**

Run in background: `PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed-authenticated.spec.ts --debug=cli`, `playwright-cli attach tw-XXXX`, `playwright-cli resume`, add the backpack, click the cart nav button, `playwright-cli snapshot` to confirm the line item text and total, close the session.

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should add single item', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" to cart from Products, open the cart
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();

  await expect(cartPage.lineItemSubtotalText('Codemify Backpack')).toHaveText('$29.99 × 1 = $29.99');
  await expect(cartPage.totalAmount).toHaveText('$29.99');
});
```

- [ ] **Step 4: Run it**

Run: `npx playwright test tests/cart/should-add-single-item.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 5: Write `should-sum-multiple-items.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should sum multiple items', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" ($29.99) and "Codemify Bike Light" ($9.99) to cart, open the cart
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.addToCartButton('Codemify Bike Light').click();
  await productsPage.cartButton.click();

  await expect(cartPage.totalAmount).toHaveText('$39.98');
});
```

- [ ] **Step 6: Run it**

Run: `npx playwright test tests/cart/should-sum-multiple-items.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 7: Write `should-increment-quantity.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should increment quantity', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" to cart, open the cart, click "+" on its line
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.incrementButton('Codemify Backpack').click();

  await expect(cartPage.lineItemSubtotalText('Codemify Backpack')).toHaveText('$29.99 × 2 = $59.98');
  await expect(cartPage.totalAmount).toHaveText('$59.98');
});
```

- [ ] **Step 8: Run it**

Run: `npx playwright test tests/cart/should-increment-quantity.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 9: Write `should-decrement-quantity.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should decrement quantity', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" to cart twice, open the cart, click "−" on its line once
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.decrementButton('Codemify Backpack').click();

  await expect(cartPage.lineItemSubtotalText('Codemify Backpack')).toHaveText('$29.99 × 1 = $29.99');
  await expect(cartPage.totalAmount).toHaveText('$29.99');
});
```

- [ ] **Step 10: Run it**

Run: `npx playwright test tests/cart/should-decrement-quantity.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 11: Write `should-auto-remove-at-zero-quantity.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should auto remove at zero quantity', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" to cart, open the cart, click "−" on its line once
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.decrementButton('Codemify Backpack').click();

  await expect(cartPage.lineItem('Codemify Backpack')).not.toBeVisible();
  await expect(cartPage.emptyMessage).toBeVisible();
});
```

- [ ] **Step 12: Run it**

Run: `npx playwright test tests/cart/should-auto-remove-at-zero-quantity.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 13: Write `should-remove-item-directly.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should remove item directly', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Add "Codemify Backpack" and "Codemify Bike Light" to cart, open the cart, click "Remove" on "Codemify Backpack"
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.addToCartButton('Codemify Bike Light').click();
  await productsPage.cartButton.click();
  await cartPage.removeButton('Codemify Backpack').click();

  await expect(cartPage.lineItem('Codemify Backpack')).not.toBeVisible();
  await expect(cartPage.lineItem('Codemify Bike Light')).toBeVisible();
});
```

- [ ] **Step 14: Run it**

Run: `npx playwright test tests/cart/should-remove-item-directly.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 15: Write `should-show-empty-cart-state.spec.ts`**

```ts
// spec: specs/spec.md (Section 3: Cart)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';

test('should show empty cart state', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);

  // 1. Open the cart without adding any items
  await productsPage.cartButton.click();

  await expect(cartPage.emptyMessage).toBeVisible();
  await expect(cartPage.checkoutButton).not.toBeVisible();
});
```

- [ ] **Step 16: Run it**

Run: `npx playwright test tests/cart/should-show-empty-cart-state.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 17: Run the whole cart group together**

Run: `npx playwright test tests/cart/ --project=chromium`
Expected: `7 passed`

- [ ] **Step 18: Commit**

```bash
git add tests/pages/cart.page.ts tests/cart/
git commit -m "test: add cart page object and cart management scenarios"
```

---

### Task 4: Checkout Page Object + Checkout Scenarios (4.1–4.4)

**Files:**
- Create: `tests/checkout-data.ts`
- Create: `tests/pages/checkout.page.ts`
- Create: `tests/checkout/should-block-empty-submission.spec.ts`
- Create: `tests/checkout/should-place-order-successfully.spec.ts`
- Create: `tests/checkout/should-clear-cart-after-order.spec.ts`
- Create: `tests/checkout/should-cancel-checkout.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `tests/fixtures-authenticated.ts` (Task 0), `ProductsPage` from Task 2, `CartPage` from Task 3.
- Produces: `CheckoutPage` class — `constructor(page: Page)`, `firstNameInput`, `lastNameInput`, `emailInput`, `addressInput`, `cityInput`, `stateInput`, `zipInput`, `cardNumberInput`, `expiryInput`, `cvvInput`: all `Locator`; `cancelButton: Locator`, `completeOrderButton: Locator`, `confirmationHeading: Locator`, `orderTotalText: Locator`, `fillShippingAndPayment(data: CheckoutData): Promise<void>`. `CHECKOUT_DATA: CheckoutData` constant from `tests/checkout-data.ts`.

- [ ] **Step 1: Create `tests/checkout-data.ts`**

```ts
export interface CheckoutData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export const CHECKOUT_DATA: CheckoutData = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip: '62704',
  cardNumber: '4111111111111111',
  expiry: '12/28',
  cvv: '123',
};
```

- [ ] **Step 2: Create `tests/pages/checkout.page.ts`**

```ts
import { type Page, type Locator } from '@playwright/test';
import { type CheckoutData } from '../checkout-data';

export class CheckoutPage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipInput: Locator;
  readonly cardNumberInput: Locator;
  readonly expiryInput: Locator;
  readonly cvvInput: Locator;
  readonly cancelButton: Locator;
  readonly completeOrderButton: Locator;
  readonly confirmationHeading: Locator;
  readonly orderTotalText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name *' });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name *' });
    this.emailInput = page.getByRole('textbox', { name: 'Email *' });
    this.addressInput = page.getByRole('textbox', { name: 'Address *' });
    this.cityInput = page.getByRole('textbox', { name: 'City *' });
    this.stateInput = page.getByRole('textbox', { name: 'State *' });
    this.zipInput = page.getByRole('textbox', { name: 'Zip Code *' });
    this.cardNumberInput = page.getByRole('textbox', { name: 'Card Number *' });
    this.expiryInput = page.getByRole('textbox', { name: 'Expiry Date *' });
    this.cvvInput = page.getByRole('textbox', { name: 'CVV *' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.completeOrderButton = page.getByRole('button', { name: 'Complete Order' });
    this.confirmationHeading = page.getByRole('heading', { name: 'Order Placed Successfully!' });
    this.orderTotalText = page.getByText(/^Order Total:/);
  }

  async fillShippingAndPayment(data: CheckoutData) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.emailInput.fill(data.email);
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);
    await this.stateInput.fill(data.state);
    await this.zipInput.fill(data.zip);
    await this.cardNumberInput.fill(data.cardNumber);
    await this.expiryInput.fill(data.expiry);
    await this.cvvInput.fill(data.cvv);
  }
}
```

- [ ] **Step 3: Read the "4. Checkout" section of `specs/spec.md`**

Open `specs/spec.md` and locate scenarios 4.1–4.4 under "### 4. Checkout" — this is the scenario source for the steps below (no file is created in this step).

- [ ] **Step 4: Generate and write `should-block-empty-submission.spec.ts`**

Run in background: `PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed-authenticated.spec.ts --debug=cli`, `playwright-cli attach tw-XXXX`, `playwright-cli resume`, add the backpack, go to checkout, click "Complete Order" empty, `playwright-cli snapshot` to confirm the First Name field is focused/invalid and no confirmation heading appears, close the session.

```ts
// spec: specs/spec.md (Section 4: Checkout)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';

test('should block empty submission', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // 1. Add "Codemify Backpack" to cart, proceed to checkout, click "Complete Order" without filling any field
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.checkoutButton.click();
  await checkoutPage.completeOrderButton.click();

  await expect(checkoutPage.firstNameInput).toBeFocused();
  await expect(checkoutPage.confirmationHeading).not.toBeVisible();
});
```

- [ ] **Step 5: Run it**

Run: `npx playwright test tests/checkout/should-block-empty-submission.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 6: Write `should-place-order-successfully.spec.ts`**

```ts
// spec: specs/spec.md (Section 4: Checkout)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { CHECKOUT_DATA } from '../checkout-data';

test('should place order successfully', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // 1. Add "Codemify Backpack" to cart, proceed to checkout, fill all shipping and payment fields, click "Complete Order"
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.checkoutButton.click();
  await checkoutPage.fillShippingAndPayment(CHECKOUT_DATA);
  await checkoutPage.completeOrderButton.click();

  await expect(checkoutPage.confirmationHeading).toBeVisible();
  await expect(checkoutPage.orderTotalText).toContainText('$29.99');
});
```

- [ ] **Step 7: Run it**

Run: `npx playwright test tests/checkout/should-place-order-successfully.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 8: Write `should-clear-cart-after-order.spec.ts`**

```ts
// spec: specs/spec.md (Section 4: Checkout)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';
import { CHECKOUT_DATA } from '../checkout-data';

test('should clear cart after order', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // 1. Add "Codemify Backpack" to cart, complete checkout, click "Continue Shopping", open the cart again
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.checkoutButton.click();
  await checkoutPage.fillShippingAndPayment(CHECKOUT_DATA);
  await checkoutPage.completeOrderButton.click();
  await page.getByRole('button', { name: 'Continue Shopping' }).click();
  await productsPage.cartButton.click();

  await expect(cartPage.emptyMessage).toBeVisible();
});
```

- [ ] **Step 9: Run it**

Run: `npx playwright test tests/checkout/should-clear-cart-after-order.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 10: Write `should-cancel-checkout.spec.ts`**

```ts
// spec: specs/spec.md (Section 4: Checkout)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';
import { CartPage } from '../pages/cart.page';
import { CheckoutPage } from '../pages/checkout.page';

test('should cancel checkout', async ({ page }) => {
  const productsPage = new ProductsPage(page);
  const cartPage = new CartPage(page);
  const checkoutPage = new CheckoutPage(page);

  // 1. Add "Codemify Backpack" to cart, proceed to checkout, click "Cancel"
  await productsPage.addToCartButton('Codemify Backpack').click();
  await productsPage.cartButton.click();
  await cartPage.checkoutButton.click();
  await checkoutPage.cancelButton.click();

  await expect(cartPage.heading).toBeVisible();
  await expect(cartPage.lineItem('Codemify Backpack')).toBeVisible();
});
```

- [ ] **Step 11: Run it**

Run: `npx playwright test tests/checkout/should-cancel-checkout.spec.ts --project=chromium`
Expected: `1 passed`

- [ ] **Step 12: Run the whole checkout group together**

Run: `npx playwright test tests/checkout/ --project=chromium`
Expected: `4 passed`

- [ ] **Step 13: Commit**

```bash
git add tests/checkout-data.ts tests/pages/checkout.page.ts tests/checkout/
git commit -m "test: add checkout page object and checkout flow scenarios"
```

---

### Task 5: Full Suite Verification

**Files:**
- None created or modified — verification only.

**Interfaces:**
- Consumes: everything from Tasks 0–4.

- [ ] **Step 1: Run the entire suite on Chromium**

Run: `npx playwright test --project=chromium`
Expected: `17 passed` (4 login + 2 products + 7 cart + 4 checkout)

- [ ] **Step 2: Run the entire suite across all configured browsers**

Run: `npx playwright test`
Expected: `51 passed` (17 scenarios × 3 projects: chromium, firefox, webkit)

- [ ] **Step 3: If any test is flaky or fails on a specific browser**

Apply the `playwright-cli` skill's heal workflow (`docs` reference: `.claude/skills/playwright-cli/references/spec-driven-testing.md`, Section 3): run the single failing test with `--debug=cli`, attach, diagnose via snapshot/console/requests, fix the locator or assertion, rerun until green. Do not add sleeps or use `networkidle` to paper over timing issues.

- [ ] **Step 4: Final commit (if Step 3 required any fixes)**

```bash
git add tests/
git commit -m "test: fix cross-browser flakiness in E2E suite"
```

(Skip this step if Steps 1–2 passed clean with no changes.)
