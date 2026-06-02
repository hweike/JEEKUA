// lib/crawler/core/browser.ts
import { chromium, Browser, Page } from 'playwright';

export async function launchBrowser(): Promise<Browser> {
  return await chromium.launch({ headless: true });
}

export async function createPage(browser: Browser, timeout: number): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  // 拦截图片、CSS、字体等非关键资源
  await page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,ttf}', route => route.abort());
  return page;
}

export async function closeBrowser(browser: Browser | null) {
  if (browser) await browser.close();
}