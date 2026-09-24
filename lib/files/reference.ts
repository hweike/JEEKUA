// lib/files/reference.ts
import sql from '@/lib/db/admin';
import { createFileReference } from './db';

export async function bindImageToReference(
  imageUrlOrKey: string,
  referenceType: string,
  referenceId: string
): Promise<void> {
  if (!imageUrlOrKey) return;

  // 1. 提取 storage_key
  let storageKey = imageUrlOrKey;
  if (imageUrlOrKey.startsWith('http://') || imageUrlOrKey.startsWith('https://')) {
    try {
      const urlObj = new URL(imageUrlOrKey);
      storageKey = urlObj.pathname.slice(1);
    } catch (err) {
      console.error('无法解析图片 URL:', imageUrlOrKey, err);
      return;
    }
  }

  // 2. 查找 media_files 记录
  let file: { id: string } | undefined;
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.media_files
      WHERE storage_key = ${storageKey}
      LIMIT 1
    `;
    file = rows[0];
  } catch (error) {
    console.warn(`查询图片记录失败: ${storageKey}`, error);
    return;
  }

  if (!file) {
    console.warn(`未找到图片记录: ${storageKey}`);
    return;
  }

  // 3. 创建引用
  await createFileReference({
    file_id: file.id,
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

export async function bindImagesToReference(
  imageUrls: string[],
  referenceType: string,
  referenceId: string
): Promise<void> {
  await Promise.all(imageUrls.map(url => bindImageToReference(url, referenceType, referenceId)));
}

export async function unbindReferences(referenceType: string, referenceId: string): Promise<void> {
  try {
    await sql`
      DELETE FROM public.file_references
      WHERE reference_type = ${referenceType}
        AND reference_id = ${referenceId}
    `;
  } catch (error) {
    console.error(`删除引用失败: ${referenceType}/${referenceId}`, error);
  }
}