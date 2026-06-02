// lib/crawler/strategies/mornsun-products.ts
import { Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { CrawlerRule } from '../types';
import { getTask } from '../core/task';
import { waitWithRetry } from '../core/utils';

export async function crawlMornsunProducts(
  page: Page,
  rule: CrawlerRule,
  taskId: string,
  addProduct: (taskId: string, product: any) => Promise<void>
): Promise<void> {
  const src = rule.mornsunProducts?.categoriesSource;
  if (!src) throw new Error('Missing categoriesSource for mornsun-products');
  let categories: any[] = [];
  if (src.type === 'task' && src.taskId) {
    const srcTask = await getTask(src.taskId);
    categories = srcTask?.categories || [];
  } else if (src.type === 'file' && src.filePath) {
    const filePath = path.resolve(process.cwd(), src.filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    categories = JSON.parse(content);
  } else {
    throw new Error('Invalid categoriesSource configuration');
  }
  const level2Categories = categories.filter((cat: any) => cat.parentId !== null);
  console.log(`找到 ${level2Categories.length} 个二级分类`);

  for (let idx = 0; idx < level2Categories.length; idx++) {
    const cat = level2Categories[idx];
    console.log(`正在抓取分类: ${cat.name} (${cat.url})`);
    try {
      const products = await crawlProductListHierarchy(page, rule, cat.url, cat.id, cat.name);
      for (const prod of products) {
        await addProduct(taskId, prod);
      }
      console.log(`  获取到 ${products.length} 个产品`);
    } catch (err) {
      console.error(`抓取分类 ${cat.name} 失败:`, err);
    }
    if (idx < level2Categories.length - 1) await page.waitForTimeout(1000);
  }
}

async function crawlProductListHierarchy(
  page: Page,
  rule: CrawlerRule,
  url: string,
  categoryId: number,
  categoryName: string
): Promise<any[]> {
  const conf = rule.mornsunProducts!;
  const containerSelector = conf.tableContainer || '.scroll_box';
  const headerSelector = conf.headerSelector || '.table_field li';
  const parentRowSelector = conf.parentRowSelector || 'tr.slide_p';
  const childRowSelector = conf.childRowSelector || 'tr.show_list';
  const dynamicHeaders = conf.dynamicHeaders !== false;

  return await waitWithRetry(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector(containerSelector, { timeout: 10000 });

    // 提取动态表头
    let headers: string[] = [];
    if (dynamicHeaders) {
      headers = await page.$$eval(headerSelector, els =>
        els.map(el => el.innerText.trim().replace(/\n/g, ''))
      );
      console.log(`动态表头: ${headers.join(', ')}`);
    } else {
      headers = Object.keys(rule.productList?.fieldMapping || {});
    }
    if (headers.length === 0) {
      headers = ['系列标题', '功率(W)', '输入电压(VAC)', '输入电压(VDC)', '输出电压(VDC)', '输出电流', '效率%', '隔离电压', 'PFC功能', '资料下载', '认证/标准', '技术手册', '样品申请'];
    }

    // 提取父行（系列）数据，同时获取图片和技术手册链接
    const parents = await page.$$eval(parentRowSelector, (rows, headers) => {
      return rows.map(row => {
        const seriesId = row.getAttribute('data-id') || '';
        const modelLink = row.querySelector('td.td_1 a') as HTMLAnchorElement;
        const seriesName = modelLink ? modelLink.innerText.trim() : '';
        // 产品图片：从 tr 的 data-src 属性获取
        const imageUrl = row.getAttribute('data-src') || '';
        // 技术手册：从最后一个 td 中的 a 标签获取 href（如果存在）
        const lastTd = row.querySelector('td:last-child');
        const datasheetLink = lastTd ? (lastTd.querySelector('a') as HTMLAnchorElement)?.href || '' : '';
        const cells = row.querySelectorAll('td');
        const fields: Record<string, string> = {};
        for (let i = 1; i < cells.length && i < headers.length; i++) {
          const header = headers[i];
          if (header) {
            let value = cells[i].innerText.trim();
            if (value === '-') value = '';
            fields[header] = value;
          }
        }
        return { seriesId, seriesName, imageUrl, datasheetLink, fields };
      });
    }, headers);

    // 提取子行（具体型号）数据，同样获取图片和技术手册（若子行没有则从父行继承）
    const children = await page.$$eval(childRowSelector, (rows, { headers, parents }) => {
      return rows.map(row => {
        const parentId = row.getAttribute('data-p') || '';
        const modelLink = row.querySelector('td.td_1 a') as HTMLAnchorElement;
        const model = modelLink ? modelLink.innerText.trim() : '';
        // 子行的图片：优先使用自己的 data-src，没有则从父行继承
        let imageUrl = row.getAttribute('data-src') || '';
        // 子行的技术手册：优先自己的最后 td 中的 a，没有则从父行继承
        const lastTd = row.querySelector('td:last-child');
        let datasheetLink = lastTd ? (lastTd.querySelector('a') as HTMLAnchorElement)?.href || '' : '';
        const cells = row.querySelectorAll('td');
        const fields: Record<string, string> = {};
        for (let i = 1; i < cells.length && i < headers.length; i++) {
          const header = headers[i];
          if (header) {
            let value = cells[i].innerText.trim();
            if (value === '-') value = '';
            fields[header] = value;
          }
        }
        const parentSeries = parents.find(p => p.seriesId === parentId);
        if (!imageUrl && parentSeries) imageUrl = parentSeries.imageUrl;
        if (!datasheetLink && parentSeries) datasheetLink = parentSeries.datasheetLink;
        return {
          parentId,
          seriesName: parentSeries ? parentSeries.seriesName : '',
          model,
          imageUrl,
          datasheetUrl: datasheetLink,
          fields,
        };
      });
    }, { headers, parents });

    // 构建最终产品数组
    const products: any[] = [];
    for (const child of children) {
      products.push({
        categoryId,
        categoryName,
        seriesId: child.parentId,
        seriesName: child.seriesName,
        model: child.model,
        imageUrl: child.imageUrl,
        datasheetUrl: child.datasheetUrl,
        ...child.fields,
      });
    }
    return products;
  }, rule.maxRetries || 3, 2000);
}