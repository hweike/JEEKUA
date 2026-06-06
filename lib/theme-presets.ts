// lib/theme-presets.ts
import { getPrivateStorage } from '@/lib/storage/factory';

export interface ThemePreset {
  id: string;
  category: string;
  name: string;
  color: string;
  previewImage: string | null;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

// 硬编码默认主题（仅用于 R2 中无数据时的 fallback）
const DEFAULT_PRESETS: ThemePreset[] = [
  {
    id: 'Blue_default',
    category: 'Blue',
    name: 'default',
    color: '#3b82f6',
    previewImage: null,
    cssVars: {
      light: { '--primary': '#3b82f6', '--background': '#ffffff', '--foreground': '#0f172a' },
      dark: { '--primary': '#60a5fa', '--background': '#0f172a', '--foreground': '#f8fafc' }
    }
  }
];

/**
 * 在私有桶中查找预览图片，返回代理 API URL
 */
async function findPreviewImageInR2(category: string, baseName: string): Promise<string | null> {
  const storage = getPrivateStorage();
  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
  const prefix = `themes/presets/${category}`; // 关键修改：去掉 data/ 前缀
  try {
    const files = await storage.list(prefix);
    for (const ext of extensions) {
      const imgKey = `${prefix}/${baseName}.${ext}`;
      if (files.includes(imgKey)) {
        // 通过代理 API 返回图片（该 API 会从私有桶读取）
        return `/api/theme-preview?path=${encodeURIComponent(imgKey)}`;
      }
    }
  } catch (err) {
    console.warn(`查找图片失败 ${category}/${baseName}:`, err);
  }
  return null;
}

export async function getAllThemePresets(): Promise<ThemePreset[]> {
  const privateStorage = getPrivateStorage();
  const presets: ThemePreset[] = [];
  const prefix = 'themes/presets'; // 去掉 data/

  try {
    // 列出所有分类（二级目录）
    const allKeys = await privateStorage.list(prefix);
    const categories = new Set<string>();
    for (const key of allKeys) {
      const parts = key.split('/');
      if (parts.length >= 3) categories.add(parts[2]); // themes/presets/{category}/...
    }

    for (const category of categories) {
      const categoryPrefix = `${prefix}/${category}/`;
      const keys = await privateStorage.list(categoryPrefix);
      const jsonKeys = keys.filter(k => k.endsWith('.json'));
      for (const key of jsonKeys) {
        try {
          const content = await privateStorage.read(key, 'utf8');
          const themeJson = JSON.parse(content as string);
          let lightVars = themeJson.cssVars?.light || themeJson.colors || {};
          let darkVars = themeJson.cssVars?.dark || {};
          const primaryColor = (lightVars as any)['--primary'] || (lightVars as any)['primary'] || '#3b82f6';
          const fileName = key.split('/').pop() || '';
          const themeName = themeJson.name || fileName.replace(/\.json$/, '');
          const presetId = `${category}_${fileName.replace(/\.json$/, '')}`;
          const baseName = fileName.replace(/\.json$/, '');
          const previewImage = await findPreviewImageInR2(category, baseName);
          presets.push({
            id: presetId,
            category,
            name: themeName,
            color: primaryColor,
            previewImage,
            cssVars: { light: lightVars, dark: darkVars },
          });
        } catch (err) {
          console.error(`解析预设主题文件失败: ${key}`, err);
        }
      }
    }
  } catch (err) {
    console.error('从 R2 读取预设主题失败:', err);
  }

  if (presets.length === 0) {
    console.warn('R2 中没有预设主题数据，使用内置默认主题');
    return DEFAULT_PRESETS;
  }
  return presets;
}

// 获取当前激活的主题 ID（从私有桶读取 themes/active-theme.json）
export async function getActiveThemeId(tenantId: string = 'tenant_001'): Promise<string> {
  const privateStorage = getPrivateStorage();
  // 注意：根据迁移路径，激活主题文件为 themes/active-theme.json
  const key = `themes/active-theme.json`;
  try {
    const content = await privateStorage.read(key, 'utf8');
    const { name } = JSON.parse(content as string);
    return name || '';
  } catch {
    return '';
  }
}

// 应用主题预设（保存租户配置，可酌情实现）
export async function applyThemePreset(tenantId: string, presetId: string): Promise<void> {
  // 可根据需要实现，这里仅占位
  throw new Error('Not implemented');
}