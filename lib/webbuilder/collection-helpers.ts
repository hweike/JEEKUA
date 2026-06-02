import { getAllCategories } from '@/lib/products/categories';
import { getProductsByCategory, getProductsByCategoryAndSeries } from '@/lib/products/indexDb';
import { getProductUrlPattern } from '@/lib/products/productSettings';

export async function fetchCollectionRuntime(locale: string, slug: string) {
  const { categories } = await getAllCategories(locale);
  
  // 查找一级分类
  let category = categories.find(c => c.slug === slug);
  let seriesId = null;
  let parentCategory = null;

  if (!category) {
    // 查找二级分类
    for (const cat of categories) {
      const foundSeries = cat.series?.find(s => s.slug === slug);
      if (foundSeries) {
        seriesId = foundSeries.id;
        parentCategory = cat;
        break;
      }
    }
    if (!parentCategory) return null;
    category = parentCategory;
  }

  const urlPattern = await getProductUrlPattern(locale);
  
  // 根据是否有 seriesId 选择查询函数
  let productsResult;
  if (seriesId) {
    productsResult = await getProductsByCategoryAndSeries(locale, category.id, seriesId, 1, 1000);
  } else {
    productsResult = await getProductsByCategory(locale, category.id, 1, 1000);
  }

  // 深拷贝确保可序列化
  const safeCategory = JSON.parse(JSON.stringify(category));
  const safeProducts = JSON.parse(JSON.stringify(productsResult.items));

  return {
   entityType: 'collection',
   collection: safeCategory,
   products: safeProducts,
   collectionId: safeCategory.id,   // ✅ 添加这一行
   urlPattern,
   locale,
   seriesId,
  };
}