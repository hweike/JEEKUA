// lib/webbuilder/product-helpers.ts
import { getProductBySlug } from '@/lib/products/indexDb';
import { readProduct } from '@/lib/products/mdParser';
import { getFullCatalogData } from '@/lib/seo/utils/catalog-data';

export interface ProductRuntimeData {
  product: any;
  productLine: any;
  category: any;
  series?: any;
}

/**
 * 获取产品详情页运行时数据（一次性聚合所有数据）
 * 
 * 设计原则：
 * - 并行获取独立数据（产品索引 + 目录数据），减少串行等待
 * - 统一数据来源，避免在页面和 SEO 中重复获取
 * - 与 product-line-helpers.ts 保持架构对称
 * 
 * @param locale 语言代码
 * @param slug 产品 slug
 * @returns 产品运行时数据，若产品不存在则返回 null
 */
export async function fetchProductRuntime(
  locale: string,
  slug: string
): Promise<ProductRuntimeData | null> {
  // ✅ 并行获取：产品索引 + 完整目录数据（两者完全独立，无依赖关系）
  const [productIndex, { productLines, categories }] = await Promise.all([
    getProductBySlug(locale, slug),
    getFullCatalogData(locale),
  ]);

  // 产品不存在
  if (!productIndex) {
    return null;
  }

  // ✅ 读取 MD 文件（依赖 productId，但已与上述步骤并行，整体耗时已减少）
  let mdData: any = {};
  try {
    mdData = await readProduct(locale, productIndex.productId);
  } catch {
    // MD 文件可能不存在，忽略（使用索引数据即可）
  }

  // 内存查找（极快）
  const productLine = productLines.find(
    (pl: any) => pl.id === productIndex.productLineId
  );
  if (!productLine) {
    // 理论上不应发生，但若产品线数据缺失，则返回 null 以便上层处理
    return null;
  }

  const category = categories.find(
    (cat: any) => cat.id === productIndex.categoryId
  );
  if (!category) {
    // 分类数据缺失同理
    return null;
  }

  let series: any;
  if (productIndex.seriesId && category.series) {
    series = category.series.find((s: any) => s.id === productIndex.seriesId);
  }

  // 合并产品数据：索引为主，MD 覆盖扩展字段
  const product = {
    ...productIndex,
    // 用 MD 中的内容覆盖索引中的对应字段（若存在）
    description: mdData.description || '',
    short_description: mdData.short_description || '',
    spec_text: mdData.spec_text || '',
    content: mdData.content || '',
    variants: mdData.variants || [],
    // 直接合并整个 mdData，确保不遗漏其他自定义字段
    ...mdData,
  };

  return {
    product,
    productLine,
    category,
    series,
  };
}