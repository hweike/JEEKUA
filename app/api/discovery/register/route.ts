import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { syncType, action, locale, data } = body;

  if (!syncType || !action || !locale) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['page', 'config'].includes(syncType)) {
    return NextResponse.json({ error: 'Invalid syncType' }, { status: 400 });
  }
  if (!['upsert', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // 处理页面同步
  if (syncType === 'page') {
    const page = data;
    if (!page?.id) {
      return NextResponse.json({ error: 'Missing page.id' }, { status: 400 });
    }

    if (action === 'upsert') {
      // 计算哈希（基于需要翻译的字段）
      const contentHash = computeHash({
        title: page.title,
        full_content: page.content_full || '',
        seo_title: page.seo_title || '',
        seo_description: page.seo_description || '',
        seo_keywords: page.seo_keywords || '',
      });

      // Upsert pages
      const { error: pageError } = await supabase
        .from('pages')
        .upsert({
          id: page.id,
          site_id: SITE_ID,
          locale: locale,
          type: page.type,
          title: page.title,
          slug: page.slug || null,
          url: page.url,
          cover_image: page.cover_image || null,
          seo_title: page.seo_title || null,
          seo_description: page.seo_description || null,
          seo_keywords: page.seo_keywords || null,
          canonical: page.canonical || null,
          noindex: page.noindex ? 1 : 0,
          nofollow: page.nofollow ? 1 : 0,
          priority: page.priority ?? 0.5,
          changefreq: page.changefreq || 'weekly',
          content_summary: page.content_summary || null,
          content_hash: contentHash,
          last_synced_at: null,
          synced_locales: null,
          source_hash: null,
          translated_by_ai: page.translated_by_ai ? 1 : 0,
          updatedAt: page.updatedAt || new Date().toISOString(),
        }, {
          onConflict: 'id, site_id, locale',
        });
      if (pageError) {
        console.error('UPSERT pages error:', pageError);
        return NextResponse.json({ error: 'Failed to upsert page' }, { status: 500 });
      }

      // Upsert page_contents
      const { error: contentError } = await supabase
        .from('page_contents')
        .upsert({
          page_id: page.id,
          site_id: SITE_ID,
          locale: locale,
          full_content: page.content_full || null,
          content_hash: contentHash,
          updatedAt: page.updatedAt || new Date().toISOString(),
        }, {
          onConflict: 'page_id, site_id, locale',
        });
      if (contentError) {
        console.error('UPSERT page_contents error:', contentError);
        return NextResponse.json({ error: 'Failed to upsert page content' }, { status: 500 });
      }
    } else if (action === 'delete') {
      // 删除 pages 记录
      const { error: pageDeleteError } = await supabase
        .from('pages')
        .delete()
        .eq('id', page.id)
        .eq('site_id', SITE_ID)
        .eq('locale', locale);
      if (pageDeleteError) {
        console.error('DELETE pages error:', pageDeleteError);
        return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
      }
      // 删除 page_contents 记录
      const { error: contentDeleteError } = await supabase
        .from('page_contents')
        .delete()
        .eq('page_id', page.id)
        .eq('site_id', SITE_ID)
        .eq('locale', locale);
      if (contentDeleteError) {
        console.error('DELETE page_contents error:', contentDeleteError);
        return NextResponse.json({ error: 'Failed to delete page content' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  // 处理站点配置同步（页头、页脚、菜单等）
  if (syncType === 'config') {
    const { id, config } = data;
    if (!id || !config) {
      return NextResponse.json({ error: 'Missing config.id or config' }, { status: 400 });
    }

    if (action === 'upsert') {
      const contentHash = computeHash(config);
      const { error: configError } = await supabase
        .from('site_configs')
        .upsert({
          id: id,
          site_id: SITE_ID,
          locale: locale,
          config: JSON.stringify(config),
          content_hash: contentHash,
          last_synced_at: null,
          synced_locales: null,
          source_hash: null,
          translated_by_ai: data.translated_by_ai ? 1 : 0,
          updatedAt: data.updatedAt || new Date().toISOString(),
        }, {
          onConflict: 'id, site_id, locale',
        });
      if (configError) {
        console.error('UPSERT site_configs error:', configError);
        return NextResponse.json({ error: 'Failed to upsert config' }, { status: 500 });
      }
    } else if (action === 'delete') {
      const { error: deleteError } = await supabase
        .from('site_configs')
        .delete()
        .eq('id', id)
        .eq('site_id', SITE_ID)
        .eq('locale', locale);
      if (deleteError) {
        console.error('DELETE site_configs error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unreachable' }, { status: 500 });
}