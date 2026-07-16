// app/api/discovery/sitemap/generate/route.ts

import { NextRequest } from 'next/server';
import { generateSitemaps } from '@/lib/sitemap/generate';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function POST(request: NextRequest) {
  try {
    // 不需要任何请求体，自动生成所有语言的 Sitemap
    const settings = await getSiteSettings();
    const baseUrl = settings.websiteUrl?.trim();
    if (!baseUrl) {
      return new Response(
        JSON.stringify({ error: '网站未配置网址' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          sendEvent({
            type: 'progress',
            status: 'running',
            message: '开始生成站点地图（包含所有语言的 hreflang 标签）...',
          });

          await generateSitemaps();

          sendEvent({
            type: 'complete',
            message: '站点地图生成完成，已包含所有语言版本的 hreflang 标签',
          });

          controller.close();
        } catch (error: any) {
          console.error('生成站点地图失败:', error);
          sendEvent({
            type: 'error',
            message: error.message || '生成失败',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('生成站点地图失败:', error);
    return new Response(
      JSON.stringify({ error: error.message || '生成失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}