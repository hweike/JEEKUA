// lib/menus/link-sources.ts
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface LinkSource {
  id: string;
  label: string;
  url: string;
  type: string;
  group: string;
}

export async function getLinkSources(locale: string = 'zh'): Promise<LinkSource[]> {
  const sources: LinkSource[] = [];

  // 1. 静态页面 (data/pages.json)
  const pagesPath = path.join(process.cwd(), 'data', 'pages.json');
  try {
    const pagesContent = await fs.readFile(pagesPath, 'utf-8');
    const pages = JSON.parse(pagesContent);
    for (const page of pages) {
      sources.push({
        id: `page:${page.slug}`,
        label: page.title?.[locale] || page.title?.en || page.slug,
        url: `/${page.slug}`,
        type: 'page',
        group: '页面',
      });
    }
  } catch (err) {
    // 文件不存在则忽略
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
  const productsDir = path.join(process.cwd(), 'data', 'products');
  try {
    const files = await fs.readdir(productsDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(productsDir, file), 'utf-8');
      const { data } = matter(content);
      const slug = data.slug || file.replace('.md', '');
      const title = data.title?.[locale] || data.title || slug;
      sources.push({
        id: `product:${slug}`,
        label: title,
        url: `/products/${slug}`,
        type: 'product_detail',
        group: '产品',
      });
    }
  } catch (err) {}

  // 4. 产品分类（如果 data/categories.json 存在）
  const categoriesPath = path.join(process.cwd(), 'data', 'categories.json');
  try {
    const categoriesContent = await fs.readFile(categoriesPath, 'utf-8');
    const categories = JSON.parse(categoriesContent);
    for (const cat of categories) {
      sources.push({
        id: `category:${cat.slug}`,
        label: cat.name?.[locale] || cat.name,
        url: `/categories/${cat.slug}`,
        type: 'category',
        group: '分类',
      });
    }
  } catch (err) {}

  return sources;
}