import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface BasicSettings {
  siteName: string;
  websiteUrl: string; // 新增
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  country: string;
  registeredAddress: string;
  city: string;
  province: string;
  postalCode: string;
  brand: string[];   // 新增

}

// 默认设置：只有网站名称和网址为空，其他为空字符串
const defaultSettings: BasicSettings = {
  siteName: '',
  websiteUrl: '', // 新增
  contactEmail: '',
  contactPhone: '',
  companyName: '',
  country: '中国',
  registeredAddress: '',
  city: '',
  province: '',
  postalCode: '',
  brand: [],   // 新增
};

// 确保 data 目录存在
async function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 获取设置
export async function getSettings(): Promise<BasicSettings> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // 兼容旧数据：如果缺少 websiteUrl 则补充默认值
    if (parsed.websiteUrl === undefined) {
      parsed.websiteUrl = '';
    }
    return parsed;
  } catch {
    // 文件不存在或损坏，写入默认设置
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
}

// 更新设置
export async function updateSettings(settings: BasicSettings): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}