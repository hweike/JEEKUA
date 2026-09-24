// lib/languages/client.ts
import { LANGUAGES } from './config';

let cachedLanguages: any[] | null = null;
let cachedAt = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟兜底
let fetchPromise: Promise<any[]> | null = null;

/** ✅ 导出：清空缓存（需要立即拉最新时调用） */
export function clearEnabledLanguagesCache() {
  cachedLanguages = null;
  cachedAt = 0;
  console.log('[languages/client] 语言缓存已清空');
}

export async function getEnabledLanguages(): Promise<any[]> {
  const now = Date.now();

  // ✅ 有缓存且未过期
  if (cachedLanguages && now - cachedAt < CACHE_TTL) {
    return cachedLanguages;
  }

  // ✅ 已有进行中的请求，复用
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('/api/languages/enabled')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch enabled languages');
      return res.json();
    })
    .then((data) => {
      cachedLanguages = data;
      cachedAt = Date.now();
      return data;
    })
    .catch((err) => {
      console.error('Failed to load enabled languages, using fallback:', err);
      cachedLanguages = LANGUAGES.map((lang) => ({
        code: lang.code,
        nativeName: lang.nativeName,
        zhName: lang.zhName,
      }));
      cachedAt = Date.now();
      return cachedLanguages!;
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}