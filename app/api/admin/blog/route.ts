// app/api/admin/blog/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { generatePostId } from '@/lib/generateId';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 分类缓存（保持不变，但数据来源改为云存储）
let categoriesCache: { [locale: string]: { data: any[]; timestamp: number } } = {};
const CACHE_TTL = 60 * 1000;

/**
 * 从私有桶加载分类数据
 * 存储路径：data/blog/{locale}/categories.json
 */
async function loadCategories(locale: string) {
  const now = Date.now();
  if (categoriesCache[locale] && now - categoriesCache[locale].timestamp < CACHE_TTL) {
    return categoriesCache[locale].data;
  }

  const storage = getPrivateStorage();
  const key = `data/blog/${locale}/categories.json`;

  try {
    const content = await storage.read(key, 'utf8');
    const data = JSON.parse(content as string);
    categoriesCache[locale] = { data, timestamp: now };
    return data;
  } catch (error: any) {
    // 文件不存在，返回空数组
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      categoriesCache[locale] = { data: [], timestamp: now };
      return [];
    }
    console.error(`加载分类失败 [${locale}]:`, error);
    return [];
  }
}

/**
 * 删除资源关联（blog 与 product 的关联）
 */
async function deleteResourceAssociations(resourceType: string, resourceId: string) {
  const { error } = await supabase
    .from('resource_product')
    .delete()
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId);
  if (error) console.error('删除资源关联失败:', error);
}

/**
 * 获取 Markdown 文件在私有桶中的 key
 */
function getMarkdownKey(locale: string, postId: string): string {
  return `data/blog/${locale}/posts/${postId}.md`;
}

/**
 * 读取 Markdown 内容
 */
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

/**
 * 保存 Markdown 内容
 */
async function saveMarkdownContent(locale: string, postId: string, content: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getMarkdownKey(locale, postId);
  await storage.write(key, content, { contentType: 'text/markdown' });
}

/**
 * 删除 Markdown 文件
 */
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

// GET: 获取文章列表或单篇文章
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!locale) {
    return NextResponse.json({ error: '缺少 locale 参数' }, { status: 400 });
  }

  if (id) {
    // 获取单篇文章
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .eq('locale', locale)
      .maybeSingle();
    if (error || !post) {
      console.error('查询文章失败:', error);
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    const content = await readMarkdownContent(locale, post.id);
    return NextResponse.json({ ...post, content: content || '' });
  }

  // 列表查询
  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('locale', locale);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  if (category) {
    query = query.eq('category_id', category);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data: posts, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('查询文章列表失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }

  const categories = await loadCategories(locale);
  const postsWithCategoryName = (posts || []).map(post => {
    const cat = categories.find((c: any) => c.id === post.category_id);
    return { ...post, category_name: cat ? cat.title : '' };
  });

  return NextResponse.json({
    data: postsWithCategoryName,
    total: count || 0,
    page,
    limit,
  });
}

// POST: 创建或更新文章
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    id, locale, slug, title, excerpt, content, visibility, featured_image,
    author, category_id, tags, template, seo_keywords, seo_title, seo_description
  } = body;

  if (!locale || !title || !slug) {
    return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const hasContent = 'content' in body;

  if (id) {
    // 更新现有文章
    const { data: existing, error: findError } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .eq('locale', locale)
      .maybeSingle();
    if (findError || !existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        slug,
        title,
        excerpt,
        visibility,
        featured_image,
        author,
        category_id,
        tags: JSON.stringify(tags || []),
        template,
        seo_keywords,
        seo_title,
        seo_description,
        updated_at: now,
      })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', id)
      .eq('locale', locale);

    if (updateError) {
      console.error('更新文章失败:', updateError);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (hasContent) {
      await saveMarkdownContent(locale, id, content || '');
    }
    return NextResponse.json({ success: true });
  } else {
    // 创建新文章
    const newId = generatePostId();
    const { error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        site_id: DEFAULT_SITE_ID,
        id: newId,
        locale,
        slug,
        title,
        excerpt,
        visibility: visibility || 'visible',
        featured_image: featured_image || '',
        author: author || '',
        category_id: category_id || '',
        tags: JSON.stringify(tags || []),
        template: template || '',
        seo_keywords: seo_keywords || '',
        seo_title: seo_title || '',
        seo_description: seo_description || '',
        created_at: now,
        updated_at: now,
      });

    if (insertError) {
      console.error('创建文章失败:', insertError);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    await saveMarkdownContent(locale, newId, content || '');
    return NextResponse.json({ id: newId, success: true });
  }
}

// DELETE: 删除文章
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  // 检查文章是否存在
  const { data: existing, error: findError } = await supabase
    .from('blog_posts')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale)
    .maybeSingle();
  if (findError || !existing) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  // 删除数据库记录
  const { error: deleteError } = await supabase
    .from('blog_posts')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .eq('locale', locale);
  if (deleteError) {
    console.error('删除文章失败:', deleteError);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }

  // 删除 Markdown 文件
  await deleteMarkdownContent(locale, id);

  // 删除关联的产品关系
  await deleteResourceAssociations('blog', id);

  return NextResponse.json({ success: true });
}