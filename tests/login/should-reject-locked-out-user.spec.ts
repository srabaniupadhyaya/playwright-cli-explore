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
