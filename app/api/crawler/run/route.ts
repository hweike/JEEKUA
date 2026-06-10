import { NextRequest, NextResponse } from 'next/server';
import { runCrawler, saveTask } from '@/lib/crawler';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ruleId } = body;
    
    if (!ruleId) {
      return NextResponse.json({ error: 'ruleId is required' }, { status: 400 });
    }
    
    const taskId = randomUUID();
    await saveTask(taskId, { ruleId, status: 'pending' });
    
    // 异步执行爬虫，不阻塞响应
    runCrawler(taskId, ruleId).catch(error => {
      console.error(`爬虫任务 ${taskId} 执行失败:`, error);
    });
    
    return NextResponse.json({ taskId });
  } catch (error: any) {
    console.error('启动爬虫 API 错误:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}