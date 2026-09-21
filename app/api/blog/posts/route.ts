// app/api/blog/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 缓存 5 分钟
const postsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const locale = searchParams.get('locale') || 'zh';

  const cacheKey = `blog-posts:${locale}:${category || 'all'}`;

  // 1. 命中缓存
  const cached = postsCache.get<{ posts: any[] }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. 查库
  try {
    let query = supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, updated_at, category_id, author, featured_image')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .eq('visibility', 'visible');

    if (category) {
      query = query.eq('category_id', category);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch blog posts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = (data || []).map((row) => ({
      slug: row.slug,
      title: row.title || '无标题',
      date: row.updated_at || new Date().toISOString(),
      category: row.category_id || 'uncategorized',
      author: row.author || '',
      excerpt: row.excerpt || '',
      image: row.featured_image || '',
    }));

    const result = { posts };
    postsCache.set(cacheKey, result);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[API] Failed to get blog posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}