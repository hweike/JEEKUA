// lib/discovery/sync/sync-business.ts
import { SyncContext, SyncResult } from './types';
import { syncProductLine } from './product-line';
import { syncProductCollection } from './product-collection';
import { syncProduct } from './product'; // 新增

// 注册所有支持的页面类型及其对应的同步处理函数
const handlers: Record<string, (ctx: SyncContext) => Promise<SyncResult>> = {
  productLine: syncProductLine,
  productCollection: syncProductCollection,
  product: syncProduct,
  // 后续扩展其他类型，例如：
  // product: syncProduct,
  // blogCategory: syncBlogCategory,
  // ...
};

/**
 * 业务数据同步入口函数
 * 根据源页面的 type 路由到对应的处理器
 */
export async function syncBusinessData(context: SyncContext): Promise<SyncResult> {
  const { sourcePage } = context;
  const handler = handlers[sourcePage.type];
  if (!handler) {
    return {
      success: false,
      error: `Unsupported page type: ${sourcePage.type}`,
    };
  }
  return handler(context);
}