// lib/languages/settings.ts
import { getPrivateStorage } from '@/lib/storage/factory';
import { LANGUAGES } from './config';

const SETTINGS_KEY = 'data/languages/settings.json';

const DEFAULT_SETTINGS = {
  enabled: Object.fromEntries(LANGUAGES.map(lang => [lang.code, true])),
  defaultLanguage: 'zh', // 默认中文站
};

export interface LanguageSettings {
  enabled: Record<string, boolean>;
  defaultLanguage: string;
}

/**
 * 获取语言设置（从私有桶读取）
 */
export async function getLanguageSettings(): Promise<LanguageSettings> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(SETTINGS_KEY, 'utf8');
    const settings = JSON.parse(content as string);
    // 兼容旧数据：如果没有 defaultLanguage 字段，则补充默认值
    if (settings.defaultLanguage === undefined) {
      settings.defaultLanguage = DEFAULT_SETTINGS.defaultLanguage;
    }
    return settings;
  } catch (error: any) {
    // 文件不存在或读取失败，返回默认设置，并尝试写入默认设置
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey') {
      // 异步写入默认设置（不等待）
      saveLanguageSettings(DEFAULT_SETTINGS).catch(console.error);
      return { ...DEFAULT_SETTINGS };
    }
    console.error('读取语言设置失败:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 保存语言设置到私有桶
 */
export async function saveLanguageSettings(settings: LanguageSettings): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(SETTINGS_KEY, JSON.stringify(settings, null, 2), {
    contentType: 'application/json',
  });
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