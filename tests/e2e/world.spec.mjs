import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?fallback=1&seed=42042');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#eventToast')).toHaveClass(/show/);
  await expect(page.locator('#eventTitle')).toHaveText('A new world wakes');
});

test('shows progression, autonomous activity, and world statistics', async ({ page }) => {
  await expect(page.locator('#objectiveLabel')).toHaveText('First Roots');
  await expect(page.locator('#population')).toHaveText('18');
  await expect(page.locator('#activity')).not.toBeEmpty();
  await expect(page.locator('#water')).toHaveText(/%$/);
});

test('uses powers and records the result in the chronicle', async ({ page }) => {
  const grow = page.getByRole('button', { name: /Grow/i });
  await grow.click();
  await expect(grow).toHaveClass(/active/);

  const forestBefore = await page.evaluate(() => window.__smallThings.simulation.forest);
  await page.evaluate(() => window.__smallThings.applyPower('forest', 640, 400));
  await expect.poll(() => page.evaluate(() => window.__smallThings.simulation.forest)).toBeGreaterThan(forestBefore + 8);
  await expect(page.locator('#eventTitle')).toHaveText('A grove takes root');

  await page.getByRole('button', { name: /Open world chronicle/i }).click();
  await expect(page.locator('#chronicleDialog')).toBeVisible();
  await expect(page.locator('#chronicleList')).toContainText('A grove takes root');
});

test('saves locally and creates a shareable world URL', async ({ page }) => {
  await page.getByRole('button', { name: /Save world/i }).click();
  const saved = await page.evaluate(() => localStorage.getItem('god-of-small-things.world.v2'));
  expect(saved).toBeTruthy();

  await page.getByRole('button', { name: /Copy a shareable world link/i }).click();
  await expect(page).toHaveURL(/#world=/);
  const state = await page.evaluate(() => window.__smallThings.decodeWorld(location.hash.slice(7)));
  expect(state.seed).toBe(42042);
  expect(state.version).toBe(2);
});

test('keyboard controls pause and resume time', async ({ page }) => {
  await page.keyboard.press('Space');
  await expect(page.locator('.time-controls button[data-speed="0"]')).toHaveClass(/active/);
  await page.keyboard.press('Space');
  await expect(page.locator('.time-controls button[data-speed="1"]')).toHaveClass(/active/);
});

test('mobile layout keeps touch controls and information accessible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Phone-only responsive coverage');

  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const actionButtons = page.locator('.top-actions .icon-button');
  await expect(actionButtons).toHaveCount(7);
  for (let index = 0; index < 7; index += 1) await expect(actionButtons.nth(index)).toBeVisible();

  const statsPanel = page.locator('#statsPanel');
  await expect(statsPanel).toHaveClass(/collapsed/);
  await page.getByRole('button', { name: /Expand world pulse/i }).tap();
  await expect(statsPanel).not.toHaveClass(/collapsed/);
  await expect(page.locator('#population')).toBeVisible();

  const grow = page.getByRole('button', { name: /Grow forest/i });
  await grow.tap();
  await expect(grow).toHaveClass(/active/);
  const forestBefore = await page.evaluate(() => window.__smallThings.simulation.forest);
  await page.locator('#fallback').tap({ position: { x: Math.floor(viewport.width / 2), y: Math.floor(viewport.height * 0.52) } });
  await expect.poll(() => page.evaluate(() => window.__smallThings.simulation.forest)).toBeGreaterThan(forestBefore + 8);
  await expect(page.locator('#eventTitle')).toHaveText('A grove takes root');

  await page.getByRole('button', { name: /Pause time/i }).tap();
  await expect(page.locator('.time-controls button[data-speed="0"]')).toHaveClass(/active/);

  for (const selector of ['.topbar', '.powers', '.time-controls']) {
    const box = await page.locator(selector).boundingBox();
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
});
