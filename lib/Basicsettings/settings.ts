// lib/Basicsettings/settings.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export interface BasicSettings {
  siteName: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  country: string;
  registeredAddress: string;
  city: string;
  province: string;
  postalCode: string;
  brand: string[];
}

// 默认设置：只有网站名称和网址为空，其他为空字符串
const defaultSettings: BasicSettings = {
  siteName: '',
  websiteUrl: '',
  contactEmail: '',
  contactPhone: '',
  companyName: '',
  country: '中国',
  registeredAddress: '',
  city: '',
  province: '',
  postalCode: '',
  brand: [],
};

// 私有桶中的存储 Key（与原 data/settings.json 路径一致）
const SETTINGS_KEY = 'data/settings.json';

// 获取设置
export async function getSettings(): Promise<BasicSettings> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(SETTINGS_KEY, 'utf8');
    const parsed = JSON.parse(content as string);
    // 兼容旧数据：如果缺少 websiteUrl 则补充默认值
    if (parsed.websiteUrl === undefined) {
      parsed.websiteUrl = '';
    }
    // 确保 brand 字段存在且为数组
    if (!Array.isArray(parsed.brand)) {
      parsed.brand = [];
    }
    return { ...defaultSettings, ...parsed };
  } catch (error: any) {
    // 文件不存在或读取失败，返回默认设置（但不写入，保持只读行为）
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey') {
      return { ...defaultSettings };
    }
    console.error('读取基本设置失败:', error);
    return { ...defaultSettings };
  }
}

// 更新设置
export async function updateSettings(settings: BasicSettings): Promise<void> {
  const storage = getPrivateStorage();
  // 确保 brand 是数组
  const toSave = {
    ...settings,
    brand: Array.isArray(settings.brand) ? settings.brand : [],
  };
  await storage.write(SETTINGS_KEY, JSON.stringify(toSave, null, 2), {
    contentType: 'application/json',
  });
}