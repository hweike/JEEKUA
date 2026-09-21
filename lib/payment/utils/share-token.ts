// lib/payment/utils/share-token.ts

/**
 * 生成分享 Token
 * 格式: 64位十六进制字符串（SHA-256 风格）
 * 安全性高，适合作为分享链接的唯一标识
 */
export function generateShareToken(): string {
  const array = new Uint8Array(32);
  
  // 优先使用 Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // 降级方案：使用 Math.random()
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  // 转换为十六进制字符串
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 生成订单号
 * 格式: PI-YYYYMMDD-XXXX
 */
export function generateOrderNo(siteId?: string): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const sitePrefix = siteId ? siteId.slice(-3) : '001';
  return `PI-${dateStr}-${sitePrefix}${random}`;
}

/**
 * 验证 Token 格式（用于校验）
 * 检查是否为64位十六进制字符串
 */
export function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * 生成短 Token（用于不需要高安全性的场景）
 * 格式: 12位随机字符
 */
export function generateShortToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomValues = new Uint8Array(12);
      crypto.getRandomValues(randomValues);
      for (let i = 0; i < randomValues.length; i++) {
        result += chars[randomValues[i] % chars.length];
      }
      return result;
    }
  } catch (e) {
    // 降级方案
  }
  
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}