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
