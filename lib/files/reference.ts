// lib/files/reference.ts
import { supabase } from '@/lib/supabase/client';
import { createFileReference } from './db';

/**
 * 为单个业务对象创建图片引用（在业务对象保存后调用）
 * @param imageUrlOrKey 图片的相对路径（storage_key）或完整 URL
 * @param referenceType 引用类型，如 'product_category', 'product', 'series'
 * @param referenceId 业务对象 ID（字符串）
 */
export async function bindImageToReference(
  imageUrlOrKey: string,
  referenceType: string,
  referenceId: string
): Promise<void> {
  if (!imageUrlOrKey) return;

  // 如果是完整 URL，提取 storage_key
  let storageKey = imageUrlOrKey;
  if (imageUrlOrKey.startsWith('http://') || imageUrlOrKey.startsWith('https://')) {
    try {
      const urlObj = new URL(imageUrlOrKey);
      storageKey = urlObj.pathname.slice(1); // 去掉开头的 '/'
    } catch (err) {
      console.error('无法解析图片 URL:', imageUrlOrKey, err);
      return;
    }
  }

  // 查找 media_files 记录
  const { data: file, error } = await supabase
    .from('media_files')
    .select('id')
    .eq('storage_key', storageKey)
    .maybeSingle();

  if (error || !file) {
    console.warn(`未找到图片记录: ${storageKey}`, error);
    return;
  }

  // 创建引用（忽略唯一约束冲突）
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

/**
 * 批量绑定多个图片到同一业务对象
 * @param imageUrls 图片地址数组（相对路径或完整 URL）
 * @param referenceType 引用类型
 * @param referenceId 业务对象 ID
 */
export async function bindImagesToReference(
  imageUrls: string[],
  referenceType: string,
  referenceId: string
): Promise<void> {
  await Promise.all(imageUrls.map(url => bindImageToReference(url, referenceType, referenceId)));
}

/**
 * 解除业务对象与图片的引用（可选，用于替换图片时先删后建）
 * @param referenceType 引用类型
 * @param referenceId 业务对象 ID
 */
export async function unbindReferences(referenceType: string, referenceId: string): Promise<void> {
  const { error } = await supabase
    .from('file_references')
    .delete()
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId);
  if (error) {
    console.error(`删除引用失败: ${referenceType}/${referenceId}`, error);
  }
}