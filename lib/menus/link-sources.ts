// lib/menus/link-sources.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';

export interface LinkSource {
  id: string;
  label: string;
  url: string;
  type: string;
  group: string;
}

export async function getLinkSources(locale: string = 'zh'): Promise<LinkSource[]> {
  const sources: LinkSource[] = [];

  // 私有桶存储实例
  const storage = getPrivateStorage();

  // 1. 静态页面 (data/pages.json)
  const pagesKey = 'data/pages.json';
  try {
    const pagesContent = await storage.read(pagesKey, 'utf8');
    const pages = JSON.parse(pagesContent as string);
    for (const page of pages) {
      sources.push({
        id: `page:${page.slug}`,
        label: page.title?.[locale] || page.title?.en || page.slug,
        url: `/${page.slug}`,
        type: 'page',
        group: '页面',
      });
    }
  } catch (error: any) {
    // 文件不存在则忽略（与原代码一致）
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error('读取 pages.json 失败:', error);
    }
  }

  // 2. 产品列表页（固定）
  sources.push({
    id: 'product_list',
    label: locale === 'zh' ? '所有产品' : 'All Products',
    url: '/products',
    type: 'product_list',
    group: '产品',
  });

  // 3. 产品详情页（扫描 data/products/*.md）
  const productsPrefix = 'data/products';
  try {
    // 列出 productsPrefix 下的所有文件
    const keys = await storage.list(productsPrefix);
    const mdFiles = keys.filter(key => key.endsWith('.md'));
    for (const key of mdFiles) {
      const content = await storage.read(key, 'utf8');
      const { data } = matter(content as string);
      // 从 key 中提取文件名（不含扩展名）作为 slug 后备
      const fileName = key.split('/').pop()?.replace('.md', '') || '';
      const slug = data.slug || fileName;
      const title = data.title?.[locale] || data.title || slug;
      sources.push({
        id: `product:${slug}`,
        label: title,
        url: `/products/${slug}`,
        type: 'product_detail',
        group: '产品',
      });
    }
  } catch (error: any) {
    // 如果列出目录失败，忽略（与原代码一致）
    if (!(error?.message?.includes('NoSuchKey') || error?.code === 'NoSuchKey')) {
      console.error('扫描产品目录失败:', error);
    }
  }

  // 4. 产品分类（如果 data/categories.json 存在）
  const categoriesKey = 'data/categories.json';
  try {
    const categoriesContent = await storage.read(categoriesKey, 'utf8');
    const categories = JSON.parse(categoriesContent as string);
    for (const cat of categories) {
      sources.push({
        id: `category:${cat.slug}`,
        label: cat.name?.[locale] || cat.name,
        url: `/categories/${cat.slug}`,
        type: 'category',
        group: '分类',
      });
    }
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error('读取 categories.json 失败:', error);
    }
  }

  return sources;
}