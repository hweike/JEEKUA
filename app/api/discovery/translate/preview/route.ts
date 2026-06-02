import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const source = searchParams.get('source') || 'zh';
  const targets = searchParams.get('targets')?.split(',') || [];
  const types = searchParams.get('types')?.split(',') || [];
  const mode = searchParams.get('mode') || 'incremental'; // incremental 或 force

  const db = getDb();
  let query = `
    SELECT id, title, type, content_hash
    FROM pages
    WHERE site_id = ? AND locale = ?
  `;
  const params: any[] = [SITE_ID, source];
  if (types.length > 0) {
    query += ` AND type IN (${types.map(() => '?').join(',')})`;
    params.push(...types);
  }
  const sourcePages = db.prepare(query).all(...params) as any[];

  const preview = [];
  for (const page of sourcePages) {
    for (const target of targets) {
      if (mode === 'force') {
        preview.push({ id: page.id, title: page.title, type: page.type, source, target });
        continue;
      }
      // 增量模式：检查目标页面是否存在且内容哈希相同
      const targetPage = db.prepare(`SELECT source_hash, translated_by_ai FROM pages WHERE id = ? AND site_id = ? AND locale = ?`)
        .get(page.id, SITE_ID, target) as any;
      if (!targetPage || targetPage.source_hash !== page.content_hash || targetPage.translated_by_ai !== 1) {
        preview.push({ id: page.id, title: page.title, type: page.type, source, target });
      }
    }
  }
  return NextResponse.json(preview);
}