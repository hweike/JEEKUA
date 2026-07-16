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

// TODO: 在此处添加您的 JWT 鉴权逻辑，例如：
// const auth = await authenticateJWT(req);
// if (!auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const referenceType = formData.get('referenceType') as string | null;
  const referenceId = formData.get('referenceId') ? parseInt(formData.get('referenceId') as string) : null;
  const altText = formData.get('altText') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = await computeFileHash(buffer);
  const mimeType = file.type;
  const size = buffer.length;
  const displayName = file.name;

  // 查重
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

    const newFile = await createMediaFile({
      storage_key: storageKey,
      display_name: displayName,
      mime_type: mimeType,
      size,
      file_hash: fileHash,
      width,
      height,
    });
    mediaFileId = newFile.id;
  }

  // 创建引用（如果提供了）
  if (referenceType && referenceId !== null) {
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
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  const { files, total } = await listMediaFiles(page, 20, search);
  const storage = getPublicStorage();
  const filesWithUrl = files.map((file: any) => ({
    ...file,
    url: storage.getPublicUrl(file.storage_key),
    referenceCount: file.references?.length || 0,
  }));

  return NextResponse.json({ files: filesWithUrl, total, page, pageSize: 20 });
}