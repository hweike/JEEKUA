import { NextRequest, NextResponse } from 'next/server';
import { getLogs, clearLogsByType } from '@/lib/sync/logs';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const targetLocale = request.nextUrl.searchParams.get('targetLocale');
  const sourceLocale = request.nextUrl.searchParams.get('sourceLocale');
  const filter: any = {};
  if (type) filter.syncType = type;
  if (targetLocale) filter.targetLocale = targetLocale;
  if (sourceLocale) filter.sourceLocale = sourceLocale;
  const logs = getLogs(filter);
  return NextResponse.json(logs);
}

export async function DELETE(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  if (!type) {
    return NextResponse.json({ error: '缺少 type 参数' }, { status: 400 });
  }
  try {
    clearLogsByType(type);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '清空失败' }, { status: 500 });
  }
}