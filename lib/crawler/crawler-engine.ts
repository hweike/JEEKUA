// lib/crawler/crawler-engine.ts
import { getRule, saveTask, getTask, ensureDirs } from './core/task';
import { launchBrowser, createPage, closeBrowser } from './core/browser';
import { addProduct, flushProducts } from './core/buffer';
import { crawlCategoryTree } from './strategies/category-tree';
import { crawlMornsunProducts } from './strategies/mornsun-products';
import { crawlShopifyCollection } from './strategies/shopify-collection';
import { crawlSingleProducts } from './strategies/single-product';

export async function runCrawler(taskId: string, ruleId: string, resume: boolean = false) {
  const rule = await getRule(ruleId);
  if (!rule) {
    await saveTask(taskId, { status: 'failed', error: `Rule ${ruleId} not found` });
    return;
  }

  let browser = null;
  let page = null;
  try {
    let taskData = await getTask(taskId);
    if (!taskData) {
      taskData = { taskId, ruleId, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await saveTask(taskId, taskData);
    }
    if (!resume && (taskData.status === 'crawling_categories' || taskData.status === 'crawling_products')) {
      await saveTask(taskId, { error: 'Task already running, use resume=true to continue', status: 'failed' });
      return;
    }

    browser = await launchBrowser();
    page = await createPage(browser, rule.requestTimeout || 60000);
    await saveTask(taskId, { status: 'crawling_products', progress: '开始抓取...' });

    if (rule.crawlType === 'category-tree') {
      const categories = await crawlCategoryTree(page, rule, taskId);
      await saveTask(taskId, { categories, status: 'completed', progress: '分类树抓取完成' });
    } 
    else if (rule.crawlType === 'mornsun-products') {
      await crawlMornsunProducts(page, rule, taskId, addProduct);
      await flushProducts(taskId);
      await saveTask(taskId, { status: 'completed', progress: '产品列表抓取完成' });
    }
    else if (rule.crawlType === 'shopify-collection') {
      await crawlShopifyCollection(page, rule, taskId, addProduct);
      await flushProducts(taskId);
      await saveTask(taskId, { status: 'completed', progress: 'Shopify系列抓取完成' });
    }
    else if (rule.crawlType === 'single-product') {
      await crawlSingleProducts(page, rule, taskId, addProduct);
      await flushProducts(taskId);
      await saveTask(taskId, { status: 'completed', progress: '单页产品抓取完成' });
    }
    else {
      throw new Error(`Unknown crawlType: ${rule.crawlType}`);
    }
  } catch (error: any) {
    console.error('Crawler error:', error);
    await saveTask(taskId, { status: 'failed', error: error.message });
    if (rule.debugScreenshot && page && taskId) {
      const { saveDebugScreenshot } = await import('./core/utils');
      await saveDebugScreenshot(page, taskId, 'crawler_error');
    }
  } finally {
    await closeBrowser(browser);
    await flushProducts(taskId);
  }
}

// 重新导出公共方法，保持原有接口
export { getTask, getRule, saveTask } from './core/task';