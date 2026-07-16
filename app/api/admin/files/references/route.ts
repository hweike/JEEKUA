// app/api/admin/files/references/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { deleteFileReference } from '@/lib/files/db';

// TODO: 添加 JWT 鉴权

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const referenceId = searchParams.get('id');
  if (!referenceId) {
    return NextResponse.json({ error: 'Missing reference id' }, { status: 400 });
  }

  await deleteFileReference(parseInt(referenceId));
  return NextResponse.json({ success: true });
}