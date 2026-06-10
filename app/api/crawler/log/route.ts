import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  const storage = getPrivateStorage();
  const key = `crawler/tasks/${taskId}/log.txt`;

  try {
    const content = await storage.read(key, 'utf8');
    return NextResponse.json({ log: content });
  } catch {
    return NextResponse.json({ log: '' });
  }
}