import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get('source') || 'zh';
  const targets = searchParams.get('targets')?.split(',') || [];
  const types = searchParams.get('types')?.split(',') || [];
  const mode = searchParams.get('mode') || 'incremental'; // incremental 或 force

  // 查询源语言页面
  let query = supabase
    .from('pages')
    .select('id, title, type, content_hash')
    .eq('site_id', SITE_ID)
    .eq('locale', source);

  if (types.length > 0) {
    query = query.in('type', types);
  }

  const { data: sourcePages, error: sourceError } = await query;
  if (sourceError) {
    console.error('GET /api/discovery/translate/preview error:', sourceError);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  const preview = [];
  for (const page of sourcePages || []) {
    for (const target of targets) {
      if (mode === 'force') {
        preview.push({ id: page.id, title: page.title, type: page.type, source, target });
        continue;
      }
      // 增量模式：检查目标页面是否存在且内容哈希相同且已翻译
      const { data: targetPage, error: targetError } = await supabase
        .from('pages')
        .select('source_hash, translated_by_ai')
        .eq('site_id', SITE_ID)
        .eq('id', page.id)
        .eq('locale', target)
        .maybeSingle();

      if (targetError) {
        console.error(`查询目标页面失败: page ${page.id}, target ${target}`, targetError);
        // 出错时视为需要翻译
        preview.push({ id: page.id, title: page.title, type: page.type, source, target });
        continue;
      }

      if (!targetPage || targetPage.source_hash !== page.content_hash || targetPage.translated_by_ai !== 1) {
        preview.push({ id: page.id, title: page.title, type: page.type, source, target });
      }
    }
  }

  return NextResponse.json(preview);
}