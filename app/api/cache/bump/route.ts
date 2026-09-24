// app/api/cache/bump/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bumpVersion, bumpVersions, bumpVersionsByPrefix } from '@/lib/cache/cache-version';

export async function POST(req: NextRequest) {
  // 鉴权：确保是管理员
  // ... 你的 auth 检查 ...

  const body = await req.json();
  const { key, keys, prefix } = body;

  try {
    if (prefix) {
      const count = await bumpVersionsByPrefix(prefix);
      return NextResponse.json({ ok: true, affected: count });
    }

    if (keys && Array.isArray(keys)) {
      await bumpVersions(keys);
      return NextResponse.json({ ok: true, affected: keys.length });
    }

    if (key) {
      await bumpVersion(key);
      return NextResponse.json({ ok: true, affected: 1 });
    }

    return NextResponse.json({ error: 'missing key/keys/prefix' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}