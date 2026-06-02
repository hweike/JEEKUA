// lib/crawler/core/utils.ts
import fs from 'fs/promises';
import path from 'path';
import { Page } from 'playwright';
import { TASKS_DIR } from '../types';

export async function saveDebugScreenshot(page: Page, taskId: string, prefix: string = 'error') {
  try {
    const taskDir = path.join(TASKS_DIR, taskId);
    await fs.mkdir(taskDir, { recursive: true });
    const timestamp = Date.now();
    const screenshotPath = path.join(taskDir, `${prefix}_${timestamp}.png`);
    const htmlPath = path.join(taskDir, `${prefix}_${timestamp}.html`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content();
    await fs.writeFile(htmlPath, html);
    console.log(`📁 Saved debug files: ${screenshotPath}, ${htmlPath}`);
  } catch (err) {
    console.error('Failed to save debug info:', err);
  }
}

export async function waitWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`尝试 ${i+1}/${maxRetries+1} 失败:`, err);
      if (i < maxRetries) await new Promise(r => setTimeout(r, delayMs * (i+1)));
    }
  }
  throw lastError;
}