import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { translatePage } from '@/modules/discovery/translate/core';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 简单内存任务队列（生产环境建议使用 Redis 或 Bull）
const tasks = new Map<string, { status: string; total: number; completed: number; failed: number; results: any[] }>();

export async function POST(req: NextRequest) {
  const { sourceLocale, targetLocales, contentTypes, mode, pageIds } = await req.json();
  const taskId = crypto.randomUUID();

  // 获取需要同步的页面列表
  let query = supabase
    .from('pages')
    .select('id, title, type, content_hash')
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale);

  if (contentTypes && contentTypes.length > 0) {
    query = query.in('type', contentTypes);
  }
  if (pageIds && pageIds.length > 0) {
    query = query.in('id', pageIds);
  }

  const { data: pages, error } = await query;
  if (error) {
    console.error('获取页面失败:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }

  // 过滤增量模式下的页面
  let filteredPages = pages || [];
  if (mode === 'incremental') {
    filteredPages = [];
    for (const page of pages || []) {
      let needSync = false;
      for (const target of targetLocales) {
        const { data: targetPage, error: targetError } = await supabase
          .from('pages')
          .select('source_hash, translated_by_ai')
          .eq('id', page.id)
          .eq('site_id', SITE_ID)
          .eq('locale', target)
          .maybeSingle();
        if (targetError) {
          console.error(`查询目标页面失败: ${page.id}, ${target}`, targetError);
          needSync = true;
          break;
        }
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