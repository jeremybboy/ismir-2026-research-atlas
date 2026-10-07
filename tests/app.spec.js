import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('map, search, topic, selection, and URL state stay synchronized', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'ISMIR 2026 Paper Explorer' })).toBeVisible();
  await expect(page.locator('.paper-point')).toHaveCount(140);
  await page.getByLabel('Search papers').fill('OudTabs');
  await expect(page.locator('.paper-point')).toHaveCount(1);
  await expect(page.locator('#paper-list').getByRole('button', { name: /OudTabs/ })).toBeVisible();
  await page.getByLabel('Search papers').fill('');
  await page.getByRole('button', { name: /Evaluation & culture/ }).click();
  const topicCount = await page.locator('.paper-point').count();
  expect(topicCount).toBeGreaterThan(0);
  expect(topicCount).toBeLessThan(140);
  await page.locator('.paper-point').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#.*paper=/);
  await expect(page.locator('#detail-title')).not.toBeEmpty();
});

test('map caption previews a point then returns to the selected paper', async ({ page }) => {
  const points = page.locator('.paper-point');
  const selectedPoint = points.nth(1);
  await selectedPoint.click();
  const selectedTitle = await page.locator('#detail-title').textContent();
  await expect(page.locator('#map-title-preview')).toHaveText(selectedTitle);

  const previewPoint = points.nth(2);
  const previewTitle = (await previewPoint.getAttribute('aria-label')).replace('Select paper: ', '');
  await previewPoint.hover();
  await expect(page.locator('#map-title-preview')).toHaveText(previewTitle);
  await page.locator('#map-heading').hover();
  await expect(page.locator('#map-title-preview')).toHaveText(selectedTitle);

  await previewPoint.focus();
  await expect(page.locator('#map-title-preview')).toHaveText(previewTitle);
  await page.getByLabel('Search papers').focus();
  await expect(page.locator('#map-title-preview')).toHaveText(selectedTitle);
});

test('curated trails expose navigation and play controls', async ({ page }) => {
  await page.getByLabel('Guided research trail', { exact: true }).selectOption('build-an-ai-band');
  await expect(page.locator('#trail-premise')).toContainText('Curated exploration path');
  const firstTitle = await page.locator('#detail-title').textContent();
  await page.getByRole('button', { name: 'Next paper in trail' }).click();
  await expect(page.locator('#detail-title')).not.toHaveText(firstTitle);
  await page.getByRole('button', { name: 'Play trail' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
});

test('reading queue persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: /Add to reading queue/ }).click();
  await expect(page.locator('#queue-list li')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: /Remove from reading queue/ })).toBeVisible();
  await expect(page.locator('#queue-list li')).toHaveCount(1);
});

test('responsive page has no horizontal overflow and no major accessibility violations', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
