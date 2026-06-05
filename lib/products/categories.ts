import fs from 'fs/promises';
import path from 'path';

// 规范化产品线对象，确保包含 templateId
function normalizeProductLine(raw: any) {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    order: typeof raw.order === 'number' ? raw.order : 0,
    templateId: String(raw.templateId || ''),   // 关键：关联的 WebBuilder 模板 ID
  };
}

/** 获取分类详情（根据 slug） */
export async function getCategoryBySlug(locale: string, slug: string) {
  console.log('[getCategoryBySlug] locale:', locale, 'slug:', slug);
  try {
    const filePath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const categories = data.categories || [];
    const category = categories.find((c: any) => c.slug === slug);
    console.log('[getCategoryBySlug] found:', category);
    if (!category) return null;
    // 确保返回的对象始终包含 id
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      seoTitle: category.seoTitle || '',
      seoDescription: category.seoDescription || '',
      seoKeywords: category.seoKeywords || '',
    };
  } catch (err) {
    console.error('[getCategoryBySlug] error:', err);
    return null;
  }
}

/** 获取所有分类（用于分类树），并规范化产品线数据 */
export async function getAllCategories(locale: string) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const productLines = (data.productLines || []).map(normalizeProductLine);
    // 按 order 排序
    productLines.sort((a, b) => a.order - b.order);
    return {
      productLines,
      categories: data.categories || [],
    };
  } catch (err) {
    // 文件不存在时降级处理，返回空数据，避免页面崩溃
    console.warn(`[getAllCategories] Failed to load categories for locale ${locale}:`, (err as Error).message);
    return { productLines: [], categories: [] };
  }
}

/** 获取第一个分类（用于重定向） */
export async function getFirstCategory(locale: string) {
  const { categories } = await getAllCategories(locale);
  if (categories.length === 0) return null;
  return categories.sort((a: any, b: any) => a.order - b.order)[0];
}