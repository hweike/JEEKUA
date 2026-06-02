import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveMarkdownContent, readMarkdownContent, deleteMarkdownContent } from '@/lib/blog/blogStorage';
import { generatePostId } from '@/lib/generateId';
import { deleteResourceAssociations } from '@/lib/products/resourceRelations';   // 新增导入

const db = getDb();

let categoriesCache: { [locale: string]: { data: any[]; timestamp: number } } = {};
const CACHE_TTL = 60 * 1000;

async function loadCategories(locale: string) {
  const now = Date.now();
  if (categoriesCache[locale] && now - categoriesCache[locale].timestamp < CACHE_TTL) {
    return categoriesCache[locale].data;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'data/blog', locale, 'categories.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    categoriesCache[locale] = { data, timestamp: now };
    return data;
  } catch {
    return [];
  }
}

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
    const post = db.prepare(`
      SELECT * FROM blog_posts WHERE id = ? AND locale = ?
    `).get(id, locale) as any;
    if (!post) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }
    const content = await readMarkdownContent(locale, post.id);
    return NextResponse.json({ ...post, content: content || '' });
  }

  let query = 'SELECT * FROM blog_posts WHERE locale = ?';
  const params: any[] = [locale];

  if (search) {
    query += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  if (category) {
    query += ' AND category_id = ?';
    params.push(category);
  }

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  const offset = (page - 1) * limit;
  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const posts = db.prepare(query).all(...params);
  const categories = await loadCategories(locale);
  const postsWithCategoryName = posts.map(post => {
    const cat = categories.find((c: any) => c.id === post.category_id);
    return { ...post, category_name: cat ? cat.title : '' };
  });

  return NextResponse.json({
    data: postsWithCategoryName,
    total,
    page,
    limit,
  });
}

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
    const existing = db.prepare('SELECT id FROM blog_posts WHERE id = ? AND locale = ?').get(id, locale);
    if (!existing) {
      return NextResponse.json({ error: '文章不存在' }, { status: 404 });
    }

    db.prepare(`
      UPDATE blog_posts SET
        slug = ?, title = ?, excerpt = ?, visibility = ?, featured_image = ?,
        author = ?, category_id = ?, tags = ?, template = ?, seo_keywords = ?,
        seo_title = ?, seo_description = ?, updated_at = ?
      WHERE id = ? AND locale = ?
    `).run(
      slug, title, excerpt, visibility, featured_image, author, category_id,
      JSON.stringify(tags || []), template, seo_keywords, seo_title, seo_description,
      now, id, locale
    );

    if (hasContent) {
      await saveMarkdownContent(locale, id, content || '');
    }
    return NextResponse.json({ success: true });
  } else {
    const newId = generatePostId();
    db.prepare(`
      INSERT INTO blog_posts (
        id, locale, slug, title, excerpt, visibility, featured_image,
        author, category_id, tags, template, seo_keywords, seo_title, seo_description,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId, locale, slug, title, excerpt, visibility, featured_image,
      author, category_id, JSON.stringify(tags || []), template, seo_keywords, seo_title, seo_description,
      now, now
    );

    await saveMarkdownContent(locale, newId, content || '');
    return NextResponse.json({ id: newId, success: true });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  const post = db.prepare('SELECT id FROM blog_posts WHERE id = ? AND locale = ?').get(id, locale);
  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  // 1. 删除博客文章本身
  db.prepare('DELETE FROM blog_posts WHERE id = ? AND locale = ?').run(id, locale);
  await deleteMarkdownContent(locale, id);

  // 2. 删除该博客与产品的所有关联记录
  await deleteResourceAssociations('blog', id);

  return NextResponse.json({ success: true });
}