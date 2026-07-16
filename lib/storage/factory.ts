// lib/storage/factory.ts
import { R2Storage } from './r2-storage';

let privateStorage: R2Storage | null = null;
let publicStorage: R2Storage | null = null;

// 从环境变量读取 R2 公有桶的公共访问域名（例如：https://pub-xxxx.r2.dev）
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/**
 * 将可能为相对路径的 URL 转换为完整的公网 URL
 * @param url 原始 URL（可能是相对路径，如 'uploads/xxx.jpg'）
 * @returns 完整公网 URL（如果已经是绝对路径则原样返回）
 */
function ensureFullPublicUrl(url: string): string {
  if (!url) return url;
  // 已经是绝对路径（http:// 或 https://），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // 如果没有配置 R2_PUBLIC_URL，则无法拼接，返回原值（降级）
  if (!R2_PUBLIC_URL) {
    console.warn('R2_PUBLIC_URL not set, public URL may be invalid.');
    return url;
  }
  // 确保 base URL 没有尾部斜杠
  const base = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
  // 确保相对路径没有开头的斜杠（避免双斜杠）
  const relative = url.startsWith('/') ? url.slice(1) : url;
  return `${base}/${relative}`;
}

export function getPrivateStorage(): R2Storage {
  if (!privateStorage) privateStorage = new R2Storage('private');
  return privateStorage;
}

export function getPublicStorage(): R2Storage {
  if (!publicStorage) {
    const original = new R2Storage('public');
    // 使用 Proxy 拦截 getPublicUrl 方法，在不修改原类的情况下增强其行为
    const proxied = new Proxy(original, {
      get(target, prop, receiver) {
        if (prop === 'getPublicUrl') {
          // 返回包装后的函数
          return (key: string) => {
            const originalUrl = target.getPublicUrl(key);
            return ensureFullPublicUrl(originalUrl);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    publicStorage = proxied as R2Storage;
  }
  return publicStorage;
}