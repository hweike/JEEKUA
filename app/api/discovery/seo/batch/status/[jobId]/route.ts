// app/api/discovery/seo/batch/status/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { batchProgressService } from '@/lib/seo/services/batchProgress.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        { error: '缺少 jobId' },
        { status: 400 }
      );
    }

    const progress = batchProgressService.getJob(jobId);

    if (!progress) {
      return NextResponse.json(
        { error: '任务不存在或已过期' },
        { status: 404 }
      );
    }

    // 计算进度百分比
    const processed = progress.completed + progress.failed;
    const percent = progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;

    // 判断是否完成
    const isComplete = progress.status === 'completed' || 
                       progress.status === 'failed' || 
                       progress.status === 'cancelled';

    return NextResponse.json({
      data: {
        jobId: progress.jobId,
        jobType: progress.jobType,
        status: progress.status,
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        percent,
        isComplete,
        details: progress.details.slice(0, 100), // 最多返回 100 条明细
        startTime: progress.startTime,
        updateTime: progress.updateTime,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}