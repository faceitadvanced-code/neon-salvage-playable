import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 700 },
  recordVideo: { dir: 'artifacts/video-tmp', size: { width: 390, height: 700 } },
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.getByRole('button', { name: /start salvage/i }).click();
await page.waitForTimeout(800);

const canvas = page.locator('canvas');
const box = await canvas.boundingBox();
if (!box) throw new Error('canvas missing');
for (const fraction of [.22, .78, .38, .67, .5]) {
  await page.mouse.move(box.x + box.width * fraction, box.y + box.height * .86, { steps: 18 });
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}
await page.waitForTimeout(850);
await page.evaluate(() => window.__playableDebug.forceWin());
await page.waitForTimeout(1900);
const video = page.video();
await context.close();
if (!video) throw new Error('video recording unavailable');
await video.saveAs('artifacts/neon-salvage-demo.webm');
await browser.close();
