// lib/blog/services/post.service.ts
import { supabase } from '@/lib/supabase/client';
import { getPrivateStorage } from '@/lib/storage/factory';
import { generatePostId } from '@/lib/generateId';
import { getCategories } from './category.service';
import { registerEntity } from '@/lib/discovery/services/business-register-pages.service';
import { deletePage } from '@/lib/discovery/register';
import type { PageData } from '@/lib/discovery/register';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ============================================================
// 分类缓存（复用 category service）
// ============================================================
let categoriesCache: { [locale: string]: { data: any[]; timestamp: number } } = {};
const CACHE_TTL = 60 * 1000;

async function loadCategories(locale: string) {
  const now = Date.now();
  if (categoriesCache[locale] && now - categoriesCache[locale].timestamp < CACHE_TTL) {
    return categoriesCache[locale].data;
  }
  const data = await getCategories(locale);
  categoriesCache[locale] = { data, timestamp: now };
  return data;
}

// ============================================================
// Markdown 文件操作（内部）
// ============================================================
function getMarkdownKey(locale: string, postId: string): string {
  return `data/blog/${locale}/posts/${postId}.md`;
}

async function readMarkdownContent(locale: string, postId: string): Promise<string> {
  const storage = getPrivateStorage();
  const key = getMarkdownKey(locale, postId);
  try {
    const content = await storage.read(key, 'utf8');
    return content as string;
  } catch {
    return '';
  }
}

async function saveMarkdownContent(locale: string, postId: string, content: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getMarkdownKey(locale, postId);
  await storage.write(key, content || '', { contentType: 'text/markdown' });
}

async function deleteMarkdownContent(locale: string, postId: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getMarkdownKey(locale, postId);
  try {
    await storage.delete(key);
  } catch (error: any) {
    if (!error?.message?.includes('NoSuchKey')) {
      console.error(`删除 Markdown 文件失败: ${key}`, error);
    }
  }
}

// ============================================================
// 数据库操作封装（内部）
// ============================================================
async function upsertPostToDb(
  locale: string,
  id: string | undefined,
  data: {
    slug: string;
    title: string;
    excerpt?: string;
    visibility?: string;
    featured_image?: string;
    author?: string;
    category_id?: string;
    tags?: string | string[];
    template?: string;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
  },
  content?: string
): Promise<{ id: string; created: boolean }> {
  const {
    slug, title, excerpt = '', visibility = 'visible',
    featured_image = '', author = '', category_id = '',
    tags = [], template = '', seo_keywords = '', seo_title = '', seo_description = ''
  } = data;

  const now = new Date().toISOString();
  const tagsString = typeof tags === 'string' ? tags : JSON.stringify(tags);

  const basePost = {
    slug,
    title,
    excerpt,
    visibility,
    featured_image,
    author,
    category_id,
    tags: tagsString,
    template,
    seo_keywords,
    seo_title,
    seo_description,
    updated_at: now,
  };

  let finalId: string;
  let created = false;

  if (id) {
    // 检查是否存在
    const { data: existing, error: findError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .eq('locale', locale)
      .maybeSingle();
    if (findError) throw findError;

    if (existing) {
      // 更新
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update(basePost)
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('id', id)
        .eq('locale', locale);
      if (updateError) throw updateError;
      finalId = id;
    } else {
      // 插入（指定 id）
      const { error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          site_id: DEFAULT_SITE_ID,
          id: id,
          locale,
          ...basePost,
          created_at: now,
        });
      if (insertError) throw insertError;
      finalId = id;
      created = true;
    }
  } else {
    // 完全新建
    const newId = generatePostId();
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        site_id: DEFAULT_SITE_ID,
        id: newId,
        locale,
        ...basePost,
        created_at: now,
      });
    if (insertError) throw insertError;
    finalId = newId;
    created = true;
  }

  if (content !== undefined) {
    await saveMarkdownContent(locale, finalId, content);
  }

  return { id: finalId, created };
}

// ============================================================
// Pages 注册封装（内部）
// ============================================================
async function registerPostToPages(
  locale: string,
  post: { id: string; title: string; slug: string; excerpt?: string; featured_image?: string; seo_title?: string; seo_description?: string; seo_keywords?: string },
  content?: string,
  updatedAt?: string
): Promise<void> {
  const now = updatedAt || new Date().toISOString();
  const pageData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    featured_image: post.featured_image || '',
    seo_title: post.seo_title || '',
    seo_description: post.seo_description || '',
    seo_keywords: post.seo_keywords || '',
    content_full: content || '',
    updated_at: now,
  };
  registerEntity({
    type: 'blogPost',
    id: post.id,
    locale,
    data: pageData,
    updatedAt: now,
  }).catch(err => console.error(`注册/更新博客文章失败 (${post.id}):`, err));
}

// ============================================================
// 资源关联删除（内部）
// ============================================================
async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  const { error } = await supabase
    .from('resource_product')
    .delete()
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);
  if (error) console.error('删除资源关联失败:', error);
}

// ============================================================
// 导出服务函数
// ============================================================

export interface GetPostsOptions {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

/**
 * 获取分页文章列表（含分类名称）
 */
export async function getPosts(locale: string, options: GetPostsOptions = {}) {
  const { search, category, page = 1, limit = 10 } = options;
  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale);

  if (search) query = query.ilike('title', `%${search}%`);
  if (category) query = query.eq('category_id', category);

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data: posts, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const categories = await loadCategories(locale);
  const postsWithCategoryName = (posts || []).map(post => {
    const cat = categories.find((c: any) => c.id === post.category_id);
    return { ...post, category_name: cat ? cat.title : '' };
  });

  return {
    data: postsWithCategoryName,
    total: count || 0,
    page,
    limit,
  };
}

/**
 * 获取单篇文章（含 Markdown 内容）
 */
export async function getPost(locale: string, id: string) {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  if (error) throw error;
  if (!post) return null;
  const content = await readMarkdownContent(locale, post.id);
  return { ...post, content };
}

/**
 * 批量获取多语言文章列表
 */
export async function getPostsBatch(locales: string[]) {
  const result: Record<string, any[]> = {};
  await Promise.all(locales.map(async (loc) => {
    try {
      const list = await getPosts(loc, { page: 1, limit: 9999 });
      result[loc] = list.data;
    } catch (e) {
      console.error(`获取 ${loc} 文章失败:`, e);
      result[loc] = [];
    }
  }));
  return result;
}

/**
 * 创建或更新文章（Upsert）
 */
export async function upsertPost(
  locale: string,
  postData: {
    id?: string;
    slug: string;
    title: string;
    excerpt?: string;
    visibility?: string;
    featured_image?: string;
    author?: string;
    category_id?: string;
    tags?: string[] | string;
    template?: string;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
  },
  content?: string
): Promise<{ id: string; created: boolean }> {
  const result = await upsertPostToDb(locale, postData.id, postData, content);
  // 注册到 pages
  const finalPost = await getPost(locale, result.id);
  if (finalPost) {
    await registerPostToPages(locale, finalPost, content || finalPost.content, finalPost.updated_at);
  }
  return result;
}

/**
 * 复制文章（跨语言）
 */
export async function copyPost(sourceLocale: string, targetLocale: string, id: string) {
  if (sourceLocale === targetLocale) {
    throw new Error('源语言和目标语言不能相同');
  }

  // 查询源文章
  const sourcePost = await getPost(sourceLocale, id);
  if (!sourcePost) throw new Error('源文章不存在');

  // 读取源 Markdown
  const sourceContent = await readMarkdownContent(sourceLocale, id);

  // 使用 upsertPostToDb 直接写入目标
  const { id: targetId } = await upsertPostToDb(
    targetLocale,
    id, // 指定相同 ID
    {
      slug: sourcePost.slug,
      title: sourcePost.title,
      excerpt: sourcePost.excerpt || '',
      visibility: sourcePost.visibility || 'visible',
      featured_image: sourcePost.featured_image || '',
      author: sourcePost.author || '',
      category_id: sourcePost.category_id || '',
      tags: sourcePost.tags || '[]',
      template: sourcePost.template || '',
      seo_keywords: sourcePost.seo_keywords || '',
      seo_title: sourcePost.seo_title || '',
      seo_description: sourcePost.seo_description || '',
    },
    sourceContent
  );

  // 注册到 pages
  const finalTarget = await getPost(targetLocale, targetId);
  if (finalTarget) {
    await registerPostToPages(targetLocale, finalTarget, sourceContent, finalTarget.updated_at);
  }

  return { success: true };
}

/**
 * 删除文章
 */
export async function deletePost(locale: string, id: string) {
  // 检查是否存在
  const { data: existing, error: findError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  if (findError || !existing) {
    throw new Error('文章不存在');
  }

  const { error: deleteError } = await supabase
    .from('blog_posts')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale);
  if (deleteError) throw deleteError;

  await deleteMarkdownContent(locale, id);
  await deleteResourceAssociations('blog', id);

  // 删除 pages 记录
  const pageId = `blogPost:${id}`;
  try {
    await deletePage(pageId, locale);
  } catch (err) {
    console.error(`删除博客文章 pages 失败 (${pageId}):`, err);
  }
}

/**
 * 批量更新博客文章翻译字段
 */
export async function updatePostTranslations(
  targetLocale: string,
  translations: Array<{
    id: string;
    title?: string;
    content?: string;
    excerpt?: string;
    seo_keywords?: string;
    seo_title?: string;
    seo_description?: string;
    tags?: string[] | string;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { id, title, content, excerpt, seo_keywords, seo_title, seo_description, tags } = trans;

    try {
      // 检查目标是否存在
      let targetPost = await getPost(targetLocale, id);

      // 如果目标不存在且提供了源语言，则复制
      if (!targetPost && sourceLocale) {
        await copyPost(sourceLocale, targetLocale, id);
        targetPost = await getPost(targetLocale, id);
      }

      if (!targetPost) {
        errors.push(`文章 ${id} 在目标语言中不存在且无法创建`);
        failed++;
        continue;
      }

      // 更新字段
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (seo_keywords !== undefined) updateData.seo_keywords = seo_keywords;
      if (seo_title !== undefined) updateData.seo_title = seo_title;
      if (seo_description !== undefined) updateData.seo_description = seo_description;
      if (tags !== undefined) {
        updateData.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
      }

      // 如果有内容更新，保存 Markdown
      let newContent = targetPost.content;
      if (content !== undefined) {
        newContent = content;
        await saveMarkdownContent(targetLocale, id, newContent);
      }

      // 更新数据库字段
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq('site_id', DEFAULT_SITE_ID)
          .eq('id', id)
          .eq('locale', targetLocale);
        if (updateError) throw updateError;
      }

      // 重新注册到 pages
      const finalPost = await getPost(targetLocale, id);
      if (finalPost) {
        await registerPostToPages(targetLocale, finalPost, newContent, finalPost.updated_at);
      }

      success++;
    } catch (err: any) {
      errors.push(`处理文章 ${id} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}