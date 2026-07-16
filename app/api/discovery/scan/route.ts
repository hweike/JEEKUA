// app/api/discovery/scan/route.ts
import { NextRequest } from 'next/server';
import { scanAllForLocale } from '@/lib/discovery/scanners';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { locales, concurrency = 3 } = body;

  if (!locales || !Array.isArray(locales) || locales.length === 0) {
    return new Response('Invalid locales', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let nextIndex = 0;
      let completed = 0;
      const total = locales.length;

      const processLocale = async (locale: string) => {
        // 发送站点开始事件
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'locale_start', locale })}\n\n`));

        // 收集该站点的所有详细日志
        const logs: { time: string; message: string; type: string }[] = [];

        // 定义进度回调，每次有日志就立即发送
        const onProgress = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
          const log = { time: new Date().toISOString(), message, type };
          logs.push(log);
          // 实时推送到前端
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'locale_log', locale, log })}\n\n`));
        };

        let success = true;
        let errorMsg = '';
        try {
          await scanAllForLocale(locale, onProgress);
        } catch (err: any) {
          success = false;
          errorMsg = err.message;
          onProgress(`❌ 扫描失败: ${errorMsg}`, 'error');
        }

        // 发送该站点的最终结果
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'locale_result', locale, success, error: errorMsg, logs })}\n\n`));

        completed++;
        if (completed === total) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
          controller.close();
        }
      };

      const runWorker = async () => {
        while (nextIndex < total) {
          const idx = nextIndex++;
          await processLocale(locales[idx]);
        }
      };

      const workers = Array(Math.min(concurrency, total))
        .fill(null)
        .map(() => runWorker());

      await Promise.all(workers);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}