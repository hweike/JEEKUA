// app/api/admin/products/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { taskStore } from '@/lib/products/task/taskStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    // 关键修复：先 await params 再访问 taskId
    const { taskId } = await params;
    const task = await taskStore.get(taskId);

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({
      status: task.status,
      result: task.result,
      error: task.error,
    });
  } catch (error: any) {
    console.error('GET /tasks/[taskId] error:', error);
    return NextResponse.json(
      { error: error.message || '查询失败' },
      { status: 500 }
    );
  }
}