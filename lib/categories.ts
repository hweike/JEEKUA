import fs from 'fs/promises';
import path from 'path';

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

/** 获取所有分类（用于分类树） */
export async function getAllCategories(locale: string) {
  try {
    const filePath = path.join(process.cwd(), 'data', 'products', locale, 'categories.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    return {
      productLines: data.productLines || [],
      categories: data.categories || [],
    };
  } catch (err) {
    console.error('[getAllCategories] error:', err);
    return { productLines: [], categories: [] };
  }
}

/** 获取第一个分类（用于重定向） */
export async function getFirstCategory(locale: string) {
  const { categories } = await getAllCategories(locale);
  if (categories.length === 0) return null;
  return categories.sort((a: any, b: any) => a.order - b.order)[0];
}

