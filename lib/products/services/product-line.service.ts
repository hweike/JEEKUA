// lib/products/services/product-line.service.ts
import {
  readFullData,
  writeFullData,
  normalizeProductLine,
} from '../utils/helpers';
import { ProductLine } from '@/lib/products/types';
import { deletePage } from '@/lib/discovery/register';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';

/**
 * 获取指定语言的所有产品线，已排序
 */
export async function getProductLines(locale: string): Promise<ProductLine[]> {
  const full = await readFullData(locale);
  const lines: ProductLine[] = full.productLines.map((raw: any) => normalizeProductLine(raw));
  lines.sort((a: ProductLine, b: ProductLine) => a.order - b.order);
  return lines;
}

/**
 * 保存产品线数据（覆盖原有 productLines，保留 categories 不变）
 * 自动同步 pages 表：
 * - 删除被移除的产品线
 * - 异步注册新增/更新的产品线
 */
export async function saveProductLines(locale: string, productLines: ProductLine[]): Promise<void> {
  const full = await readFullData(locale);
  const oldLines: ProductLine[] = full.productLines.map((raw: any) => normalizeProductLine(raw));
  const newIds = new Set(productLines.map((l: ProductLine) => l.id));

  // 删除被移除的产品线对应的 pages 记录
  const deletedLines = oldLines.filter((l: ProductLine) => !newIds.has(l.id));
  for (const line of deletedLines) {
    try {
      const pageId = `productLine:${line.id}`;
      await deletePage(pageId, locale);
    } catch (err) {
      console.error(`删除产品线 pages 失败 (id: ${line.id}):`, err);
    }
  }

  const cleanedLines = productLines.map((l: ProductLine) => normalizeProductLine(l));
  full.productLines = cleanedLines;
  await writeFullData(locale, full);

  // 异步注册所有产品线（新增或更新）
  const registerPromises = cleanedLines.map((line: ProductLine) =>
    registerEntity({
      type: 'productLine',
      id: line.id,
      locale,
      data: line,
      updatedAt: new Date().toISOString(),
    }).catch((err: any) => {
      console.error(`注册产品线到 pages 失败 (id: ${line.id}):`, err);
    })
  );
  Promise.allSettled(registerPromises);
}

/**
 * 复制产品线（从源语言复制到目标语言）
 * 若目标已有相同 ID，则覆盖；否则新增
 * 新增：复制后注册到目标语言的 pages 表
 */
export async function copyProductLine(
  sourceLocale: string,
  targetLocale: string,
  id: string
): Promise<void> {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }

  // 获取源产品线
  const sourceLines = await getProductLines(sourceLocale);
  const sourceLine = sourceLines.find((l) => l.id === id);
  if (!sourceLine) {
    throw new Error(`源产品线 ${id} 不存在`);
  }

  // 获取目标产品线列表
  let targetLines = await getProductLines(targetLocale);
  const existingIndex = targetLines.findIndex((l) => l.id === id);

  // 克隆源产品线（深拷贝）
  const cloned: ProductLine = JSON.parse(JSON.stringify(sourceLine));

  if (existingIndex !== -1) {
    targetLines[existingIndex] = cloned;
  } else {
    targetLines.push(cloned);
  }

  await saveProductLines(targetLocale, targetLines);
}

/**
 * 批量更新产品线翻译字段（若目标语言不存在则从源语言复制）
 * @param targetLocale 目标语言
 * @param translations 翻译数据数组，每个元素包含 id, name, seoTitle, seoDescription, seoKeywords
 * @param sourceLocale 源语言（可选，用于创建新产品时复制非翻译字段）
 */
export async function updateProductLineTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    name?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { id, name, seoTitle, seoDescription, seoKeywords } = trans;

    try {
      // 获取目标语言产品线列表
      let targetLines = await getProductLines(targetLocale);
      const existingIndex = targetLines.findIndex((l) => l.id === id);

      if (existingIndex === -1) {
        // 目标不存在，尝试从源复制
        if (!sourceLocale) {
          errors.push(`产品线 ${id} 在目标语言中不存在且未提供源语言`);
          failed++;
          continue;
        }
        try {
          await copyProductLine(sourceLocale, targetLocale, id);
        } catch (copyErr: any) {
          errors.push(`复制产品线 ${id} 失败: ${copyErr.message}`);
          failed++;
          continue;
        }
        // 重新读取目标列表
        targetLines = await getProductLines(targetLocale);
        const newIndex = targetLines.findIndex((l) => l.id === id);
        if (newIndex === -1) {
          errors.push(`复制后无法找到产品线 ${id}`);
          failed++;
          continue;
        }
        // 应用翻译字段
        const line = targetLines[newIndex];
        if (name !== undefined) line.name = name;
        if (seoTitle !== undefined) line.seoTitle = seoTitle;
        if (seoDescription !== undefined) line.seoDescription = seoDescription;
        if (seoKeywords !== undefined) line.seoKeywords = seoKeywords;
        await saveProductLines(targetLocale, targetLines);
        success++;
      } else {
        // 目标已存在，直接更新
        const line = targetLines[existingIndex];
        if (name !== undefined) line.name = name;
        if (seoTitle !== undefined) line.seoTitle = seoTitle;
        if (seoDescription !== undefined) line.seoDescription = seoDescription;
        if (seoKeywords !== undefined) line.seoKeywords = seoKeywords;
        await saveProductLines(targetLocale, targetLines);
        success++;
      }
    } catch (err: any) {
      errors.push(`产品线 ${id} 更新失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}