import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?fallback=1&seed=42042');
  await expect(page.locator('#loading')).toHaveClass(/hidden/);
});

test('shows progression, autonomous activity, and world statistics', async ({ page }) => {
  await expect(page.locator('#objectiveLabel')).toHaveText('First Roots');
  await expect(page.locator('#population')).toHaveText('18');
  await expect(page.locator('#activity')).not.toBeEmpty();
  await expect(page.locator('#water')).toHaveText(/%$/);
});

test('uses powers and records the result in the chronicle', async ({ page }) => {
  await page.getByRole('button', { name: /Grow/i }).click();
  await page.locator('#fallback').click({ position: { x: 500, y: 350 } });
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
