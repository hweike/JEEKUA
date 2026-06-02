// lib/crawler/strategies/single-product.ts
import { Page } from 'playwright';
import { CrawlerRule } from '../types';
import { waitWithRetry } from '../core/utils';

export async function crawlSingleProducts(
  page: Page,
  rule: CrawlerRule,
  taskId: string,
  addProduct: (taskId: string, product: any) => Promise<void>
): Promise<void> {
  const { productUrls, fieldsMapping = {} } = rule.singleProduct!;
  for (const url of productUrls) {
    const product = await crawlSingleProduct(page, url, fieldsMapping, rule);
    await addProduct(taskId, product);
    await page.waitForTimeout(500);
  }
}

async function crawlSingleProduct(page: Page, url: string, mapping: Record<string, string>, rule: CrawlerRule): Promise<any> {
  return await waitWithRetry(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const product: any = { url };
    for (const [field, selector] of Object.entries(mapping)) {
      try {
        const value = await page.$eval(selector, el => el.textContent?.trim() || '');
        product[field] = value;
      } catch {
        product[field] = '';
      }
    }
    return product;
  }, rule.maxRetries || 3, 2000);
}