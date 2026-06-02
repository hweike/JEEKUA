// lib/crawler/strategies/shopify-collection.ts
import { Page } from 'playwright';
import { CrawlerRule } from '../types';
import { waitWithRetry } from '../core/utils';

export async function crawlShopifyCollection(
  page: Page,
  rule: CrawlerRule,
  taskId: string,
  addProduct: (taskId: string, product: any) => Promise<void>
): Promise<void> {
  const { collectionUrls, productItemSelector, productLinkSelector, paginationSelector, maxPages = 10 } = rule.shopifyCollection!;
  for (const collectionUrl of collectionUrls) {
    let pageNum = 1;
    let hasNext = true;
    while (hasNext && pageNum <= maxPages) {
      const url = pageNum === 1 ? collectionUrl : `${collectionUrl}?page=${pageNum}`;
      console.log(`抓取系列页: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector(productItemSelector, { timeout: 10000 });
      const productLinks = await page.$$eval(productLinkSelector, links => links.map(a => (a as HTMLAnchorElement).href));
      for (const link of productLinks) {
        const product = await crawlSingleProduct(page, link, rule);
        await addProduct(taskId, product);
      }
      if (paginationSelector) {
        const nextBtn = await page.$(paginationSelector);
        if (nextBtn && await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
          pageNum++;
        } else {
          hasNext = false;
        }
      } else {
        hasNext = false;
      }
    }
  }
}

async function crawlSingleProduct(page: Page, url: string, rule: CrawlerRule): Promise<any> {
  return await waitWithRetry(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // 这里可以自定义字段提取，简单示例提取标题和价格
    const title = await page.$eval('h1', el => el.innerText.trim()).catch(() => '');
    const price = await page.$eval('[data-price]', el => el.innerText.trim()).catch(() => '');
    return { url, title, price };
  }, rule.maxRetries || 3, 2000);
}