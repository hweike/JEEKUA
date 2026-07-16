// lib/languages/settings.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { LANGUAGES } from './config';

const SETTINGS_KEY = 'languages/settings.json';

const DEFAULT_SETTINGS = {
  enabled: Object.fromEntries(LANGUAGES.map(lang => [lang.code, true])),
  defaultLanguage: 'zh',
};

export interface LanguageSettings {
  enabled: Record<string, boolean>;
  defaultLanguage: string;
}

// ---------- 内存缓存 ----------
const cache = new Map<string, { data: LanguageSettings; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 从云存储读取文件，带超时控制
 */
async function readWithTimeout(key: string, timeoutMs: number = 10000): Promise<string> {
  const storage = getPrivateStorage();
  const readPromise = storage.read(key, 'utf8') as Promise<string>;
  return Promise.race([
    readPromise,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('读取超时')), timeoutMs)
    ),
  ]);
}

/**
 * 判断错误是否为“文件不存在”
 */
function isNoSuchKeyError(error: unknown): boolean {
  // 类型守卫：检查 error 对象是否有 Code/code 属性且值为 'NoSuchKey'
  if (error && typeof error === 'object') {
    const err = error as any;
    return err.Code === 'NoSuchKey' || err.code === 'NoSuchKey' ||
           (typeof err.message === 'string' && err.message.includes('NoSuchKey'));
  }
  return false;
}

/**
 * 安全获取错误信息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * 获取语言设置（带重试和缓存降级）
 */
export async function getLanguageSettings(): Promise<LanguageSettings> {
  const cacheKey = 'settings';
  const cached = cache.get(cacheKey);
  const now = Date.now();

  // 缓存有效 -> 直接返回
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 尝试读取，最多重试 2 次
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const content = await readWithTimeout(SETTINGS_KEY);
      const settings = JSON.parse(content);
      if (settings.defaultLanguage === undefined) {
        settings.defaultLanguage = DEFAULT_SETTINGS.defaultLanguage;
      }
      cache.set(cacheKey, { data: settings, timestamp: now });
      return settings;
    } catch (error) {
      lastError = error;
      // 如果是文件不存在，不重试，直接降级
      if (isNoSuchKeyError(error)) break;
      // 其他错误（如超时），重试一次
      if (attempt < 2) {
        console.warn(`读取语言设置失败（第${attempt}次），1秒后重试...`, getErrorMessage(error));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // 所有尝试失败，处理降级
  if (isNoSuchKeyError(lastError)) {
    console.warn('语言设置文件不存在，使用默认设置（所有语言启用）');
    const defaultSettings = { ...DEFAULT_SETTINGS };
    // 仅缓存默认设置，但不写入存储
    cache.set(cacheKey, { data: defaultSettings, timestamp: now });
    return defaultSettings;
  }

  // 超时或其他错误：如果有缓存（即使过期），返回缓存数据
  if (cached) {
    console.warn('读取语言设置失败，返回过期缓存:', getErrorMessage(lastError));
    return cached.data;
  }

  // 无缓存且读取失败，降级为默认设置（但不写入存储，仅本次使用）
  console.error('读取语言设置失败，且无缓存可用，使用默认设置:', getErrorMessage(lastError));
  const defaultSettings = { ...DEFAULT_SETTINGS };
  // 不缓存此默认设置，让下次请求继续尝试读取
  return defaultSettings;
}

/**
 * 保存语言设置（同时更新缓存）
 */
export async function saveLanguageSettings(settings: LanguageSettings): Promise<void> {
  console.log('[saveLanguageSettings] 写入设置:', JSON.stringify(settings, null, 2));
  const storage = getPrivateStorage();
  await storage.write(SETTINGS_KEY, JSON.stringify(settings, null, 2), {
    contentType: 'application/json',
  });
  cache.set('settings', { data: settings, timestamp: Date.now() });
}

/**
 * 获取已启用的语言代码列表
 */
export async function getEnabledLanguages(): Promise<string[]> {
  const settings = await getLanguageSettings();
  return Object.keys(settings.enabled).filter(code => settings.enabled[code]);
}

/**
 * 获取默认语言代码
 */
export async function getDefaultLanguage(): Promise<string> {
  const settings = await getLanguageSettings();
  return settings.defaultLanguage;
}

// ========== 预热缓存 ==========
// 在模块加载时异步填充缓存，使首次调用快速返回
getLanguageSettings().catch(() => {
  console.warn('语言设置预加载失败，将在首次请求时重试');
});