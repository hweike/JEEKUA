import fs from 'fs';
import path from 'path';
import { LANGUAGES } from './config';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'languages', 'settings.json');

const DEFAULT_SETTINGS = {
  enabled: Object.fromEntries(LANGUAGES.map(lang => [lang.code, true])),
  defaultLanguage: 'zh', // 默认中文站
};

export interface LanguageSettings {
  enabled: Record<string, boolean>;
  defaultLanguage: string;
}

export function getLanguageSettings(): LanguageSettings {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
  const content = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  const settings = JSON.parse(content);
  // 兼容旧数据：如果没有 defaultLanguage 字段，则补充默认值
  if (settings.defaultLanguage === undefined) {
    settings.defaultLanguage = DEFAULT_SETTINGS.defaultLanguage;
  }
  return settings;
}

export function saveLanguageSettings(settings: LanguageSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getEnabledLanguages(): string[] {
  const settings = getLanguageSettings();
  return Object.keys(settings.enabled).filter(code => settings.enabled[code]);
}

export function getDefaultLanguage(): string {
  const settings = getLanguageSettings();
  return settings.defaultLanguage;
}