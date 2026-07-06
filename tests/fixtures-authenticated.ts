import { test as baseTest } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  storageState: '.playwright/.auth/user.json',
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});
