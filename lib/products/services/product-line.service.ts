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