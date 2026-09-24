// lib/cache/cache-version.ts
import sql from '@/lib/db/admin';

const localCache = new Map<string, { version: number; fetchedAt: number }>();
const VERSION_TTL = 1000; // 1 秒

// ========== 数据库行类型 ==========
interface CacheVersionRow {
  version: number;
}

/**
 * 获取某个 key 的当前版本号
 */
export async function getVersion(key: string): Promise<number> {
  const now = Date.now();
  const local = localCache.get(key);
  if (local && now - local.fetchedAt < VERSION_TTL) {
    return local.version;
  }

  try {
    const rows = await sql<CacheVersionRow[]>`
      SELECT version FROM cache_versions
      WHERE key = ${key}
      LIMIT 1
    `;

    const version = rows[0]?.version ?? 1;
    localCache.set(key, { version, fetchedAt: now });
    return version;
  } catch (err) {
    console.error(`[cache-version] 获取 ${key} 失败:`, err);
    return local?.version ?? 1;
  }
}

/**
 * 版本号 +1（写入数据后调用）
 */
export async function bumpVersion(key: string): Promise<void> {
  try {
    const rows = await sql<{ increment_cache_version: number }[]>`
      SELECT increment_cache_version(${key}) AS increment_cache_version
    `;
    localCache.delete(key);
    console.log(`[cache-version] ✅ ${key} 版本号已递增到 ${rows[0]?.increment_cache_version}`);
  } catch (err: any) {
    console.error(`[cache-version] ❌ 递增 ${key} 失败:`, err?.message || err);
    localCache.delete(key);
  }
}

/**
 * 批量版本号 +1
 */
export async function bumpVersions(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  try {
    await sql`
      SELECT increment_cache_versions_bulk(${keys})
    `;
    keys.forEach(k => localCache.delete(k));
    console.log(`[cache-version] ✅ 批量递增 ${keys.length} 个 key`);
  } catch (err: any) {
    console.error(`[cache-version] ❌ 批量递增失败:`, err?.message || err);
    keys.forEach(k => localCache.delete(k));
  }
}

/**
 * 按前缀批量 +1
 */
export async function bumpVersionsByPrefix(prefix: string): Promise<number> {
  try {
    const rows = await sql<{ increment_cache_versions_by_prefix: number }[]>`
      SELECT increment_cache_versions_by_prefix(${prefix}) AS increment_cache_versions_by_prefix
    `;

    const count = rows[0]?.increment_cache_versions_by_prefix ?? 0;

    for (const k of localCache.keys()) {
      if (k.startsWith(prefix)) {
        localCache.delete(k);
      }
    }

    console.log(`[cache-version] ✅ 前缀 ${prefix} 递增 ${count} 个 key`);
    return count;
  } catch (err: any) {
    console.error(`[cache-version] ❌ 前缀递增 ${prefix} 失败:`, err?.message || err);
    return 0;
  }
}

/**
 * 构建带版本号的缓存 key
 */
export async function buildVersionedKey(key: string, suffix: string): Promise<string> {
  const version = await getVersion(key);
  return `v${version}:${suffix}`;
}

/**
 * 手动清空本地版本号缓存
 */
export function clearLocalVersionCache(): void {
  localCache.clear();
  console.log('[cache-version] 本地版本号缓存已清空');
}

/**
 * 清理数据库中的旧记录
 */
export async function cleanupOldVersions(days: number = 30): Promise<number> {
  try {
    const rows = await sql<{ cleanup_cache_versions: number }[]>`
      SELECT cleanup_cache_versions(${days}) AS cleanup_cache_versions
    `;
    const count = rows[0]?.cleanup_cache_versions ?? 0;
    console.log(`[cache-version] ✅ 清理了 ${count} 条旧记录`);
    return count;
  } catch (err: any) {
    console.error('[cache-version] ❌ 清理失败:', err?.message || err);
    return 0;
  }
}