import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { translatePage } from '@/modules/discovery/translate/core';

const SITE_ID = '000001';
// 简单内存任务队列（生产环境建议使用 Redis 或 Bull）
const tasks = new Map<string, { status: string; total: number; completed: number; failed: number; results: any[] }>();

export async function POST(req: NextRequest) {
  const { sourceLocale, targetLocales, contentTypes, mode, pageIds } = await req.json();
  const taskId = crypto.randomUUID();

  // 获取需要同步的页面列表
  const db = getDb();
  let query = `SELECT id, title, type FROM pages WHERE site_id = ? AND locale = ?`;
  const params: any[] = [SITE_ID, sourceLocale];
  if (contentTypes && contentTypes.length > 0) {
    query += ` AND type IN (${contentTypes.map(() => '?').join(',')})`;
    params.push(...contentTypes);
  }
  if (pageIds && pageIds.length > 0) {
    query += ` AND id IN (${pageIds.map(() => '?').join(',')})`;
    params.push(...pageIds);
  }
  const pages = db.prepare(query).all(...params) as any[];

  // 过滤增量模式下的页面
  let filteredPages = pages;
  if (mode === 'incremental') {
    filteredPages = [];
    for (const page of pages) {
      let needSync = false;
      for (const target of targetLocales) {
        const targetPage = db.prepare(`SELECT source_hash, translated_by_ai FROM pages WHERE id = ? AND site_id = ? AND locale = ?`)
          .get(page.id, SITE_ID, target) as any;
        if (!targetPage || targetPage.source_hash !== page.content_hash || targetPage.translated_by_ai !== 1) {
          needSync = true;
          break;
        }
      }
      if (needSync) filteredPages.push(page);
    }
  }

  const total = filteredPages.length * targetLocales.length;
  tasks.set(taskId, { status: 'running', total, completed: 0, failed: 0, results: [] });

  // 异步执行翻译（不阻塞响应）
  (async () => {
    for (const page of filteredPages) {
      for (const target of targetLocales) {
        const result = await translatePage(sourceLocale, target, page.id);
        const task = tasks.get(taskId)!;
        if (result.success) {
          task.completed++;
        } else {
          task.failed++;
        }
        task.results.push({ pageId: page.id, title: page.title, target, success: result.success, message: result.message });
        tasks.set(taskId, task);
      }
    }
    const task = tasks.get(taskId)!;
    task.status = 'completed';
    tasks.set(taskId, task);
  })();

  return NextResponse.json({ taskId, total });
}