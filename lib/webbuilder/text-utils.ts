import type { SlideItem } from '@/lib/webbuilder/types';

/**
 * 递归遍历模板数据，提取所有以 TextId 结尾的字段值（如 titleTextId）
 */
export function extractTextIdsFromTemplate(data: any): string[] {
  const textIds: Set<string> = new Set();
  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('TextId') && typeof value === 'string' && value) {
        textIds.add(value);
      } else if (typeof value === 'object') {
        traverse(value);
      }
    }
  };
  traverse(data);
  return Array.from(textIds);
}

export function extractAllTextIds(data: any): string[] {
  const ids = new Set<string>();
  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      // 修正：使用 'textId' in value 代替 value.textId
      if (value && typeof value === 'object' && 'textId' in value && value.textId && typeof value.textId === 'string') {
        ids.add(value.textId);
      } else if (typeof value === 'object') {
        traverse(value);
      }
    }
  };
  traverse(data);
  return Array.from(ids);
}