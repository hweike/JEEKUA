// app/api/discovery/seo/batch/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { seoService, aiService } from '@/lib/seo/services';
import { batchProgressService } from '@/lib/seo/services/batchProgress.service';

const DEFAULT_SITE_ID = '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageIds, sourceLocale, targetLocales } = body;

    if (!pageIds?.length || !sourceLocale || !targetLocales?.length) {
      return NextResponse.json(
        { error: '缺少必要参数: pageIds, sourceLocale, targetLocales' },
        { status: 400 }
      );
    }

    const uniquePageIds = Array.from(new Set(pageIds));

    // 创建任务（按页面粒度统计总数）
    const jobId = batchProgressService.createJob('generate', uniquePageIds, { targetLocales });
    const job = batchProgressService.getJob(jobId);
    if (!job) {
      throw new Error('创建任务失败');
    }

    batchProgressService.updateJobStatus(jobId, 'running');

    // 异步执行
    executeBatchGenerate(jobId, uniquePageIds, sourceLocale, targetLocales);

    return NextResponse.json({
      jobId,
      total: uniquePageIds.length, // 按页面数
      status: 'running',
    });
  } catch (error: any) {
    console.error('批量生成启动失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 执行批量生成
 * 每个页面独立处理，单个语言失败不影响其他语言，页面整体状态根据所有语言结果决定
 */
async function executeBatchGenerate(
  jobId: string,
  pageIds: string[],
  sourceLocale: string,
  targetLocales: string[]
): Promise<void> {
  const concurrency = 3;
  let index = 0;

  async function processNext(): Promise<void> {
    while (index < pageIds.length) {
      const currentIndex = index++;
      const pageId = pageIds[currentIndex];

      // 标记页面开始处理（仅一次）
      batchProgressService.markItemProcessing(jobId, pageId);

      let hasFailure = false;

      // 遍历所有目标语言
      for (const targetLocale of targetLocales) {
        try {
          console.log(`开始生成页面 ${pageId} 语言 ${targetLocale}...`);

          const input = await seoService.buildGenerateInput(
            DEFAULT_SITE_ID,
            pageId,
            targetLocale,
            sourceLocale
          );

          const result = await aiService.generate(input, {
            targetLanguage: targetLocale,
            retries: 2,
            timeout: 30000,
          });

          await seoService.updateDraft(DEFAULT_SITE_ID, pageId, targetLocale, {
            seo_title: result.seo_title,
            seo_description: result.seo_description,
            seo_keywords: result.seo_keywords,
          });

          console.log(`页面 ${pageId} 语言 ${targetLocale} 生成成功 ✅`);
        } catch (error) {
          hasFailure = true;
          const errorMessage = error instanceof Error ? error.message : '生成失败';
          console.error(`页面 ${pageId} 语言 ${targetLocale} 生成失败 ❌:`, errorMessage);
          // 记录失败但继续处理其他语言
        }
      }

      // 根据是否有失败标记页面整体状态
      if (hasFailure) {
        batchProgressService.markItemFailed(jobId, pageId, '部分语言生成失败');
      } else {
        batchProgressService.markItemSuccess(jobId, pageId);
      }
    }
  }

  // 并发执行
  const workers = Array(Math.min(concurrency, pageIds.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);

  const job = batchProgressService.getJob(jobId);
  if (job) {
    const hasFailure = job.failed > 0;
    batchProgressService.updateJobStatus(jobId, hasFailure ? 'failed' : 'completed');
  }
}