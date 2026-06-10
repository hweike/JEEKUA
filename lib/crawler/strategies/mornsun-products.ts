// lib/crawler/strategies/mornsun-products.ts
import { Page } from 'playwright';
import { CrawlerRule } from '../types';
import { getTask } from '../core/task';
import { waitWithRetry, appendTaskLog } from '../core/utils';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function crawlMornsunProducts(
  page: Page,
  rule: CrawlerRule,
  taskId: string,
  addProduct: (taskId: string, product: any) => Promise<boolean>
): Promise<void> {
  const src = rule.mornsunProducts?.categoriesSource;
  if (!src) throw new Error('Missing categoriesSource for mornsun-products');
  let categories: any[] = [];
  if (src.type === 'task' && src.taskId) {
    const srcTask = await getTask(src.taskId);
    console.log(`[Task ${taskId}] 源任务 ID: ${src.taskId}`);
    categories = srcTask?.categories || [];
  } else if (src.type === 'file' && src.filePath) {
    const storage = getPrivateStorage();
    try {
      const content = await storage.read(src.filePath, 'utf8');
      categories = JSON.parse(content as string);
      console.log(`从文件读取到 ${categories.length} 个分类`);
    } catch (error) {
      console.error(`读取分类文件失败: ${src.filePath}`, error);
      await appendTaskLog(taskId, `读取分类文件失败: ${src.filePath}`);
      throw new Error(`无法读取分类文件: ${src.filePath}`);
    }
  } else {
    throw new Error('Invalid categoriesSource configuration');
  }
  const level2Categories = categories.filter((cat: any) => cat.parentId !== null);
  console.log(`找到 ${level2Categories.length} 个二级分类`);
  await appendTaskLog(taskId, `找到 ${level2Categories.length} 个二级分类`);

  const productLimit = rule.mornsunProducts?.productLimit || 0;
  let totalAttemptCount = 0;
  let totalAddedCount = 0;

  for (let idx = 0; idx < level2Categories.length; idx++) {
    if (productLimit > 0 && totalAttemptCount >= productLimit) {
      console.log(`✅ 已达到产品数量限制 (${productLimit})，停止抓取`);
      await appendTaskLog(taskId, `已达到产品数量限制 (${productLimit})，停止抓取`);
      return;
    }

    const cat = level2Categories[idx];
    console.log(`正在抓取分类: ${cat.name} (${cat.url})`);
    await appendTaskLog(taskId, `正在抓取分类: ${cat.name} (${cat.url})`);

    try {
      const parentSeriesList = await crawlProductListHierarchy(page, rule, cat.url, cat.id, cat.name, taskId);
      for (const parentSeries of parentSeriesList) {
        if (productLimit > 0 && totalAttemptCount >= productLimit) break;
        totalAttemptCount++;
        const added = await addProduct(taskId, parentSeries);
        if (added) totalAddedCount++;
      }
      console.log(`  分类 ${cat.name} 完成，累计尝试: ${totalAttemptCount}，成功: ${totalAddedCount}`);
      await appendTaskLog(taskId, `分类 ${cat.name} 完成，累计尝试: ${totalAttemptCount}，成功: ${totalAddedCount}`);
    } catch (err) {
      console.error(`抓取分类 ${cat.name} 失败:`, err);
      await appendTaskLog(taskId, `抓取分类 ${cat.name} 失败: ${err}`);
    }
    if (idx < level2Categories.length - 1) await page.waitForTimeout(1000);
  }
}

async function crawlProductListHierarchy(
  page: Page,
  rule: CrawlerRule,
  url: string,
  categoryId: number,
  categoryName: string,
  taskId: string
): Promise<any[]> {
  const conf = rule.mornsunProducts!;
  const containerSelector = conf.tableContainer || '.scroll_box .tb_2';
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
      await appendTaskLog(taskId, `动态表头: ${headers.join(', ')}`);
    } else {
      headers = Object.keys(rule.productList?.fieldMapping || {});
    }

    if (headers.length === 0) {
      throw new Error('无法提取表头，请检查 headerSelector 是否正确或启用 dynamicHeaders');
    }

    // 获取主表格容器元素句柄
    const container = await page.$(containerSelector);
    if (!container) {
      throw new Error(`无法找到表格容器: ${containerSelector}`);
    }

    // 提取父行（系列）
    const parents = await container.$$eval(parentRowSelector, (rows, headers) => {
      return rows.map(row => {
        const seriesId = row.getAttribute('data-id') || '';
        const modelLink = row.querySelector('td.td_1 a') as HTMLAnchorElement;
        const seriesName = modelLink ? modelLink.innerText.trim() : '';
        let imageUrl = row.getAttribute('data-src') || '';
        if (imageUrl) imageUrl = imageUrl.replace('/120/', '/');

        const cells = row.querySelectorAll('td');
        const attributes: Record<string, string> = {};

        // 先为所有表头（跳过“系列标题”）初始化空值（"-"）
        for (let i = 1; i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            attributes[header] = '-';
          }
        }

        // 遍历实际单元格，覆盖对应列的值（跳过“系列标题”列）
        for (let i = 1; i < cells.length && i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            let value = cells[i].innerText.trim();
            if (value === '展开') value = '-';
            if (value === '-') value = '';
            attributes[header] = value || '-';
          }
        }

        // 将“系列标题”列改为“型号”，并放在最前面
        const finalAttributes: Record<string, string> = {};
        finalAttributes['型号'] = seriesName || '-';
        // 按原顺序添加其他属性（保持顺序）
        for (let i = 1; i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            finalAttributes[header] = attributes[header];
          }
        }

        console.log(`父行 ${seriesId} 提取到 ${Object.keys(finalAttributes).length} 个属性`);
        return { seriesId, seriesName, imageUrl, attributes: finalAttributes };
      });
    }, headers);
    await appendTaskLog(taskId, `提取到 ${parents.length} 个父系列`);

    // 提取子行（具体型号）
    const children = await container.$$eval(childRowSelector, (rows, { headers, parents }) => {
      return rows.map(row => {
        const parentId = row.getAttribute('data-p') || '';
        const modelLink = row.querySelector('td.td_1 a') as HTMLAnchorElement;
        const model = modelLink ? modelLink.innerText.trim() : '';
        let imageUrl = row.getAttribute('data-src') || '';
        if (imageUrl) imageUrl = imageUrl.replace('/120/', '/');

        const cells = row.querySelectorAll('td');
        const attributes: Record<string, string> = {};

        // 初始化所有非“系列标题”列
        for (let i = 1; i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            attributes[header] = '-';
          }
        }

        for (let i = 1; i < cells.length && i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            let value = cells[i].innerText.trim();
            if (value === '展开') value = '-';
            if (value === '-') value = '';
            // 特殊列处理
            if (header.includes('资料下载') || header.includes('下载')) {
              const links = row.querySelectorAll(`td:nth-child(${i+1}) a`);
              const items: string[] = [];
              for (const link of links) {
                const title = link.getAttribute('title') || link.innerText.trim() || '下载';
                const href = (link as HTMLAnchorElement).href;
                items.push(`${title}: ${href}`);
              }
              value = items.join(', ') || '-';
            } else if (header.includes('认证') || header.includes('标准')) {
              const certDivs = row.querySelectorAll(`td:nth-child(${i+1}) .certificate-bg`);
              const certs: string[] = [];
              for (const div of certDivs) {
                const cls = div.className;
                if (cls.includes('ce-bg')) certs.push('CE');
                if (cls.includes('ccc-bg')) certs.push('CCC');
                if (cls.includes('cqc-bg')) certs.push('CQC');
                if (cls.includes('ul-bg')) certs.push('UL');
              }
              value = certs.join(', ') || '-';
            } else if (header.includes('技术手册')) {
              const link = row.querySelector(`td:nth-child(${i+1}) a`) as HTMLAnchorElement;
              if (link && link.href) {
                let href = link.href;
                href = href.replace('www.mornsun.cn', 'www.mornsun-power.com');
                value = href;
              } else {
                value = '-';
              }
            } else {
              value = value || '-';
            }
            attributes[header] = value;
          }
        }

        // 构建最终 attributes，最前面插入“型号”
        const finalAttributes: Record<string, string> = {};
        finalAttributes['型号'] = model || '-';
        for (let i = 1; i < headers.length; i++) {
          const header = headers[i];
          if (header && header !== '系列标题') {
            finalAttributes[header] = attributes[header];
          }
        }

        const parentSeries = parents.find(p => p.seriesId === parentId);
        return {
          parentId,
          seriesName: parentSeries ? parentSeries.seriesName : '',
          model,
          imageUrl,
          attributes: finalAttributes,
        };
      });
    }, { headers, parents });
    await appendTaskLog(taskId, `提取到 ${children.length} 个子产品`);

    // 构建父系列对象
    const parentMap = new Map();
    for (const parent of parents) {
      parentMap.set(parent.seriesId, {
        categoryId,
        categoryName,
        brand: 'MORNSUN',
        parent_product_id: parent.seriesId,
        parent_product_name: parent.seriesName,
        parent_product_sku: parent.seriesName,
        parent_product_imageUrl: parent.imageUrl,
        attributes: parent.attributes,
        variants: [],
      });
    }
    for (const child of children) {
      const parentObj = parentMap.get(child.parentId);
      if (parentObj) {
        parentObj.variants.push({
          product_id: child.model,
          product_name: child.model,
          product_sku: child.model,
          product_imageUrl: child.imageUrl,
          attributes: child.attributes,
        });
      }
    }

    const result = Array.from(parentMap.values());
    await appendTaskLog(taskId, `构建完成，共 ${result.length} 个父系列对象`);
    return result;
  }, rule.maxRetries || 3, 2000);
}