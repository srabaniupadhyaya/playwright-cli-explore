import { chromium, type FullConfig } from '@playwright/test';
import config from '../config/config.json';
import { AUTH_FILE } from './auth';

export default async function globalSetup(fullConfig: FullConfig) {
  const project = fullConfig.projects[0];
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: project.use.baseURL });

  await page.goto('');
  await page.getByRole('textbox', { name: 'Username' }).fill(config.credentials.username);
  await page.getByRole('textbox', { name: 'Password' }).fill(config.credentials.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('heading', { name: 'Products' }).waitFor();

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
