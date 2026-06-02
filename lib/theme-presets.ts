// lib/theme-presets.ts
import fs from 'fs';
import path from 'path';

const PRESETS_DIR = path.join(process.cwd(), 'data', 'themes', 'presets');
const TENANTS_DIR = path.join(process.cwd(), 'data', 'themes', 'tenants');

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

function findPreviewImage(categoryDir: string, baseName: string): string | null {
  const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
  for (const ext of extensions) {
    const imagePath = path.join(categoryDir, `${baseName}.${ext}`);
    if (fs.existsSync(imagePath)) {
      return `/api/theme-preview?path=${encodeURIComponent(path.relative(process.cwd(), imagePath))}`;
    }
  }
  return null;
}

export function getAllThemePresets(): ThemePreset[] {
  if (!fs.existsSync(PRESETS_DIR)) return [];
  const categories = fs.readdirSync(PRESETS_DIR);
  const presets: ThemePreset[] = [];

  for (const category of categories) {
    const categoryDir = path.join(PRESETS_DIR, category);
    if (!fs.statSync(categoryDir).isDirectory()) continue;

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      try {
        const themeJson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
        const themeName = themeJson.name || file.replace(/\.json$/, '');
        const presetId = `${category}_${file.replace(/\.json$/, '')}`;
        const baseName = file.replace(/\.json$/, '');
        const previewImage = findPreviewImage(categoryDir, baseName);

        presets.push({
          id: presetId,
          category: category,
          name: themeName,
          color: primaryColor,
          previewImage,
          cssVars: {
            light: lightVars,
            dark: darkVars,
          },
        });
      } catch (err) {
        console.error(`解析主题文件失败: ${filePath}`, err);
      }
    }
  }
  return presets;
}

export function getActiveThemeId(tenantId: string = 'tenant_001'): string {
  const tenantFile = path.join(TENANTS_DIR, `${tenantId}.json`);
  if (!fs.existsSync(tenantFile)) return '';
  try {
    const tenantTheme = JSON.parse(fs.readFileSync(tenantFile, 'utf-8'));
    return tenantTheme.activePresetId || '';
  } catch {
    return '';
  }
}

export function applyThemePreset(tenantId: string, presetId: string): void {
  const presets = getAllThemePresets();
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

  const filePath = path.join(TENANTS_DIR, `${tenantId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tenantTheme, null, 2));
}