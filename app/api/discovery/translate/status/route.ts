import { NextRequest, NextResponse } from 'next/server';

// 复用上面的 tasks Map（实际项目中应使用共享存储）
declare const tasks: Map<string, any>;

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
  }
  const task = tasks.get(taskId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  return NextResponse.json(task);
}