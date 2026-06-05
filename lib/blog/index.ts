import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

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
  image?: string;
}

// 获取所有分类（从 data/blog/{locale}/categories.json 读取）
export function getBlogCategories(locale: string): { slug: string; name: string }[] {
  const categoriesPath = path.join(process.cwd(), 'data', 'blog', locale, 'categories.json');
  if (!fs.existsSync(categoriesPath)) return [];
  const categories: any[] = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  return categories.map(cat => ({
    slug: cat.slug,
    name: cat.title || cat.slug,
  }));
}

// 获取所有文章（仅元数据，用于列表页）
export async function getBlogPosts(locale: string): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, updated_at, category_id, author, featured_image')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visibility', 'visible')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch blog posts:', error);
    return [];
  }

  return (data || []).map(row => ({
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || 'uncategorized',
    author: row.author || '',
    excerpt: row.excerpt || '',
    image: row.featured_image || '',
    content: '',
    videoUrl: '',
    seo: null,
  }));
}

// 获取单篇文章（包含全文、标签、关联数据）
export async function getBlogPost(locale: string, slug: string): Promise<BlogPost | null> {
  const { data: row, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, updated_at, category_id, author, tags')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('slug', slug)
    .eq('visibility', 'visible')
    .maybeSingle();

  if (error || !row) {
    if (error) console.error('Failed to fetch blog post:', error);
    return null;
  }

  // 解析 tags（兼容旧数据格式）
  let tags: string[] = [];
  const rawTags = row.tags;
  if (rawTags) {
    if (typeof rawTags === 'string') {
      const trimmed = rawTags.trim();
      if (trimmed === '') {
        tags = [];
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            tags = parsed.filter(t => typeof t === 'string' && t.trim().length > 0);
          } else if (typeof parsed === 'string') {
            tags = [parsed];
          }
        } catch {
          tags = trimmed.split(',').map(t => t.trim()).filter(t => t);
        }
      } else {
        tags = trimmed.split(',').map(t => t.trim()).filter(t => t);
      }
    } else if (Array.isArray(rawTags)) {
      tags = rawTags.filter(t => typeof t === 'string' && t.trim().length > 0);
    }
  }
  tags = tags.filter(t => t && t !== '[]');

  // 读取 Markdown 正文（文件系统）
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
    tags,
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
export async function getBlogPostsByCategorySlug(locale: string, categorySlug: string): Promise<BlogPost[]> {
  const category = getBlogCategoryBySlug(locale, categorySlug);
  if (!category) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, updated_at, category_id, author')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visibility', 'visible')
    .eq('category_id', category.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(`Failed to fetch blog posts for category ${categorySlug}:`, error);
    return [];
  }

  return (data || []).map(row => ({
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
  // 这里仅留空，保持签名兼容
}

// 删除文章（供后台使用）
export async function deleteBlogPost(locale: string, slug: string) {
  // 请根据您的后台实现填写
}