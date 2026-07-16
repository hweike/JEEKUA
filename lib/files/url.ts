// lib/files/url.ts

/**
 * 将图片的相对路径（storage_key）或完整 URL 转换为可访问的完整 URL
 * - 如果输入已经是 http:// 或 https:// 开头，则直接返回（兼容旧数据）
 * - 否则，通过环境变量拼接公开域名生成完整 URL
 *
 * @param path 图片的相对路径（如 "uploads/2026/06/xxx.jpg"）或完整 URL
 * @returns 完整的图片访问 URL
 */
export function getImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 优先客户端环境变量，其次服务端环境变量
  const baseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
  if (!baseUrl) {
    console.warn('R2_PUBLIC_URL not set, image may not display correctly');
    return path;
  }
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${normalizedBase}/${normalizedPath}`;
}

/**
 * 批量转换图片路径数组
 */
export function getImageUrls(paths: string[]): string[] {
  if (!Array.isArray(paths)) return [];
  return paths.map(p => getImageUrl(p));
}

/**
 * 安全获取对象中的图片字段
 */
export function getImageField<T extends Record<string, any>>(
  obj: T,
  fieldName: keyof T
): string {
  const value = obj[fieldName];
  return typeof value === 'string' ? getImageUrl(value) : '';
}