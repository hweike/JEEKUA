import { getAllCategories } from '@/lib/categories';
import { getProductsByProductLine, getProductsByCategoryAndSeries } from '@/lib/products/indexDb';
import { getProductUrlPattern } from '@/lib/products/productSettings';

export interface ProductLineRuntimeData {
  productLine: any;
  categoryTree: any[];
  products: any[];
  urlPattern: string;
  locale: string;
  currentSlug?: string;
  currentSeriesId?: string;
}

/**
 * 获取产品线运行时数据（产品列表、分类树等）
 */
export async function fetchProductLineRuntime(
  locale: string,
  productLineName: string,
  options?: { categorySlug?: string }
): Promise<ProductLineRuntimeData | null> {
  const { productLines, categories } = await getAllCategories(locale);
  const productLine = productLines.find((line: any) => line.name === productLineName);
  if (!productLine) return null;

  const urlPattern = await getProductUrlPattern(locale);
  const lineCategories = categories.filter((cat: any) => cat.productLineId === productLine.id);
  const categoryTree = lineCategories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',         // 一级分类描述
    children: (cat.series || []).map((series: any) => ({
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description || ''     // 二级分类描述
    })),
  }));

  let products: any[] = [];
  let currentSlug = options?.categorySlug;
  let currentSeriesId: string | undefined = undefined;

  if (options?.categorySlug) {
    // 查找分类
    let targetCategory = null;
    let seriesId = null;
    for (const cat of lineCategories) {
      if (cat.slug === options.categorySlug) {
        targetCategory = cat;
        break;
      }
      const foundSeries = cat.series?.find((s: any) => s.slug === options.categorySlug);
      if (foundSeries) {
        targetCategory = cat;
        seriesId = foundSeries.id;
        break;
      }
    }
    if (targetCategory) {
      const result = await getProductsByCategoryAndSeries(locale, targetCategory.id, seriesId, 1, 999);
      products = result.items || result;
      currentSeriesId = seriesId || undefined;
    }
  } else {
    const result = await getProductsByProductLine(locale, productLine.id, 1, 999);
    products = result.items || result;
  }

  return {
    productLine,
    categoryTree,
    products,
    urlPattern,
    locale,
    currentSlug,
    currentSeriesId,
  };
}