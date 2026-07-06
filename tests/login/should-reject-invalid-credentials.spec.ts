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
