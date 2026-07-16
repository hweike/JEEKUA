// lib/discovery/sync/product-line.ts
import { SyncContext, SyncResult } from './types';
import { translateFields } from '../translate';
import { getProductLines, saveProductLines } from '@/lib/products/services';

/**
 * 同步产品线业务数据
 * - repairOnly: 仅修复关联，不操作业务数据
 * - translate: true 则翻译字段，false 则直接复制原文
 */
export async function syncProductLine(context: SyncContext): Promise<SyncResult> {
  // 修复模式：不操作业务数据
  if (context.repairOnly) {
    return { success: true };
  }

  try {
    // 1. 从源页面 ID 中提取原始业务 ID
    const rawId = context.sourcePage.id.replace('productLine:', '');

    // 2. 获取源语言（en）的产品线列表
    const sourceLines = await getProductLines(context.sourcePage.locale);
    const sourceItem = sourceLines.find((p) => p.id === rawId);

    if (!sourceItem) {
      return { success: false, error: `Product line ${rawId} not found in source` };
    }

    // 3. 根据 translate 决定是否翻译
    let translatedItem = sourceItem;
    if (context.translate) {
      translatedItem = await translateFields(sourceItem, 'productLine', context.targetLocale);
    }

    // 4. 获取目标语言的现有产品线列表
    let targetLines = await getProductLines(context.targetLocale).catch(() => []);

    // 5. 合并或覆盖
    const existingIndex = targetLines.findIndex((p) => p.id === rawId);
    if (existingIndex >= 0) {
      targetLines[existingIndex] = translatedItem;
    } else {
      targetLines.push(translatedItem);
    }

    // 6. 保存到目标语言
    await saveProductLines(context.targetLocale, targetLines);

    // 7. 返回数据（可能是翻译后的或原文），供 route 更新 pages 表
    return {
      success: true,
      data: translatedItem,
    };
  } catch (error: any) {
    console.error(`Product line sync error for ${context.sourcePage.id}:`, error);
    return { success: false, error: error.message };
  }
}