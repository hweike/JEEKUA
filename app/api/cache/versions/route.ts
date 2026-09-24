// app/api/cache/versions/route.ts
import { NextResponse } from 'next/server';
import sql from '@/lib/db/admin';

export async function GET() {
  // 鉴权：确保是管理员
  // ... 你的 auth 检查 ...

  try {
    const data = await sql<{ key: string; version: number; updated_at: string }[]>`
      SELECT key, version, updated_at FROM public.cache_versions
      ORDER BY key ASC
    `;

    return NextResponse.json({ versions: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}