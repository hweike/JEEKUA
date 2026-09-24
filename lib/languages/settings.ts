// lib/languages/settings.ts
import { getConfigWithCache, invalidateConfig } from '@/lib/config-cache';
import sql from '@/lib/db/admin';
import { LANGUAGES } from './config';

export interface LanguageSettings {
  enabled: Record<string, boolean>;
  defaultLanguage: string;
}

const CACHE_KEY = 'language-settings';

/**
 * ⚠️ 关键：数据库连接失败时的兜底
 * （保留原有注释，省略）
 */
const DEFAULT_SETTINGS: LanguageSettings = {
  enabled: {
    zh: true,
    en: true,
  },
  defaultLanguage: 'zh',
};

// ========== 数据库行类型 ==========
interface LanguageSettingsRow {
  enabled: Record<string, boolean> | null;
  default_language: string | null;
}

/**
 * 实际查询数据库的逻辑（无缓存）
 */
async function fetchLanguageSettings(): Promise<LanguageSettings> {
  const rows = await sql<LanguageSettingsRow[]>`
    SELECT enabled, default_language
    FROM language_settings
    WHERE id = 1
    LIMIT 1
  `;

  const data = rows[0];
  if (!data) throw new Error('language_settings 表中 id=1 的记录不存在');

  return {
    enabled: data.enabled ?? {},
    defaultLanguage: data.default_language ?? 'zh',
  };
}

/**
 * 获取语言设置（统一走 config-cache，10 分钟 TTL）
 */
export async function getLanguageSettings(): Promise<LanguageSettings> {
  try {
    return await getConfigWithCache(CACHE_KEY, fetchLanguageSettings, 600);
  } catch (error) {
    console.error('读取语言设置失败，使用默认设置（仅 zh/en）:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 保存语言设置（更新数据库并清除缓存）
 */
export async function saveLanguageSettings(settings: LanguageSettings): Promise<void> {
  await sql`
    UPDATE language_settings
    SET enabled = ${sql.json(settings.enabled)},
        default_language = ${settings.defaultLanguage},
        updated_at = ${new Date().toISOString()}
    WHERE id = 1
  `;

  invalidateConfig(CACHE_KEY);
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