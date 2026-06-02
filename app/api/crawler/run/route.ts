import { NextRequest, NextResponse } from 'next/server';
import { runCrawler, saveTask } from '@/lib/crawler';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ruleId } = body;
  if (!ruleId) {
    return NextResponse.json({ error: 'ruleId is required' }, { status: 400 });
  }
  const taskId = randomUUID();
  await saveTask(taskId, { ruleId, status: 'pending' });
  runCrawler(taskId, ruleId).catch(console.error);
  return NextResponse.json({ taskId });
}