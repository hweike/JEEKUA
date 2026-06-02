// app/api/discovery/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

const SITE_ID = '000001';

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

  const db = getDb();

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

      db.prepare(`
        INSERT OR REPLACE INTO pages (
          id, site_id, locale, type, title, slug, url, cover_image,
          seo_title, seo_description, seo_keywords, canonical,
          noindex, nofollow, priority, changefreq, content_summary,
          content_hash, last_synced_at, synced_locales, source_hash,
          translated_by_ai, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        page.id, SITE_ID, locale, page.type, page.title, page.slug || null, page.url, page.cover_image || null,
        page.seo_title || null, page.seo_description || null, page.seo_keywords || null, page.canonical || null,
        page.noindex ? 1 : 0, page.nofollow ? 1 : 0, page.priority ?? 0.5, page.changefreq || 'weekly',
        page.content_summary || null,
        contentHash,
        null, null, null,
        page.translated_by_ai ? 1 : 0,
        page.updatedAt || new Date().toISOString()
      );

      db.prepare(`
        INSERT OR REPLACE INTO page_contents (page_id, site_id, locale, full_content, content_hash, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        page.id, SITE_ID, locale, page.content_full || null, contentHash, page.updatedAt || new Date().toISOString()
      );
    } else if (action === 'delete') {
      db.prepare('DELETE FROM pages WHERE id = ? AND site_id = ? AND locale = ?').run(page.id, SITE_ID, locale);
      db.prepare('DELETE FROM page_contents WHERE page_id = ? AND site_id = ? AND locale = ?').run(page.id, SITE_ID, locale);
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
      db.prepare(`
        INSERT OR REPLACE INTO site_configs (
          id, site_id, locale, config, content_hash,
          last_synced_at, synced_locales, source_hash,
          translated_by_ai, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, SITE_ID, locale, JSON.stringify(config), contentHash,
        null, null, null,
        data.translated_by_ai ? 1 : 0,
        data.updatedAt || new Date().toISOString()
      );
    } else if (action === 'delete') {
      db.prepare('DELETE FROM site_configs WHERE id = ? AND site_id = ? AND locale = ?').run(id, SITE_ID, locale);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unreachable' }, { status: 500 });
}