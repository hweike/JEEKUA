// lib/files/download.ts
import { getPublicStorage } from '@/lib/storage/factory';
import { computeFileHash, getImageDimensions } from '@/lib/files/utils';
import { createMediaFile, findMediaFileByHash, createFileReference } from '@/lib/files/db';
import sql from '@/lib/db/admin';

export interface DownloadImageOptions {
  referenceType?: string;
  referenceId?: string;
  cache?: Map<string, string>;
  pending?: Map<string, Promise<string>>;
}

export async function downloadAndSaveImage(
  input: string | Buffer,
  options?: DownloadImageOptions
): Promise<string> {
  const { referenceType, referenceId, cache, pending } = options || {};

  const storage = getPublicStorage();

  const getPublicUrl = (key: string): string => {
    if (typeof storage.getPublicUrl === 'function') {
      return storage.getPublicUrl(key);
    }
    return key;
  };

  // 1. Buffer 输入
  if (Buffer.isBuffer(input)) {
    const buffer = input;
    const fileHash = await computeFileHash(buffer);

    const existingByHash = await findMediaFileByHash(fileHash);
    if (existingByHash) {
      console.log(`[复用已有图片 by hash] buffer -> ${existingByHash.storage_key}`);
      if (referenceType && referenceId) {
        await createFileReference({
          file_id: existingByHash.id,
          reference_type: referenceType,
          reference_id: referenceId,
          alt_text: '',
          sort_order: 0,
        }).catch((err) => {
          if (!err.message.includes('unique constraint')) {
            console.warn('创建引用失败:', err);
          }
        });
      }
      return getPublicUrl(existingByHash.storage_key);
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const storageKey = `uploads/uploaded/${timestamp}_${random}_image.jpg`;
    const contentType = 'image/jpeg';
    await storage.write(storageKey, buffer, { contentType });
    console.log(`[本地上传成功] ${storageKey}`);

    let width = null, height = null;
    try {
      const dims = await getImageDimensions(buffer);
      if (dims) { width = dims.width; height = dims.height; }
    } catch (dimErr) {
      console.warn('获取图片尺寸失败:', dimErr);
    }

    const newFile = await createMediaFile({
      storage_key: storageKey,
      display_name: `upload_${timestamp}`,
      mime_type: contentType,
      size: buffer.length,
      file_hash: fileHash,
      width,
      height,
      source_url: null,
    });

    if (referenceType && referenceId) {
      await createFileReference({
        file_id: newFile.id,
        reference_type: referenceType,
        reference_id: referenceId,
        alt_text: '',
        sort_order: 0,
      }).catch((err) => {
        if (!err.message.includes('unique constraint')) {
          console.warn('创建引用失败:', err);
        }
      });
    }

    return getPublicUrl(storageKey);
  }

  // 2. URL 输入
  const url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 相对路径
    if (referenceType && referenceId && url) {
      try {
        const rows = await sql<{ id: string }[]>`
          SELECT id FROM public.media_files
          WHERE storage_key = ${url}
          LIMIT 1
        `;
        if (rows[0]) {
          await createFileReference({
            file_id: rows[0].id,
            reference_type: referenceType,
            reference_id: referenceId,
            alt_text: '',
            sort_order: 0,
          }).catch((err) => {
            if (!err.message.includes('unique constraint')) {
              console.warn('创建引用失败:', err);
            }
          });
        }
      } catch {}
    }
    return getPublicUrl(url);
  }

  // 批次内缓存
  if (cache && cache.has(url)) return cache.get(url)!;
  if (pending && pending.has(url)) return pending.get(url)!;

  const taskPromise = (async () => {
    // 2.1 按 source_url 查询
    let existingBySource: { id: string; storage_key: string } | undefined;
    try {
      const rows = await sql<{ id: string; storage_key: string }[]>`
        SELECT id, storage_key FROM public.media_files
        WHERE source_url = ${url}
        LIMIT 1
      `;
      existingBySource = rows[0];
    } catch {}

    if (existingBySource) {
      console.log(`[复用已有图片 by source_url] ${url} -> ${existingBySource.storage_key}`);
      if (referenceType && referenceId) {
        await createFileReference({
          file_id: existingBySource.id,
          reference_type: referenceType,
          reference_id: referenceId,
          alt_text: '',
          sort_order: 0,
        }).catch((err) => {
          if (!err.message.includes('unique constraint')) {
            console.warn('创建引用失败:', err);
          }
        });
      }
      if (cache) cache.set(url, existingBySource.storage_key);
      return getPublicUrl(existingBySource.storage_key);
    }

    // 2.2 下载图片
    try {
      console.log(`[下载图片] ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`下载失败: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const originalFileName = url.split('/').pop()?.split('?')[0] || 'image.jpg';
      const fileHash = await computeFileHash(buffer);

      // 2.3 上传
      let cleanedName = originalFileName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const storageKey = `uploads/imported/${timestamp}_${random}_${cleanedName}`;
      await storage.write(storageKey, buffer, { contentType });
      console.log(`[上传成功] ${storageKey}`);

      let width = null, height = null;
      if (contentType.startsWith('image/')) {
        try {
          const dims = await getImageDimensions(buffer);
          if (dims) { width = dims.width; height = dims.height; }
        } catch (dimErr) {
          console.warn('获取图片尺寸失败:', dimErr);
        }
      }

      // 2.4 写入 media_files
      const newFile = await createMediaFile({
        storage_key: storageKey,
        display_name: originalFileName,
        mime_type: contentType,
        size: buffer.length,
        file_hash: fileHash,
        width,
        height,
        source_url: url,
      });

      // 2.5 创建引用
      if (referenceType && referenceId) {
        await createFileReference({
          file_id: newFile.id,
          reference_type: referenceType,
          reference_id: referenceId,
          alt_text: '',
          sort_order: 0,
        }).catch((err) => {
          if (!err.message.includes('unique constraint')) {
            console.warn('创建引用失败:', err);
          }
        });
      }

      const publicUrl = getPublicUrl(storageKey);
      if (cache) cache.set(url, publicUrl);
      return publicUrl;
    } catch (err) {
      console.error(`图片处理失败: ${url}`, err);
      return url;
    }
  })();

  if (pending) pending.set(url, taskPromise);
  const result = await taskPromise;
  if (pending) pending.delete(url);
  return result;
}