// lib/blog/index.ts
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';

export interface BlogCategory {
  slug: string;
  name_zh: string;
  name_en: string;
  name_de: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  author?: string;
  excerpt?: string;
  videoUrl?: string;
  content: string;
  tags?: string[];
  seo?: any;
}

// 获取所有分类（从 data/blog/{locale}/categories.json 读取）
export function getBlogCategories(locale: string): { slug: string; name: string }[] {
  const categoriesPath = path.join(process.cwd(), 'data', 'blog', locale, 'categories.json');
  if (!fs.existsSync(categoriesPath)) return [];
  const categories: any[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  return categories.map(cat => ({
    slug: cat.slug,
    name: cat.title || cat.slug,   // ✅ 使用 title 字段作为显示名称
  }));
}

// 获取所有文章（仅元数据，用于列表页）
export function getBlogPosts(locale: string): BlogPost[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT slug, title, excerpt, updated_at, category_id, author, featured_image
    FROM blog_posts
    WHERE locale = ? AND visibility = 'visible'
    ORDER BY updated_at DESC
  `).all(locale) as any[];

  return rows.map(row => ({
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || 'uncategorized',
    author: row.author || '',
    excerpt: row.excerpt || '',
    image: row.featured_image || '',  // 新增图片字段
    content: '',
    videoUrl: '',
    seo: null,
  }));
}


// 获取单篇文章（包含全文、标签、关联数据）
export function getBlogPost(locale: string, slug: string): BlogPost | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, slug, title, excerpt, updated_at, category_id, author, tags
    FROM blog_posts
    WHERE locale = ? AND slug = ? AND visibility = 'visible'
  `).get(locale, slug) as any;

  if (!row) return null;

  // ========== 健壮解析 tags ==========
  let tags: string[] = [];
  const rawTags = row.tags;
  if (rawTags) {
    if (typeof rawTags === 'string') {
      const trimmed = rawTags.trim();
      if (trimmed === '') {
        tags = [];
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        // 尝试解析为 JSON 数组
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            tags = parsed.filter(t => typeof t === 'string' && t.trim().length > 0);
          } else if (typeof parsed === 'string') {
            tags = [parsed];
          }
        } catch {
          // JSON 解析失败，按逗号分隔
          tags = trimmed.split(',').map(t => t.trim()).filter(t => t);
        }
      } else {
        // 普通字符串，按逗号分隔
        tags = trimmed.split(',').map(t => t.trim()).filter(t => t);
      }
    } else if (Array.isArray(rawTags)) {
      tags = rawTags.filter(t => typeof t === 'string' && t.trim().length > 0);
    }
  }
  // 最终保证 tags 总是数组，且不含空字符串
  tags = tags.filter(t => t && t !== '[]');

  // ========== 读取 Markdown 正文 ==========
  const filePath = path.join(process.cwd(), 'data', 'blog', locale, `${row.id}.md`);
  let content = '';
  try {
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      console.warn(`Markdown file not found: ${filePath}`);
    }
  } catch (e) {
    console.error(`Failed to read ${filePath}`, e);
  }

  return {
    id: row.id.toString(),
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || 'uncategorized',
    author: row.author || '',
    excerpt: row.excerpt || '',
    videoUrl: '',
    content,
    tags,               // 现在一定是干净的字符串数组
    seo: null,
  };
}



// 根据分类 slug 获取分类信息（含 id, slug, name）
export function getBlogCategoryBySlug(locale: string, slug: string): { id: string; slug: string; name: string } | null {
  const categoriesPath = path.join(process.cwd(), 'data', 'blog', locale, 'categories.json');
  if (!fs.existsSync(categoriesPath)) return null;
  const categories: any[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const cat = categories.find(c => c.slug === slug);
  if (!cat) return null;
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.title || cat.slug,
  };
}

// 根据分类 slug 获取该分类下的所有文章（仅元数据，不含正文）
export function getBlogPostsByCategorySlug(locale: string, categorySlug: string): BlogPost[] {
  const category = getBlogCategoryBySlug(locale, categorySlug);
  if (!category) return [];

  const db = getDb();
  const rows = db.prepare(`
    SELECT slug, title, excerpt, updated_at, category_id, author
    FROM blog_posts
    WHERE locale = ? AND visibility = 'visible' AND category_id = ?
    ORDER BY updated_at DESC
  `).all(locale, category.id) as any[];

  return rows.map(row => ({
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || '',
    author: row.author || '',
    excerpt: row.excerpt || '',
    videoUrl: '',
    content: '',
    seo: null,
  }));
}

// 保存文章（供后台使用，根据实际 API 补充）
export async function saveBlogPost(locale: string, slug: string, data: any, content: string) {
  // 请根据您的后台实现填写
}

// 删除文章（供后台使用）
export function deleteBlogPost(locale: string, slug: string) {
  // 请根据您的后台实现填写
}