// app/api/discovery/product-sync/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  executeProductBatchSync,
  executeProductBatchSyncWithProgress,
} from '@/lib/discovery/services/product-sync.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceLocale, targetLocales, productIds, mode, syncStrategy = 'full' } = body;

    if (!sourceLocale || !targetLocales || !productIds || !Array.isArray(targetLocales) || !Array.isArray(productIds)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    // ✅ 允许 en 或 zh 作为源（英文→其他语言，中文→英文）
    if (sourceLocale !== 'en' && sourceLocale !== 'zh') {
      return NextResponse.json(
        { error: 'Source locale must be "en" or "zh"' },
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

    const accept = req.headers.get('accept') || '';
    if (accept.includes('text/event-stream')) {
      // 流式响应
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          send({ type: 'start', message: '开始批量同步产品...' });
          try {
            await executeProductBatchSyncWithProgress({
              sourceLocale,
              targetLocales,
              productIds,
              mode,
              operator,
              syncStrategy,
              onProgress: (log) => {
                send({ type: 'progress', log });
              },
            });
            send({ type: 'complete', message: '产品同步完成' });
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

    // JSON 响应
    const result = await executeProductBatchSync({
      sourceLocale,
      targetLocales,
      productIds,
      mode,
      operator,
      syncStrategy,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Product batch sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}