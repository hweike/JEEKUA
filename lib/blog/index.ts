// lib/blog/index.ts
import sql from '@/lib/db/admin';
import { getPrivateStorage } from '@/lib/storage/factory';
import { upsertPost, deletePost, getPost } from './services/post.service';
import { BlogPost, BlogCategory, BlogConfig } from './types';
import { unstable_cache } from 'next/cache';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 模块级缓存：所有已发布文章的 {locale, slug} 列表
// 用于 generateStaticParams，避免反复查库
// ============================================================
let cachedAllPosts: Array<{ locale: string; slug: string }> | null = null;
let cachedAllPostsAt = 0;
const ALL_POSTS_TTL = 5 * 60 * 1000; // 5 分钟

// ============================================================
// 原始（无缓存）函数
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

// ✅ 已迁移：blog_posts 查询
export async function getBlogPosts(locale: string): Promise<BlogPost[]> {
  try {
    const data = await sql<any[]>`
      SELECT id, slug, title, excerpt, updated_at, category_id, author, featured_image
      FROM public.blog_posts
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND visibility = 'visible'
      ORDER BY updated_at DESC
    `;

    return data.map((row) => ({
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
  } catch (error) {
    console.error('Failed to fetch blog posts:', error);
    return [];
  }
}

// ✅ 已迁移：blog_posts 按分类查询
export async function getBlogPostsByCategorySlug(locale: string, categorySlug: string): Promise<BlogPost[]> {
  const category = await getBlogCategoryBySlug(locale, categorySlug);
  if (!category) return [];

  try {
    const data = await sql<any[]>`
      SELECT id, slug, title, excerpt, updated_at, category_id, author, featured_image
      FROM public.blog_posts
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND visibility = 'visible'
        AND category_id = ${category.id}
      ORDER BY updated_at DESC
    `;

    return data.map((row) => ({
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
  } catch (error) {
    console.error(`Failed to fetch blog posts for category ${categorySlug}:`, error);
    return [];
  }
}

// ✅ 已迁移：单篇 blog_posts 查询
export async function getBlogPost(locale: string, slug: string): Promise<BlogPost | null> {
  let row: any;
  try {
    const rows = await sql<any[]>`
      SELECT id, slug, title, excerpt, updated_at, category_id, author, tags
      FROM public.blog_posts
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND locale = ${locale}
        AND slug = ${slug}
        AND visibility = 'visible'
      LIMIT 1
    `;
    row = rows[0];
  } catch (error) {
    console.error('Failed to fetch blog post:', error);
    return null;
  }

  if (!row) return null;

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
 * 获取博客配置（从 settings.json 读取）
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

/**
 * 获取所有已发布文章的 {locale, slug} 列表
 * 用于 generateStaticParams 预生成
 *
 * ✅ 带模块级缓存（5 分钟 TTL），避免 generateStaticParams 反复查库
 * ✅ 保留日志，能区分"命中缓存"和"查库"
 */
export async function getAllPublishedBlogPosts(): Promise<Array<{ locale: string; slug: string }>> {
  const now = Date.now();

  // ✅ 命中缓存：打日志说明"用了缓存"
  if (cachedAllPosts && now - cachedAllPostsAt < ALL_POSTS_TTL) {
    const ageSec = Math.round((now - cachedAllPostsAt) / 1000);
    console.log(`[getAllPublishedBlogPosts] ✅ 命中缓存（${cachedAllPosts.length} 条，${ageSec}s 前查的）`);
    return cachedAllPosts;
  }

  // ✅ 未命中：打日志说明"查库了"
  console.log(`[getAllPublishedBlogPosts] ❌ 未命中，查库中...`);
  const start = Date.now();

  try {
    const rows = await sql<any[]>`
      SELECT locale, slug
      FROM public.blog_posts
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND visibility = 'visible'
      ORDER BY updated_at DESC
    `;

    const result = rows
      .filter(r => r.locale && r.slug)
      .map(r => ({ locale: r.locale, slug: r.slug }));

    const elapsed = Date.now() - start;
    console.log(`[getAllPublishedBlogPosts] ✅ 查库完成，${result.length} 条，耗时 ${elapsed}ms`);

    cachedAllPosts = result;
    cachedAllPostsAt = now;

    return result;
  } catch (error) {
    console.error('[getAllPublishedBlogPosts] 失败:', error);
    return cachedAllPosts ?? [];
  }
}

/**
 * 清空"所有已发布文章"缓存
 * 发布/删除文章后调用，让下次 generateStaticParams 拿到最新列表
 */
export function clearAllPublishedBlogPostsCache(): void {
  cachedAllPosts = null;
  cachedAllPostsAt = 0;
  console.log('[getAllPublishedBlogPosts] 缓存已清空');
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
// 保存与删除
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

  // ✅ 发布后清缓存，下次 generateStaticParams 拿到最新列表
  clearAllPublishedBlogPostsCache();
}

export async function deleteBlogPost(locale: string, id: string): Promise<void> {
  await deletePost(locale, id);

  // ✅ 删除后清缓存
  clearAllPublishedBlogPostsCache();
}

export type { BlogPost, BlogCategory, BlogConfig } from './types';