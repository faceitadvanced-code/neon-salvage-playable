import { test, expect } from '@playwright/test';

test('playable supports start, touch movement, win, CTA and restart', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Neon Salvage — AI Playable');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByLabel('Game status')).toBeHidden();
  await expect(page.getByRole('button', { name: /start salvage/i })).toBeVisible();
  await page.screenshot({ path: 'artifacts/start-screen.png' });

  await page.getByRole('button', { name: /start salvage/i }).click();
  await expect.poll(() => page.evaluate(() => window.__playableDebug.phase())).toBe('playing');

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.85);
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__playableDebug.playerX())).toBeGreaterThan(250);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'artifacts/gameplay.png' });

  await page.evaluate(() => window.__playableDebug.forceWin());
  await expect(page.getByText('CORE SECURED')).toBeVisible();
  await expect(page.getByRole('button', { name: /play full game/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /replay/i })).toBeVisible();
  await page.screenshot({ path: 'artifacts/win-screen.png' });

  await page.getByRole('button', { name: /replay/i }).click();
  await expect.poll(() => page.evaluate(() => window.__playableDebug.phase())).toBe('playing');

  expect(errors).toEqual([]);
});

test('playable renders a loss state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start salvage/i }).click();
  await page.evaluate(() => window.__playableDebug.forceLose());

  await expect(page.getByText('SIGNAL LOST')).toBeVisible();
  await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
});
