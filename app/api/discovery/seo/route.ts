// app/api/discovery/seo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

const SITE_ID = '000001';

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

  const db = getDb();

  // 1. 获取原页面信息（用于重新计算 content_hash）
  const page = db.prepare(`
    SELECT title, content_hash, content_summary
    FROM pages
    WHERE id = ? AND site_id = ? AND locale = ?
  `).get(id, SITE_ID, locale) as any;

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // 2. 更新 pages 表的 SEO 字段
  db.prepare(`
    UPDATE pages
    SET 
      seo_title = ?,
      seo_description = ?,
      seo_keywords = ?,
      updatedAt = ?
    WHERE id = ? AND site_id = ? AND locale = ?
  `).run(
    seo.metaTitle || null,
    seo.metaDescription || null,
    seo.metaKeywords || null,
    new Date().toISOString(),
    id,
    SITE_ID,
    locale
  );

  // 3. 重新计算 content_hash（基于标题 + 完整内容 + SEO 字段）
  // 注意：这里需要读取 page_contents 的 full_content，如果没有则忽略
  const contentRow = db.prepare(`
    SELECT full_content FROM page_contents
    WHERE page_id = ? AND site_id = ? AND locale = ?
  `).get(id, SITE_ID, locale) as any;

  const fullContent = contentRow?.full_content || '';
  const newHash = computeHash({
    title: page.title,
    full_content: fullContent,
    seo_title: seo.metaTitle,
    seo_description: seo.metaDescription,
    seo_keywords: seo.metaKeywords,
  });

  db.prepare(`
    UPDATE pages SET content_hash = ? WHERE id = ? AND site_id = ? AND locale = ?
  `).run(newHash, id, SITE_ID, locale);

  // 4. 同步回原始文件（根据 id 解析类型和 slug）
  // 这里需要调用业务模块的更新逻辑，或者直接修改 MD/JSON 文件
  // 为简化，我们只更新数据库，文件同步可后续实现
  // 实际生产环境应调用对应模块的保存函数

  return NextResponse.json({ success: true });
}