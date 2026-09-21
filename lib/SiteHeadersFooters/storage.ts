// lib/SiteHeadersFooters/storage.ts
import { headerFooterService } from './header-footer-service';

type ConfigType = 'header' | 'footer';

// ---------- 缓存 ----------
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 秒

function getCacheKey(type: ConfigType, locale: string): string {
  return `hf_${type}_${locale}`;
}

// 返回 undefined 表示缓存未命中，null 表示配置不存在
function getCache(type: ConfigType, locale: string): any | undefined {
  const key = getCacheKey(type, locale);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return undefined;
}

function setCache(type: ConfigType, locale: string, data: any): void {
  const key = getCacheKey(type, locale);
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(type?: ConfigType, locale?: string): void {
  if (type && locale) {
    cache.delete(getCacheKey(type, locale));
  } else if (type) {
    for (const key of cache.keys()) {
      if (key.startsWith(`hf_${type}_`)) cache.delete(key);
    }
  } else if (locale) {
    for (const key of cache.keys()) {
      if (key.endsWith(`_${locale}`)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
}

// ---------- 对外接口 ----------
/**
 * 读取页头配置（带缓存）
 */
export async function readHeaderConfig(locale: string): Promise<any> {
  const cached = getCache('header', locale);
  if (cached !== undefined) return cached;
  const config = await headerFooterService.getHeaderConfig(locale);
  setCache('header', locale, config);
  return config;
}

/**
 * 写入页头配置（清除缓存）
 */
export async function writeHeaderConfig(locale: string, config: any): Promise<void> {
  await headerFooterService.saveHeaderConfig(locale, config);
  clearCache('header', locale);
}

/**
 * 读取页脚配置（带缓存）
 */
export async function readFooterConfig(locale: string): Promise<any> {
  const cached = getCache('footer', locale);
  if (cached !== undefined) return cached;
  const config = await headerFooterService.getFooterConfig(locale);
  setCache('footer', locale, config);
  return config;
}

/**
 * 写入页脚配置（清除缓存）
 */
export async function writeFooterConfig(locale: string, config: any): Promise<void> {
  await headerFooterService.saveFooterConfig(locale, config);
  clearCache('footer', locale);
}

/**
 * 初始化页头或页脚配置（清除缓存），并返回配置对象
 */
export async function initHeaderFooterConfig(type: 'header' | 'footer', locale: string): Promise<any> {
  console.log(`[storage.initHeaderFooterConfig] 开始初始化 ${type}, locale=${locale}`);
  const config = await headerFooterService.initConfig(type, locale);
  clearCache(type, locale);
  console.log(`[storage.initHeaderFooterConfig] 初始化完成，缓存已清除，返回配置`);
  return config;
}

// ---------- 兼容旧接口（保留 getConfig / saveConfig 等） ----------
/**
 * 获取配置（通用，兼容旧代码）
 */
export async function getConfig(type: ConfigType, locale: string): Promise<any> {
  if (type === 'header') {
    return await readHeaderConfig(locale);
  } else {
    return await readFooterConfig(locale);
  }
}

/**
 * 保存配置（通用）
 */
export async function saveConfig(type: ConfigType, locale: string, config: any): Promise<void> {
  if (type === 'header') {
    await writeHeaderConfig(locale, config);
  } else {
    await writeFooterConfig(locale, config);
  }
}

/**
 * 初始化配置（通用）—— 修改为返回配置对象
 */
export async function initConfig(type: ConfigType, locale: string): Promise<any> {
  console.log(`[storage.initConfig] 调用 initHeaderFooterConfig`);
  const config = await initHeaderFooterConfig(type, locale);
  console.log(`[storage.initConfig] 返回配置:`, config);
  return config;
}

/**
 * 深度合并：用翻译后的配置替换原始配置中的文本字段
 * 递归处理对象和数组，只替换字符串值中的可见文本（实际由 AI 决定）
 * 但为了安全，我们直接使用翻译后的完整配置（假设 AI 保留了结构）
 */
function mergeHeaderFooterConfig(original: any, translated: any): any {
  // 如果 translated 是完整配置，直接返回 translated（更安全）
  // 但为了保留非文本字段，我们递归合并
  if (typeof original !== 'object' || original === null) return translated;
  if (Array.isArray(original)) {
    return original.map((item, idx) => mergeHeaderFooterConfig(item, translated?.[idx]));
  }
  const result = { ...original };
  for (const key of Object.keys(original)) {
    if (translated && key in translated) {
      if (typeof original[key] === 'string' && typeof translated[key] === 'string') {
        // 替换字符串（假设是文本）
        result[key] = translated[key];
      } else if (typeof original[key] === 'object' && original[key] !== null) {
        result[key] = mergeHeaderFooterConfig(original[key], translated[key]);
      } else {
        // 非文本类型（数字、布尔等）保持原样
        result[key] = original[key];
      }
    }
  }
  return result;
}

/**
 * 批量更新页头或页脚翻译
 * @param targetLocale 目标语言
 * @param translations 数组，每项包含 type ('header'|'footer') 和 config (翻译后的配置)
 * @param sourceLocale 源语言
 */
export async function updateHeaderFooterTranslations(
  targetLocale: string,
  translations: Array<{
    type: 'header' | 'footer';
    config: any;
  }>,
  sourceLocale?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trans of translations) {
    const { type, config: translatedConfig } = trans;
    try {
      // 获取目标配置
      let targetConfig = await getConfig(type, targetLocale);

      // 若目标不存在且提供了源语言，则复制源
      if (targetConfig === null && sourceLocale) {
        const sourceConfig = await getConfig(type, sourceLocale);
        if (sourceConfig !== null) {
          targetConfig = JSON.parse(JSON.stringify(sourceConfig)); // 深拷贝
        } else {
          // 源也不存在，则跳过
          errors.push(`源配置不存在 (${type}, ${sourceLocale})`);
          failed++;
          continue;
        }
      }

      if (targetConfig === null) {
        errors.push(`目标配置不存在且无法创建 (${type}, ${targetLocale})`);
        failed++;
        continue;
      }

      // 合并翻译
      const merged = mergeHeaderFooterConfig(targetConfig, translatedConfig);
      await saveConfig(type, targetLocale, merged);
      success++;
    } catch (err: any) {
      errors.push(`更新 ${type} 失败: ${err.message}`);
      failed++;
    }
  }

  return { success, failed, errors };
}