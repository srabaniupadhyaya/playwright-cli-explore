# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A Playwright E2E test suite for the "Codemify Store" demo app
(`https://codemify-demo-app.vercel.app/demo-app`), built using the
`@playwright/cli` (`playwright-cli`) tool for live browser exploration and
locator verification. See **Docs directories** below for where its skill
docs and this repo's testing conventions live.

## Commands

```bash
# Run the whole suite (all 3 browsers: chromium, firefox, webkit)
npx playwright test

# Run against a single browser
npx playwright test --project=chromium

# Run a single spec file
npx playwright test tests/login/should-login-with-valid-user.spec.ts --project=chromium

# Run a single test by line number
npx playwright test tests/login/should-login-with-valid-user.spec.ts:6 --project=chromium

# Open the HTML report from the last run
npx playwright show-report

# Debug a test interactively with playwright-cli (requires an interactive terminal)
PLAYWRIGHT_HTML_OPEN=never npx playwright test <file> --debug=cli
npx playwright-cli attach tw-XXXX
```

Before running tests for the first time, copy the example config (it holds
public demo credentials, not real secrets, but the file itself is gitignored):

```bash
cp config/config.example.json config/config.json
```

## Architecture

**Config flow:** `config/config.json` (gitignored; `config/config.example.json`
is the committed template) is imported directly by `playwright.config.ts`,
which builds `baseURL` as `${config.baseUrl}${config.demoAppPath}` and reads
`timeouts`/`headless` from it. Any change to the app's URL or timeouts goes
through this file, not hardcoded into test files.

**Two fixture tracks, because the app requires login:**
- `tests/fixtures.ts` — unauthenticated `test`/`expect`. Navigates to `/` and
  lands on the login screen. Used only by `tests/login/*` (scenarios that
  test the login form itself).
- `tests/fixtures-authenticated.ts` — authenticated `test`/`expect`. Applies
  the `storageState` saved by `tests/global-setup.ts` (which logs in once as
  `standard_user` and writes `.playwright/.auth/user.json`), then navigates to
  `/`, landing directly on the Products screen. Used by every other scenario
  group (`tests/products/*`, `tests/cart/*`, `tests/checkout/*`).
- `tests/seed.spec.ts` / `tests/seed-authenticated.spec.ts` are minimal seed
  tests (empty bodies) that exist as attach points for `playwright-cli`'s
  `--debug=cli` / `attach` generation workflow — not tests with real
  assertions themselves.

All new scenario spec files must import `test`/`expect` from one of these two
fixture files, never directly from `@playwright/test`.

**Page Object Model**, one class per screen, in `tests/pages/`:
`LoginPage`, `ProductsPage`, `CartPage`, `CheckoutPage`. Test files are thin —
they compose POM methods/locators and assert; they don't hold raw
`page.getByRole(...)` locators for elements the POM already exposes.

**Scenario source of truth:** `specs/spec.md` is the single spec-driven-testing
plan (per the `playwright-cli` skill's plan → generate → heal format) listing
every scenario across Login, Products, Cart, and Checkout, each with numbered
steps and `expect:` outcomes. Every `.spec.ts` file's leading `// spec:` /
`// seed:` comments point back to the relevant section of this file and to
its seed file — keep them in sync if a scenario's behavior changes.

**Docs directories:**
- `.claude/skills/playwright-cli/` — the `playwright-cli` tool's own skill docs
  (installed via `npx playwright-cli install --skills`), covering its
  commands and live-exploration workflows. Read before writing or debugging
  tests with that tool.
- `docs/playwright-best-practices.md` — this repo's testing conventions:
  locator priority, the no-hard-waits rule, `waitForResponse` usage, and Page
  Object conventions. Read before writing or reviewing any spec, page
  object, or fixture.
- `docs/superpowers/specs/` — design docs (produced by the `brainstorming` skill).
- `docs/superpowers/plans/` — implementation plans (produced by the
  `writing-plans` skill), broken into bite-sized, checkbox-tracked tasks.

## Notable app behavior worth remembering when writing tests

- The cart nav button's accessible name is `"Cart"` when empty and
  `"Cart N"` when it holds N total items — there's no `"Cart 0"` state.
- Cart line items use the Unicode minus sign **−** (U+2212) for the decrement
  button, not an ASCII hyphen; line totals use **×** (U+00D7) for
  multiplication. Match these exact characters in locators/assertions.
- Decrementing a cart line's quantity to 0 auto-removes it (no explicit
  "Remove" click needed).
- Checkout's required fields use native HTML5 validation, not custom error
  text — assert via focus/`:invalid`, not `toBeVisible()` on error text.
- A successful checkout clears the cart on return to Products.
