// lib/discovery/sync/product-collection.ts
import { SyncContext, SyncResult } from './types';
import { translateFields } from '../translate';
import { getCategories, saveCategories } from '@/lib/products/services';

/**
 * 同步产品分类业务数据
 * - repairOnly: 仅修复关联，不操作业务数据
 * - translate: true 则翻译字段，false 则直接复制原文
 */
export async function syncProductCollection(context: SyncContext): Promise<SyncResult> {
  // 修复模式：不操作业务数据
  if (context.repairOnly) {
    return { success: true };
  }

  try {
    // 1. 从源页面 ID 中提取原始业务 ID
    const rawId = context.sourcePage.id.replace('productCollection:', '');

    // 2. 获取源语言（en）的分类列表
    const sourceCategories = await getCategories(context.sourcePage.locale);
    const sourceItem = sourceCategories.find((c) => c.id === rawId);

    if (!sourceItem) {
      return { success: false, error: `Category ${rawId} not found in source` };
    }

    // 3. 根据 translate 决定是否翻译（递归处理 series）
    let translatedItem = sourceItem;
    if (context.translate) {
      translatedItem = await translateFields(
        sourceItem,
        'productCollection',
        context.targetLocale
      );
    }

    // 4. 获取目标语言的现有分类列表
    let targetCategories = await getCategories(context.targetLocale).catch(() => []);

    // 5. 合并或覆盖
    const existingIndex = targetCategories.findIndex((c) => c.id === rawId);
    if (existingIndex >= 0) {
      targetCategories[existingIndex] = translatedItem;
    } else {
      targetCategories.push(translatedItem);
    }

    // 6. 保存到目标语言
    await saveCategories(context.targetLocale, targetCategories);

    // 7. 返回数据（可能是翻译后的或原文），供 route 更新 pages 表
    return {
      success: true,
      data: translatedItem,
    };
  } catch (error: any) {
    console.error(`Product collection sync error for ${context.sourcePage.id}:`, error);
    return { success: false, error: error.message };
  }
}