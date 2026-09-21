// lib/config-cache.ts
import NodeCache from 'node-cache';

// 全局配置缓存，TTL 10 分钟
const configCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export async function getConfigWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 600
): Promise<T> {
  const cached = configCache.get<T>(key);
  if (cached !== undefined) return cached;

  const data = await fetcher();
  configCache.set(key, data, ttlSeconds);
  return data;
}

export function invalidateConfig(key: string) {
  configCache.del(key);
}