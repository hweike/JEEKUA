// app/api/admin/files/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';
import { softDeleteMediaFile, getMediaFileById, upsertFileReference } from '@/lib/files/db';
import { supabase } from '@/lib/supabase/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 重要：await 解包 params
    const { id: fileId } = await params;

    // 验证 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      return NextResponse.json({ error: '无效的文件 ID 格式' }, { status: 400 });
    }

    const file = await getMediaFileById(fileId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await softDeleteMediaFile(fileId);
    const storage = getPublicStorage();
    await storage.delete(file.storage_key);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE 错误:', error);
    // 确保错误时也返回 NextResponse
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ③ 解包 params
    const { id: fileId } = await params;

    // 验证 fileId 是否为有效的 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(fileId)) {
      return NextResponse.json({ error: '无效的文件 ID 格式' }, { status: 400 });
    }

    const body = await req.json();
    const { displayName, altText, referenceId, referenceType } = body;

    // ④ 使用解包后的 fileId 进行数据库操作
    // 更新显示名称
    if (displayName !== undefined) {
      const { error } = await supabase
        .from('media_files')
        .update({ display_name: displayName })
        .eq('id', fileId);
      if (error) throw new Error(`更新显示名称失败: ${error.message}`);
    }

    // 更新替代文本
    if (altText !== undefined) {
      const { error } = await supabase
        .from('media_files')
        .update({ alt_text: altText || null })
        .eq('id', fileId);
      if (error) throw new Error(`更新替代文本失败: ${error.message}`);
    }

    // 更新或创建引用
    if (referenceType && referenceId !== undefined) {
      await upsertFileReference({
        file_id: fileId,
        reference_type: referenceType,
        reference_id: String(referenceId),
        alt_text: altText,
        sort_order: 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH 错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}