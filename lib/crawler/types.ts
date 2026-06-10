// lib/crawler/types.ts
export interface CrawlerRule {
  name: string;
  crawlType: 'category-tree' | 'mornsun-products' | 'shopify-collection' | 'single-product';
  startUrl?: string;
  // 分类树专用
  categoryTree?: {
    containerSelector: string | string[];
    level1?: {
      itemSelector: string;
      nameSelector: string;
      urlSelector: string;
    };
    level2?: {
      containerSelector: string;
      itemSelector: string;
      nameSelector: string;
      urlSelector: string;
    };
    urlPrefix?: string;
    waitTimeout?: number;
    descriptionSelector?: string;
    fetchAllDescriptions?: boolean;
    level2DescriptionDelay?: number;
  };
  // MORNSUN 产品列表专用
  mornsunProducts?: {
    tableContainer?: string;
    headerSelector?: string;
    parentRowSelector?: string;
    childRowSelector?: string;
    dynamicHeaders?: boolean;
    categoriesSource?: {
      type: 'task' | 'file';
      taskId?: string;
      filePath?: string;
    };
  };
  // Shopify 商品系列专用
  shopifyCollection?: {
    collectionUrls: string[];
    productItemSelector: string;
    productLinkSelector: string;
    paginationSelector?: string;
    maxPages?: number;
  };
  // 单页产品专用
  singleProduct?: {
    productUrls: string[];
    fieldsMapping?: Record<string, string>;
  };
  requestTimeout?: number;
  maxRetries?: number;
  debugScreenshot?: boolean;
}

export interface TaskData {
  taskId: string;
  ruleId: string;
  status: 'pending' | 'crawling_categories' | 'crawling_products' | 'completed' | 'failed' | 'paused';
  categories?: any[];
  currentCategoryIndex?: number;
  currentPagePerCategory?: Record<number, number>;
  productsCount?: number;
  error?: string;
  progress?: string;
  createdAt: string;
  updatedAt: string;
  latestProducts?: any[]; // 最近添加的几条产品数据（用于预览）
}

export const DATA_ROOT = process.cwd() + '/crawler';
export const RULES_DIR = DATA_ROOT + '/rules';
export const TASKS_DIR = DATA_ROOT + '/tasks';