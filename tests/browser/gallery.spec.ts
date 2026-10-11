import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/gallery/manifest.json', (route) => route.fulfill({ json: { photos: [] } }));
});

test('empty gallery, all category filters, URL, reload and browser history', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Every photograph tells a story.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('footer')).toBeVisible();
  await expect(page.locator('footer')).toBeEmpty();
  const navigation = page.getByRole('navigation');
  for (const [id, label] of [
    ['portraits-people', 'Portraits & people'], ['nature', 'Nature'], ['travel', 'Travel'],
    ['street-everyday', 'Street & everyday'], ['events', 'Events'], ['automotive', 'Automotive'], ['on-film', 'On film'],
  ]) {
    await navigation.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`category=${id}$`));
    await expect(page.locator('main')).toHaveAttribute('aria-label', `${label} photographs`);
    await expect(navigation.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  }
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'On film photographs');
  await page.goBack();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'Automotive photographs');
  await page.goForward();
  await expect(page.locator('main')).toHaveAttribute('aria-label', 'On film photographs');
  await navigation.getByRole('link', { name: 'All photographs', exact: true }).click();
  await expect(page).not.toHaveURL(/category=/);
  await page.goto('./?category=unknown');
  await expect(navigation.getByRole('link', { name: 'All photographs', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('system theme and persistent manual selection', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const activeTab = page.getByRole('navigation').getByRole('link', { name: 'All photographs', exact: true });
  await expect(activeTab).toHaveCSS('background-color', 'rgb(178, 201, 168)');
  await page.screenshot({ path: test.info().outputPath('light-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(activeTab).toHaveCSS('background-color', 'rgb(201, 181, 223)');
  await page.screenshot({ path: test.info().outputPath('dark-desktop.png'), fullPage: true });
});

test('mobile navigation fits without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'On film', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('light-mobile.png'), fullPage: true });
});

test('gallery load error is recoverable', async ({ page }) => {
  await page.route('**/gallery/manifest.json', (route) => route.fulfill({ status: 500 }));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('The gallery could not be loaded.');
  await page.unroute('**/gallery/manifest.json');
  await page.route('**/gallery/manifest.json', (route) => route.fulfill({ json: { photos: [] } }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Every photograph tells a story.' })).toBeVisible();
});

test('masonry, filtered dialog navigation, focus return and Escape', async ({ page }) => {
  // Synthetic images exist only in network interception, never in the portfolio.
  await page.route('**/gallery/manifest.json', (route) => route.fulfill({ json: { photos: [
    { id: '1', categoryIds: ['portraits-people'], alt: 'First portrait', width: 400, height: 600,
      variants: [{ src: 'gallery/test.webp', width: 400, height: 600 }] },
    { id: '2', categoryIds: ['portraits-people'], alt: 'Second portrait', width: 600, height: 400,
      variants: [{ src: 'gallery/test.webp', width: 600, height: 400 }] },
    { id: '3', categoryIds: ['nature'], alt: 'Nature', width: 600, height: 400,
      variants: [{ src: 'gallery/test.webp', width: 600, height: 400 }] },
  ] } }));
  await page.route('**/gallery/test.webp', (route) => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#8c9f81"/></svg>' }));
  await page.goto('./?category=portraits-people');
  await expect(page.getByRole('button', { name: /Open photograph:/ })).toHaveCount(2);
  const navigation = page.getByRole('navigation');
  await expect(navigation.getByRole('link', { name: 'All photographs', exact: true })).toHaveText('All photographs');
  await expect(navigation.getByRole('link', { name: 'Portraits & people', exact: true })).toHaveText('Portraits & people');
  await expect(navigation.getByRole('link', { name: 'Nature', exact: true })).toHaveText('Nature');
  for (const [width, columns] of [[375, '1'], [800, '2'], [1200, '3'], [1600, '4']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByLabel('Photo gallery')).toHaveCSS('column-count', columns);
  }
  const trigger = page.getByRole('button', { name: 'Open photograph: First portrait' });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close photograph' })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath('dialog-desktop.png') });
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Next photograph' })).toBeFocused();
  await expect(dialog.getByRole('button', { name: 'Previous photograph' })).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('img')).toHaveAttribute('alt', 'Second portrait');
  await expect(dialog.getByRole('button', { name: 'Next photograph' })).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('img')).toHaveAttribute('alt', 'First portrait');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Close photograph' }).click();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 375, height: 812 });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('dialog-mobile.png') });
  await dialog.click({ position: { x: 10, y: 100 } });
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
