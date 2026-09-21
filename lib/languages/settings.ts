// lib/languages/settings.ts
import { getConfigWithCache, invalidateConfig } from '@/lib/config-cache';
import { supabase } from '@/lib/supabase/client';
import { LANGUAGES } from './config';

export interface LanguageSettings {
  enabled: Record<string, boolean>;
  defaultLanguage: string;
}

const CACHE_KEY = 'language-settings';

const DEFAULT_SETTINGS: LanguageSettings = {
  enabled: Object.fromEntries(LANGUAGES.map(lang => [lang.code, true])),
  defaultLanguage: 'zh',
};

/**
 * 实际查询数据库的逻辑（无缓存）
 */
async function fetchLanguageSettings(): Promise<LanguageSettings> {
  const { data, error } = await supabase
    .from('language_settings')
    .select('enabled, default_language')
    .eq('id', 1)
    .single();

  if (error) throw error;

  return {
    enabled: data.enabled,
    defaultLanguage: data.default_language,
  };
}

/**
 * 获取语言设置（统一走 config-cache，10 分钟 TTL）
 */
export async function getLanguageSettings(): Promise<LanguageSettings> {
  try {
    return await getConfigWithCache(CACHE_KEY, fetchLanguageSettings, 600);
  } catch (error) {
    console.error('读取语言设置失败，使用默认设置:', error);
    // 返回默认设置，但不缓存（getConfigWithCache 内部 fetch 抛错不会写缓存）
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 保存语言设置（更新 Supabase 并清除缓存）
 */
export async function saveLanguageSettings(settings: LanguageSettings): Promise<void> {
  const { error } = await supabase
    .from('language_settings')
    .update({
      enabled: settings.enabled,
      default_language: settings.defaultLanguage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) throw new Error(`保存语言设置失败: ${error.message}`);

  // 清除缓存
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