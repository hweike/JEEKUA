// lib/blog/services/post.service.ts
import sql from '@/lib/db/admin';
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
// Markdown 文件操作（内部，不变）
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
// 数据库操作封装（内部）— 已迁移到 sql
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

  let finalId: string;
  let created = false;

  if (id) {
    // 检查是否存在
    const existing = await sql<{ id: string }[]>`
      SELECT id FROM public.blog_posts
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
        AND locale = ${locale}
      LIMIT 1
    `;

    if (existing[0]) {
      // 更新
      await sql`
        UPDATE public.blog_posts
        SET slug = ${slug},
            title = ${title},
            excerpt = ${excerpt},
            visibility = ${visibility},
            featured_image = ${featured_image},
            author = ${author},
            category_id = ${category_id},
            tags = ${tagsString},
            template = ${template},
            seo_keywords = ${seo_keywords},
            seo_title = ${seo_title},
            seo_description = ${seo_description},
            updated_at = ${now}
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${id}
          AND locale = ${locale}
      `;
      finalId = id;
    } else {
      // 插入（指定 id）
      await sql`
        INSERT INTO public.blog_posts (
          site_id, id, locale, slug, title, excerpt, visibility,
          featured_image, author, category_id, tags, template,
          seo_keywords, seo_title, seo_description, updated_at, created_at
        ) VALUES (
          ${DEFAULT_SITE_ID}, ${id}, ${locale}, ${slug}, ${title}, ${excerpt}, ${visibility},
          ${featured_image}, ${author}, ${category_id}, ${tagsString}, ${template},
          ${seo_keywords}, ${seo_title}, ${seo_description}, ${now}, ${now}
        )
      `;
      finalId = id;
      created = true;
    }
  } else {
    // 完全新建
    const newId = generatePostId();
    await sql`
      INSERT INTO public.blog_posts (
        site_id, id, locale, slug, title, excerpt, visibility,
        featured_image, author, category_id, tags, template,
        seo_keywords, seo_title, seo_description, updated_at, created_at
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${newId}, ${locale}, ${slug}, ${title}, ${excerpt}, ${visibility},
        ${featured_image}, ${author}, ${category_id}, ${tagsString}, ${template},
        ${seo_keywords}, ${seo_title}, ${seo_description}, ${now}, ${now}
      )
    `;
    finalId = newId;
    created = true;
  }

  if (content !== undefined) {
    await saveMarkdownContent(locale, finalId, content);
  }

  return { id: finalId, created };
}

// ============================================================
// Pages 注册封装（内部，不变）
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
// 资源关联删除（内部）— 已迁移到 sql
// ============================================================
async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  try {
    await sql`
      DELETE FROM public.resource_product
      WHERE resource_type = ${resourceType}
        AND resource_id = ${resourceId}
    `;
  } catch (error) {
    console.error('删除资源关联失败:', error);
  }
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
 * 获取分页文章列表（含分类名称）— 已迁移到 sql
 */
export async function getPosts(locale: string, options: GetPostsOptions = {}) {
  const { search, category, page = 1, limit = 10 } = options;
  const offset = (page - 1) * limit;

  // 动态 WHERE 条件
  const conditions: any[] = [
    sql`site_id = ${DEFAULT_SITE_ID}`,
    sql`locale = ${locale}`,
  ];
  if (search) conditions.push(sql`title ILIKE ${'%' + search + '%'}`);
  if (category) conditions.push(sql`category_id = ${category}`);

  const whereClause = conditions.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
    sql``
  );

  const countRows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM public.blog_posts
    WHERE ${whereClause}
  `;
  const total = parseInt(countRows[0]?.count || '0', 10);

  const posts = await sql<any[]>`
    SELECT * FROM public.blog_posts
    WHERE ${whereClause}
    ORDER BY updated_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const categories = await loadCategories(locale);
  const postsWithCategoryName = posts.map(post => {
    const cat = categories.find((c: any) => c.id === post.category_id);
    return { ...post, category_name: cat ? cat.title : '' };
  });

  return {
    data: postsWithCategoryName,
    total,
    page,
    limit,
  };
}

/**
 * 获取单篇文章（含 Markdown 内容）— 已迁移到 sql
 */
export async function getPost(locale: string, id: string) {
  const rows = await sql<any[]>`
    SELECT * FROM public.blog_posts
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND id = ${id}
      AND locale = ${locale}
    LIMIT 1
  `;
  const post = rows[0];
  if (!post) return null;
  const content = await readMarkdownContent(locale, post.id);
  return { ...post, content };
}

/**
 * 批量获取多语言文章列表（不变）
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

// ============================================================
// 🔥 关键修改：创建或更新文章（Upsert），自动生成摘要
// ============================================================
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
  // ---------- 自动生成摘要 ----------
  let excerpt = postData.excerpt || '';
  if (!excerpt && content) {
    const plainText = content.replace(/<[^>]*>/g, ''); // 去除 HTML 标签
    excerpt = plainText.length > 200 ? plainText.slice(0, 200) + '...' : plainText;
  }
  const finalData = { ...postData, excerpt };
  // -------------------------------------

  const result = await upsertPostToDb(locale, postData.id, finalData, content);
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
 * 删除文章 — 已迁移到 sql
 */
export async function deletePost(locale: string, id: string) {
  // 检查是否存在
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM public.blog_posts
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND id = ${id}
      AND locale = ${locale}
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error('文章不存在');
  }

  await sql`
    DELETE FROM public.blog_posts
    WHERE site_id = ${DEFAULT_SITE_ID}
      AND id = ${id}
      AND locale = ${locale}
  `;

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
 * 批量更新博客文章翻译字段 — 已迁移到 sql
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

      // 收集更新字段
      const updateData: Record<string, any> = {};
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

      // 更新数据库字段（动态 SET）
      if (Object.keys(updateData).length > 0) {
        const setClauses: any[] = [];
        for (const [key, value] of Object.entries(updateData)) {
          // sql(key) 将列名作为标识符注入（白名单，来自代码，非用户输入）
          setClauses.push(sql`${sql(key)} = ${value}`);
        }
        setClauses.push(sql`updated_at = ${new Date().toISOString()}`);
        const setClause = setClauses.reduce(
          (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
          sql``
        );

        await sql`
          UPDATE public.blog_posts
          SET ${setClause}
          WHERE site_id = ${DEFAULT_SITE_ID}
            AND id = ${id}
            AND locale = ${targetLocale}
        `;
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