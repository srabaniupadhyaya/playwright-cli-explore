import { type Page, type Locator } from '@playwright/test';

export class ProductsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly itemCount: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Products' });
    this.itemCount = page.getByText('6 items', { exact: true });
  }

  productHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, exact: true });
  }
}
