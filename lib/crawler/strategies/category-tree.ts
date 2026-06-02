// lib/crawler/strategies/category-tree.ts
import { Page } from 'playwright';
import { CrawlerRule } from '../types';
import { waitWithRetry } from '../core/utils';

export async function crawlCategoryTree(page: Page, rule: CrawlerRule, taskId?: string): Promise<any[]> {
  const waitTimeout = rule.categoryTree?.waitTimeout || 10000;
  const containerSelectors = Array.isArray(rule.categoryTree!.containerSelector)
    ? rule.categoryTree!.containerSelector
    : [rule.categoryTree!.containerSelector];

  // 描述选择器（支持多个备选）
  const descriptionSelectors = rule.categoryTree?.descriptionSelector
    ? (Array.isArray(rule.categoryTree.descriptionSelector) ? rule.categoryTree.descriptionSelector : [rule.categoryTree.descriptionSelector])
    : ['.description .left-con', '.description .scroll-con'];

  return await waitWithRetry(async () => {
    // 1. 加载起始页，提取分类树（所有分类的 id, name, url, parentId，一级分类的描述暂留空）
    await page.goto(rule.startUrl!, { waitUntil: 'domcontentloaded', timeout: 60000 });

    let successfulSelector: string | null = null;
    for (const selector of containerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: waitTimeout });
        successfulSelector = selector;
        console.log(`✅ Found container: ${selector}`);
        break;
      } catch {
        console.warn(`⚠️ Container ${selector} not found`);
      }
    }
    if (!successfulSelector) throw new Error(`No container selector found among: ${containerSelectors.join(', ')}`);

    const useTwoLevel = !!(rule.categoryTree?.level1 && rule.categoryTree?.level2);

    // 提取分类树（暂不填充描述，后续单独处理二级分类）
    const categories = await page.evaluate(({ rule, containerSelector, useTwoLevel }) => {
      const root = document.querySelector(containerSelector);
      if (!root) return [];

      // 辅助：获取当前页面的描述（供一级分类使用）
      const getCurrentPageDescription = () => {
        // 在起始页中提取一级分类的共同描述（如果规则配置了 descriptionSelector）
        try {
          const descSelector = rule.categoryTree?.descriptionSelector;
          if (descSelector) {
            const el = document.querySelector(descSelector);
            if (el) return (el.innerText || el.textContent || '').trim();
          }
        } catch {}
        return '';
      };
      const commonDesc = getCurrentPageDescription();

      // 兼容旧结构：仅一级
      if (!useTwoLevel && rule.categoryTree?.itemSelector && rule.categoryTree?.nameSelector && rule.categoryTree?.urlSelector) {
        const items = root.querySelectorAll(rule.categoryTree.itemSelector);
        const result: any[] = [];
        let autoId = 1;
        items.forEach((item) => {
          const nameEl = item.querySelector(rule.categoryTree!.nameSelector!);
          const urlEl = item.querySelector(rule.categoryTree!.urlSelector!);
          if (!nameEl || !urlEl) return;
          let url = urlEl.getAttribute('href') || '';
          if (rule.categoryTree?.urlPrefix && !url.startsWith('http')) {
            url = rule.categoryTree.urlPrefix + url;
          }
          result.push({
            id: autoId++,
            name: nameEl.textContent?.trim() || '',
            url: url,
            parentId: null,
            description: commonDesc,
          });
        });
        return result;
      }

      // 新结构：两级分类
      if (useTwoLevel) {
        const level1Items = root.querySelectorAll(rule.categoryTree!.level1!.itemSelector);
        let nextId = 1;
        const result: any[] = [];

        level1Items.forEach((level1El) => {
          const name1El = level1El.querySelector(rule.categoryTree!.level1!.nameSelector);
          const url1El = level1El.querySelector(rule.categoryTree!.level1!.urlSelector);
          if (!name1El || !url1El) return;
          let url1 = url1El.getAttribute('href') || '';
          if (rule.categoryTree?.urlPrefix && !url1.startsWith('http')) {
            url1 = rule.categoryTree.urlPrefix + url1;
          }
          const level1Id = nextId++;
          result.push({
            id: level1Id,
            name: name1El.textContent?.trim() || '',
            url: url1,
            parentId: null,
            description: commonDesc, // 一级分类使用起始页的描述（可能不精确，但通常够用）
          });

          const level2Container = level1El.querySelector(rule.categoryTree!.level2!.containerSelector);
          if (level2Container) {
            const level2Items = level2Container.querySelectorAll(rule.categoryTree!.level2!.itemSelector);
            level2Items.forEach((level2El) => {
              const name2El = level2El.querySelector(rule.categoryTree!.level2!.nameSelector);
              const url2El = level2El.querySelector(rule.categoryTree!.level2!.urlSelector);
              if (!name2El || !url2El) return;
              let url2 = url2El.getAttribute('href') || '';
              if (rule.categoryTree?.urlPrefix && !url2.startsWith('http')) {
                url2 = rule.categoryTree.urlPrefix + url2;
              }
              result.push({
                id: nextId++,
                name: name2El.textContent?.trim() || '',
                url: url2,
                parentId: level1Id,
                description: '', // 二级描述稍后单独抓取
              });
            });
          }
        });
        return result;
      }
      return [];
    }, { rule, containerSelector: successfulSelector, useTwoLevel });

    if (categories.length === 0) throw new Error('No categories extracted');

    // 2. 只对二级分类（parentId !== null）单独抓取描述
    const shouldFetch = rule.categoryTree?.fetchAllDescriptions !== false; // 默认开启
    if (shouldFetch) {
      const level2Nodes = categories.filter(cat => cat.parentId !== null);
      console.log(`正在为 ${level2Nodes.length} 个二级分类单独抓取描述...`);
      const delay = rule.categoryTree?.level2DescriptionDelay || 1000;
      for (let i = 0; i < level2Nodes.length; i++) {
        const cat = level2Nodes[i];
        let fetched = false;
        for (const descSelector of descriptionSelectors) {
          try {
            console.log(`🌐 访问 ${cat.name} (${cat.url}) 抓取描述，尝试选择器: ${descSelector}`);
            await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector(descSelector, { timeout: 10000 });
            const desc = await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (!el) return '';
              let text = (el.innerText || el.textContent || '').trim();
              if (text.endsWith('展开查看更多')) text = text.slice(0, -6).trim();
              return text;
            }, descSelector);
            if (desc && desc.length > 0) {
              cat.description = desc;
              console.log(`✅ 成功获取 ${cat.name} 的描述 (长度 ${desc.length})`);
              fetched = true;
              break;
            }
          } catch (err) {
            console.warn(`⚠️ 使用选择器 ${descSelector} 抓取 ${cat.name} 失败:`, err);
          }
        }
        if (!fetched) {
          console.warn(`⚠️ 无法获取 ${cat.name} 的描述，保留空字符串`);
          cat.description = '';
        }
        if (i < level2Nodes.length - 1) await page.waitForTimeout(delay);
      }
    }

    return categories;
  }, rule.maxRetries || 3, 2000);
}