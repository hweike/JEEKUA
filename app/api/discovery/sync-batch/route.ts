// app/api/discovery/sync-batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeBatchSync, executeBatchSyncWithProgress } from '@/lib/discovery/services';

// 允许作为源站点的语言列表
const ALLOWED_SOURCE_LOCALES = ['en', 'zh'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceLocale, targetLocales, pageIds, mode } = body;

    // 参数校验
    if (!sourceLocale || !targetLocales || !pageIds || !Array.isArray(targetLocales) || !Array.isArray(pageIds)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    // 只允许 en 或 zh 作为源站点
    if (!ALLOWED_SOURCE_LOCALES.includes(sourceLocale)) {
      return NextResponse.json(
        { error: 'Source locale must be either "en" or "zh"' },
        { status: 400 }
      );
    }

    if (!mode || !['repair', 'copy', 'copy_translate'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode, must be repair, copy, or copy_translate' },
        { status: 400 }
      );
    }

    const operator = 'admin'; // TODO: 从 session 获取

    // 检测是否为流式请求（通过 Accept 头）
    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/event-stream')) {
      // ---- 流式响应 ----
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          send({ type: 'start', message: '开始批量同步...' });

          try {
            // 调用带进度回调的同步函数
            await executeBatchSyncWithProgress({
              sourceLocale,
              targetLocales,
              pageIds,
              mode,
              operator,
              onProgress: (log) => {
                send({ type: 'progress', log });
              },
            });

            send({ type: 'complete', message: '同步完成' });
          } catch (error: any) {
            send({ type: 'error', error: error.message });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // ---- 普通 JSON 响应（原有逻辑完全不变） ----
    const result = await executeBatchSync({
      sourceLocale,
      targetLocales,
      pageIds,
      mode,
      operator,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Batch sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}