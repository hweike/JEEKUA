// lib/theme-presets.ts
import { getPrivateStorage, getPublicStorage } from '@/lib/storage/factory';

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

/**
 * 异步查找预览图在公开桶中的 URL
 * @param category 分类名称
 * @param baseName 文件名基础名（不含扩展名）
 * @returns 公开 URL 或 null
 */
async function findPreviewImage(category: string, baseName: string): Promise<string | null> {
  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
  const publicStorage = getPublicStorage();
  // 公开桶中的基础前缀（与私有桶 JSON 路径对应，但图片放在公开桶）
  const publicPrefix = `themes/presets/${category}/`;
  for (const ext of extensions) {
    const key = `${publicPrefix}${baseName}.${ext}`;
    try {
      // 检查文件是否存在（通过 list 或直接读取元数据，这里使用 list 判断）
      const keys = await publicStorage.list(publicPrefix);
      if (keys.includes(key)) {
        // 返回公开访问 URL（优先使用自定义域名）
        return publicStorage.getPublicUrl(key);
      }
    } catch {
      // 忽略错误，继续尝试下一个扩展名
    }
  }
  return null;
}

/**
 * 获取所有主题预设（从私有桶读取）
 */
export async function getAllThemePresets(): Promise<ThemePreset[]> {
  const storage = getPrivateStorage();
  const presets: ThemePreset[] = [];
  const prefix = 'data/themes/presets/';

  try {
    // 列出所有分类目录（二级目录）
    const allKeys = await storage.list(prefix);
    const categories = new Set<string>();
    for (const key of allKeys) {
      // 格式: data/themes/presets/{category}/{file}.json
      const parts = key.split('/');
      if (parts.length >= 4) {
        categories.add(parts[3]); // 分类目录名
      }
    }

    for (const category of categories) {
      const categoryPrefix = `${prefix}${category}/`;
      const categoryKeys = await storage.list(categoryPrefix);
      const jsonKeys = categoryKeys.filter(k => k.endsWith('.json'));
      for (const key of jsonKeys) {
        try {
          const content = await storage.read(key, 'utf8');
          const themeJson = JSON.parse(content as string);
          let lightVars = {};
          let darkVars = {};
          if (themeJson.cssVars) {
            if (themeJson.cssVars.light) lightVars = themeJson.cssVars.light;
            if (themeJson.cssVars.dark) darkVars = themeJson.cssVars.dark;
          } else if (themeJson.light && themeJson.dark) {
            lightVars = themeJson.light;
            darkVars = themeJson.dark;
          } else if (themeJson.colors) {
            lightVars = themeJson.colors;
          }
          const primaryColor = (lightVars as any)['--primary'] || (lightVars as any)['primary'] || '#3b82f6';
          const fileName = key.split('/').pop() || '';
          const themeName = themeJson.name || fileName.replace(/\.json$/, '');
          const presetId = `${category}_${fileName.replace(/\.json$/, '')}`;
          const baseName = fileName.replace(/\.json$/, '');
          const previewImage = await findPreviewImage(category, baseName);

          presets.push({
            id: presetId,
            category,
            name: themeName,
            color: primaryColor,
            previewImage,
            cssVars: {
              light: lightVars,
              dark: darkVars,
            },
          });
        } catch (err) {
          console.error(`解析主题文件失败: ${key}`, err);
        }
      }
    }
  } catch (err) {
    console.error('获取主题预设失败:', err);
  }
  return presets;
}

/**
 * 获取当前激活的主题 ID
 * @param tenantId 租户 ID，默认为 'tenant_001'
 */
export async function getActiveThemeId(tenantId: string = 'tenant_001'): Promise<string> {
  const storage = getPrivateStorage();
  const key = `data/themes/tenants/${tenantId}.json`;
  try {
    const content = await storage.read(key, 'utf8');
    const tenantTheme = JSON.parse(content as string);
    return tenantTheme.activePresetId || '';
  } catch {
    return '';
  }
}

/**
 * 应用主题预设（保存到租户配置）
 * @param tenantId 租户 ID
 * @param presetId 主题预设 ID
 */
export async function applyThemePreset(tenantId: string, presetId: string): Promise<void> {
  const presets = await getAllThemePresets();
  const preset = presets.find(p => p.id === presetId);
  if (!preset) throw new Error(`Theme preset "${presetId}" not found`);

  const tenantTheme = {
    activePresetId: presetId,
    name: tenantId,
    displayName: `${preset.name} 主题`,
    colors: preset.cssVars.light,
    darkColors: preset.cssVars.dark,
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
    animation: {},
    darkMode: 'system',
  };

  const storage = getPrivateStorage();
  const key = `data/themes/tenants/${tenantId}.json`;
  await storage.write(key, JSON.stringify(tenantTheme, null, 2), {
    contentType: 'application/json',
  });
}