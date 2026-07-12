import { test as baseTest } from '@playwright/test';
import { AUTH_FILE } from './auth';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  storageState: AUTH_FILE,
  page: async ({ page }, use) => {
    await page.goto('');
    await use(page);
  },
});
