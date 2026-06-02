import { NextResponse } from 'next/server';
import { getBlockTypes } from '@/lib/pages';

export async function GET() {
  try {
    const types = await getBlockTypes();
    return NextResponse.json(types);
  } catch (error) {
    console.error('获取区块类型失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}