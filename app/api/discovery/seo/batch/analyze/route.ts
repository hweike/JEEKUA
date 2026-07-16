// app/api/discovery/seo/batch/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo/services';
import { batchProgressService } from '@/lib/seo/services/batchProgress.service';

const DEFAULT_SITE_ID = '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageIds, locale } = body;

    if (!pageIds?.length || !locale) {
      return NextResponse.json(
        { error: '缺少 pageIds 或 locale' },
        { status: 400 }
      );
    }

    // 去重
    const uniquePageIds = Array.from(new Set(pageIds));

    // 创建任务
    const jobId = batchProgressService.createJob('analyze', uniquePageIds, { locale });
    const job = batchProgressService.getJob(jobId);
    if (!job) {
      throw new Error('创建任务失败');
    }

    // 更新状态为运行中
    batchProgressService.updateJobStatus(jobId, 'running');

    // 异步执行批量分析（不阻塞响应）
    executeBatchAnalyze(jobId, uniquePageIds, locale);

    return NextResponse.json({ 
      jobId, 
      total: uniquePageIds.length,
      status: 'running'
    });
  } catch (error: any) {
    console.error('批量分析启动失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 执行批量分析
 */
async function executeBatchAnalyze(
  jobId: string,
  pageIds: string[],
  locale: string
): Promise<void> {
  const concurrency = 5;
  let index = 0;

  async function processNext(): Promise<void> {
    while (index < pageIds.length) {
      const currentIndex = index++;
      const pageId = pageIds[currentIndex];

      try {
        // 标记为处理中
        batchProgressService.markItemProcessing(jobId, pageId);

        // 执行分析
        await seoService.analyzePage(DEFAULT_SITE_ID, pageId, locale);

        // 标记为成功
        batchProgressService.markItemSuccess(jobId, pageId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '分析失败';
        console.error(`分析页面 ${pageId} 失败:`, errorMessage);
        batchProgressService.markItemFailed(jobId, pageId, errorMessage);
      }
    }
  }

  // 并发执行
  const workers = Array(Math.min(concurrency, pageIds.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);

  // 检查是否有失败
  const job = batchProgressService.getJob(jobId);
  if (job) {
    const hasFailure = job.failed > 0;
    batchProgressService.updateJobStatus(jobId, hasFailure ? 'failed' : 'completed');
  }
}