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
