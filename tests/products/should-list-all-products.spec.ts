// spec: specs/spec.md (Section 2: Products)
// seed: tests/seed-authenticated.spec.ts
import { test, expect } from '../fixtures-authenticated';
import { ProductsPage } from '../pages/products.page';

test('should list all products', async ({ page }) => {
  const productsPage = new ProductsPage(page);

  // 1. Load the Products page
  await expect(productsPage.itemCount).toBeVisible();
  await expect(productsPage.productHeading('Codemify Backpack')).toBeVisible();
  await expect(productsPage.productHeading('Codemify Bike Light')).toBeVisible();
  await expect(productsPage.productHeading('Codemify Bolt T-Shirt')).toBeVisible();
  await expect(productsPage.productHeading('Codemify Fleece Jacket')).toBeVisible();
  await expect(productsPage.productHeading('Codemify Onesie')).toBeVisible();
  await expect(productsPage.productHeading('Test.allTheThings() T-Shirt (Red)')).toBeVisible();
});
