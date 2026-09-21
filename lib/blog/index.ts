// lib/blog/index.ts
import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';
import { upsertPost, deletePost, getPost } from './services/post.service';
import { BlogPost, BlogCategory, BlogConfig } from './types';
import { unstable_cache } from 'next/cache';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 原始（无缓存）函数 – 保持向后兼容
// ============================================================

export async function getBlogCategories(locale: string): Promise<BlogCategory[]> {
  const storage = getPrivateStorage();
  const key = `blog/${locale}/categories.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const categories: any[] = JSON.parse(content as string);
    if (!categories || !Array.isArray(categories)) {
      console.warn(`Invalid categories data for locale: ${locale}`);
      return [];
    }
    return categories.map((cat: any) => ({
      id: cat.id || cat.slug,
      slug: cat.slug || cat.id,
      name: cat.name || cat.title || cat.slug || '未命名',
      // 可扩展其他字段（如 seoTitle, image 等）
    }));
  } catch (error) {
    console.warn(`Failed to load categories from storage: ${key}`, error);
    return [];
  }
}

export async function getBlogCategoryBySlug(
  locale: string,
  slug: string
): Promise<BlogCategory | null> {
  const categories = await getBlogCategories(locale);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return null;
  return cat;
}

export async function getBlogPosts(locale: string): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, updated_at, category_id, author, featured_image')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visibility', 'visible')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch blog posts:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
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

export async function getBlogPostsByCategorySlug(locale: string, categorySlug: string): Promise<BlogPost[]> {
  const category = await getBlogCategoryBySlug(locale, categorySlug);
  if (!category) return [];

  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, updated_at, category_id, author, featured_image')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale)
    .eq('visibility', 'visible')
    .eq('category_id', category.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(`Failed to fetch blog posts for category ${categorySlug}:`, error);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || '',
    author: row.author || '',
    excerpt: row.excerpt || '',
    image: row.featured_image || '',
    content: '',
    videoUrl: '',
    seo: null,
  }));
}

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

  const fullPost = await getPost(locale, row.id);
  if (!fullPost) return null;

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

  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title || '无标题',
    date: row.updated_at || new Date().toISOString(),
    category: row.category_id || 'uncategorized',
    author: row.author || '',
    excerpt: row.excerpt || '',
    videoUrl: '',
    content: fullPost.content || '',
    tags,
    seo: null,
  };
}

/**
 * 获取博客配置（从 settings.json 读取，若无则返回默认值）
 */
export async function getBlogConfig(locale: string): Promise<BlogConfig> {
  const storage = getPrivateStorage();
  const key = `blog/${locale}/settings.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return {
      name: parsed.name || '博客',
      tagline: parsed.tagline || '',
      image: parsed.image || '',
      seoTitle: parsed.seoTitle || '',
      seoDescription: parsed.seoDescription || '',
      seoKeywords: parsed.seoKeywords || '',
    };
  } catch {
    // 文件不存在，返回默认配置
    return {
      name: '博客',
      tagline: '',
      image: '',
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    };
  }
}

// ============================================================
// 缓存版本（使用 unstable_cache）
// ============================================================

export const getCachedBlogConfig = unstable_cache(
  async (locale: string) => getBlogConfig(locale),
  ['blog-config'],
  { revalidate: 3600 }
);

export const getCachedBlogCategories = unstable_cache(
  async (locale: string) => getBlogCategories(locale),
  ['blog-categories'],
  { revalidate: 3600 }
);

export const getCachedBlogPosts = unstable_cache(
  async (locale: string) => getBlogPosts(locale),
  ['blog-posts'],
  { revalidate: 3600 }
);

export const getCachedBlogPostsByCategorySlug = unstable_cache(
  async (locale: string, categorySlug: string) => getBlogPostsByCategorySlug(locale, categorySlug),
  ['blog-posts-by-category'],
  { revalidate: 3600 }
);

export const getCachedBlogPost = unstable_cache(
  async (locale: string, slug: string) => getBlogPost(locale, slug),
  ['blog-post'],
  { revalidate: 3600 }
);

// ============================================================
// 保存与删除（复用 post.service）
// ============================================================

export async function saveBlogPost(locale: string, data: any, content: string): Promise<void> {
  let excerpt = data.excerpt || '';
  if (!excerpt && content) {
    const plainText = content.replace(/<[^>]*>/g, '');
    excerpt = plainText.length > 200 ? plainText.slice(0, 200) + '...' : plainText;
  }

  await upsertPost(locale, {
    id: data.id,
    slug: data.slug,
    title: data.title,
    excerpt,
    visibility: data.visibility || 'visible',
    featured_image: data.featured_image || '',
    author: data.author || '',
    category_id: data.category_id || '',
    tags: data.tags || [],
    template: data.template || 'default',
    seo_keywords: data.seo_keywords || '',
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
  }, content);
}

export async function deleteBlogPost(locale: string, id: string): Promise<void> {
  await deletePost(locale, id);
}

// 导出类型
export type { BlogPost, BlogCategory, BlogConfig } from './types';