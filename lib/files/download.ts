// lib/files/download.ts
import { getPublicStorage } from '@/lib/storage/factory';
import { computeFileHash, getImageDimensions } from '@/lib/files/utils';
import { createMediaFile, findMediaFileByHash, createFileReference } from '@/lib/files/db';
import { supabase } from '@/lib/supabase/client';

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

  // ---------- 辅助函数：获取存储实例和公网 URL ----------
  const storage = getPublicStorage();

  // 获取文件的公网 URL（如果存储支持）
  const getPublicUrl = (key: string): string => {
    // 如果 storage 有 getPublicUrl 方法，调用它
    if (typeof storage.getPublicUrl === 'function') {
      return storage.getPublicUrl(key);
    }
    // 降级：返回相对路径
    return key;
  };

  // 1. 处理 Buffer 输入（本地上传，自动哈希去重）
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
      // ✅ 返回公网 URL
      return getPublicUrl(existingByHash.storage_key);
    }

    // 上传新图片
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

    // ✅ 返回公网 URL
    return getPublicUrl(storageKey);
  }

  // 2. 处理 URL 输入（网络图片，按 source_url 去重）
  const url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // 已经是相对路径（如之前存储的），直接处理引用并返回
    if (referenceType && referenceId && url) {
      const { data: existingFile } = await supabase
        .from('media_files')
        .select('id')
        .eq('storage_key', url)
        .maybeSingle();
      if (existingFile) {
        await createFileReference({
          file_id: existingFile.id,
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
    }
    // ✅ 如果是相对路径，尝试转换为公网 URL；否则原样返回
    return getPublicUrl(url);
  }

  // 批次内缓存与并发控制
  if (cache && cache.has(url)) return cache.get(url)!;
  if (pending && pending.has(url)) return pending.get(url)!;

  const taskPromise = (async () => {
    // 2.1 按 source_url 查询是否已存在
    const { data: existingBySource } = await supabase
      .from('media_files')
      .select('id, storage_key')
      .eq('source_url', url)
      .maybeSingle();

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
      // ✅ 返回公网 URL
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

      // 2.3 生成安全文件名并上传
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

      // 2.4 写入 media_files 表
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
      return url; // 降级返回原始 URL
    }
  })();

  if (pending) pending.set(url, taskPromise);
  const result = await taskPromise;
  if (pending) pending.delete(url);
  return result;
}