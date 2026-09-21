// app/api/admin/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPublicStorage } from '@/lib/storage/factory';
import { computeFileHash, getImageDimensions, generateStorageKey } from '@/lib/files/utils';
import {
  findMediaFileByHash,
  createMediaFile,
  listMediaFiles,
  createFileReference,
  getMediaFileById,
} from '@/lib/files/db';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const referenceType = formData.get('referenceType') as string | null;
  const referenceId = formData.get('referenceId') as string | null;
  const altText = formData.get('altText') as string | null;
  const categoryId = formData.get('categoryId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = await computeFileHash(buffer);
  const mimeType = file.type;
  const size = buffer.length;
  const displayName = file.name;

  let existingFile = await findMediaFileByHash(fileHash);
  let mediaFileId: string;

  if (existingFile) {
    mediaFileId = existingFile.id;
  } else {
    const storage = getPublicStorage();
    const storageKey = generateStorageKey(file.name, fileHash);
    await storage.write(storageKey, buffer, { contentType: mimeType });

    let width = null, height = null;
    if (mimeType.startsWith('image/')) {
      const dims = await getImageDimensions(buffer);
      if (dims) { width = dims.width; height = dims.height; }
    }

    // ✅ 添加 category_id 支持
    const newFile = await createMediaFile({
      storage_key: storageKey,
      display_name: displayName,
      mime_type: mimeType,
      size,
      file_hash: fileHash,
      width,
      height,
      source_url: null,
    });
    
    // ✅ 如果有 categoryId，更新文件
    if (categoryId) {
      await supabase
        .from('media_files')
        .update({ category_id: categoryId })
        .eq('id', newFile.id);
    }
    
    mediaFileId = newFile.id;
  }

  if (referenceType && referenceId !== null && referenceId !== '') {
    await createFileReference({
      file_id: mediaFileId,
      reference_type: referenceType,
      reference_id: referenceId,
      alt_text: altText,
      sort_order: 0,
    });
  }

  const storage = getPublicStorage();
  const fileRecord = existingFile || await getMediaFileById(mediaFileId);
  const publicUrl = storage.getPublicUrl(fileRecord.storage_key);

  return NextResponse.json({
    id: mediaFileId,
    url: publicUrl,
    displayName,
    isExisting: !!existingFile,
  });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('size') || '20');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || null;
    const referenced = searchParams.get('referenced') || null;

    console.log('📂 查询参数:', { page, pageSize, search, categoryId, referenced });

    // ✅ listMediaFiles 已经包含 site_id 过滤
    const { files, total } = await listMediaFiles(page, pageSize, search, categoryId, referenced);
    
    const storage = getPublicStorage();
    const filesWithUrl = files.map((file: any) => ({
      ...file,
      url: storage.getPublicUrl(file.storage_key),
      referenceCount: file.referenceCount || 0,
    }));

    return NextResponse.json({ 
      files: filesWithUrl, 
      total, 
      page, 
      size: pageSize 
    });
  } catch (error: any) {
    console.error('GET /api/admin/files error:', error);
    return NextResponse.json(
      { error: error.message || '获取文件列表失败' }, 
      { status: 500 }
    );
  }
}