// app/api/blog/posts/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = parseInt(searchParams.get('size') || '12', 10);

  try {
    // 动态 WHERE
    const conditions: any[] = [
      sql`site_id = ${DEFAULT_SITE_ID}`,
      sql`locale = ${locale}`,
      sql`visibility = 'visible'`,
    ];
    if (keyword) {
      conditions.push(sql`title ILIKE ${'%' + keyword + '%'}`);
    }
    if (categoryId) {
      conditions.push(sql`category_id = ${categoryId}`);
    }
    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    const offset = (page - 1) * size;

    // 总数
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.blog_posts
      WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    // 数据
    const data = await sql<any[]>`
      SELECT id, slug, title, excerpt, featured_image, category_id, author, updated_at
      FROM public.blog_posts
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ${size} OFFSET ${offset}
    `;

    const items = data.map((row: any) => ({
      id: row.id,
      slug: row.slug || '',
      title: row.title || '',
      excerpt: row.excerpt || '',
      featuredImage: row.featured_image || '',
      categoryId: row.category_id || '',
      author: row.author || '',
      updatedAt: row.updated_at || '',
    }));

    return NextResponse.json({
      items,
      total,
      page,
      size,
    });
  } catch (error) {
    console.error('[api/blog/posts/search] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', items: [], total: 0 },
      { status: 500 }
    );
  }
}