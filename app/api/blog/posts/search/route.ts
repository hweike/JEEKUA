// app/api/blog/posts/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = parseInt(searchParams.get('size') || '12', 10);

  try {
    let query = supabase
      .from('blog_posts')
      .select(
        'id, slug, title, excerpt, featured_image, category_id, author, updated_at',
        { count: 'exact' }
      )
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .eq('visibility', 'visible');

    if (keyword) {
      query = query.ilike('title', `%${keyword}%`);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const from = (page - 1) * size;
    const to = from + size - 1;

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const items = (data || []).map((row: any) => ({
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
      total: count || 0,
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