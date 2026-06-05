import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  const { data: rows, error } = await supabase
    .from('pages')
    .select('id, title, type, url, seo_title, seo_description, seo_keywords, noindex, updatedAt')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .order('type', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('GET /api/discovery/pages error:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }

  const pages = (rows || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    seo: {
      metaTitle: row.seo_title,
      metaDescription: row.seo_description,
      metaKeywords: row.seo_keywords,
    },
    noindex: row.noindex === 1,
    updatedAt: row.updatedAt,
  }));

  return NextResponse.json(pages);
}