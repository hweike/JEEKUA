/**
 * 生成6位随机ID（数字+大小写字母混合）
 * 例如: aB3dE9, XyZ12A
 */
export function generateProductId(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let id = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    id += chars[randomIndex];
  }
  return id;
}

/**
 * 检查ID是否已存在（需要传入已有的ID列表）
 */
export function isIdUnique(id: string, existingIds: string[]): boolean {
  return !existingIds.includes(id);
}

/**
 * 生成唯一产品ID（带重试机制，最多10次）
 */
export async function generateUniqueProductId(getExistingIds: () => Promise<string[]>): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateProductId();
    const existingIds = await getExistingIds();
    if (!existingIds.includes(id)) return id;
  }
  throw new Error('无法生成唯一的产品ID');
}