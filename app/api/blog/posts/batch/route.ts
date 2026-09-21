// app/api/blog/posts/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, locale = 'zh' } = body as { ids: string[]; locale?: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 限制单次最多 50 个
    const safeIds = ids.slice(0, 50);

    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id, slug, title, excerpt, featured_image, category_id, author, updated_at'
      )
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .in('id', safeIds);

    if (error) throw error;

    const rowsMap = new Map((data || []).map((r: any) => [r.id, r]));

    // 按传入顺序返回
    const items = safeIds
      .map((id) => rowsMap.get(id))
      .filter(Boolean)
      .map((row: any) => ({
        id: row.id,
        slug: row.slug || '',
        title: row.title || '',
        excerpt: row.excerpt || '',
        featuredImage: row.featured_image || '',
        categoryId: row.category_id || '',
        author: row.author || '',
        updatedAt: row.updated_at || '',
      }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[api/blog/posts/batch] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', items: [] },
      { status: 500 }
    );
  }
}