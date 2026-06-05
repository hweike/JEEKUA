import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, locale, seo } = body;

  if (!id || !locale || !seo) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    // 1. 获取原页面信息（用于重新计算 content_hash）
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('title, content_hash, content_summary')
      .eq('id', id)
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (pageError) {
      console.error('查询页面失败:', pageError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // 2. 更新 pages 表的 SEO 字段
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        seo_title: seo.metaTitle || null,
        seo_description: seo.metaDescription || null,
        seo_keywords: seo.metaKeywords || null,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('site_id', SITE_ID)
      .eq('locale', locale);

    if (updateError) {
      console.error('更新 SEO 字段失败:', updateError);
      return NextResponse.json({ error: 'Failed to update SEO' }, { status: 500 });
    }

    // 3. 获取 page_contents 中的 full_content
    const { data: contentRow, error: contentError } = await supabase
      .from('page_contents')
      .select('full_content')
      .eq('page_id', id)
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (contentError && contentError.code !== 'PGRST116') { // 忽略无记录错误
      console.error('查询 page_contents 失败:', contentError);
    }

    const fullContent = contentRow?.full_content || '';

    // 4. 重新计算 content_hash
    const newHash = computeHash({
      title: page.title,
      full_content: fullContent,
      seo_title: seo.metaTitle,
      seo_description: seo.metaDescription,
      seo_keywords: seo.metaKeywords,
    });

    const { error: hashError } = await supabase
      .from('pages')
      .update({ content_hash: newHash })
      .eq('id', id)
      .eq('site_id', SITE_ID)
      .eq('locale', locale);

    if (hashError) {
      console.error('更新 content_hash 失败:', hashError);
      return NextResponse.json({ error: 'Failed to update content hash' }, { status: 500 });
    }

    // 5. 文件同步原逻辑保留（未实现）
    // 实际生产环境应调用对应模块的保存函数，此处保持原样

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/discovery/seo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}