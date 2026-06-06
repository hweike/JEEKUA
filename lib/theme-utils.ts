// lib/theme-utils.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的存储 Key（localPathToKey 会自动去掉开头的 "data/"，因此这里不需要加 "data/"）
const ACTIVE_THEME_KEY = 'themes/active-theme.json';

// 默认主题（当 active-theme.json 不存在时使用）
const DEFAULT_THEME = {
  name: 'default',
  displayName: '默认主题',
  version: 1,
  darkMode: 'system',
  colors: {
    'background': 'oklch(1 0 0)',
    'foreground': 'oklch(0.145 0 0)',
    'card': 'oklch(1 0 0)',
    'card-foreground': 'oklch(0.145 0 0)',
    'popover': 'oklch(1 0 0)',
    'popover-foreground': 'oklch(0.145 0 0)',
    'primary': 'oklch(0.205 0 0)',
    'primary-foreground': 'oklch(0.985 0 0)',
    'secondary': 'oklch(0.97 0 0)',
    'secondary-foreground': 'oklch(0.205 0 0)',
    'muted': 'oklch(0.97 0 0)',
    'muted-foreground': 'oklch(0.556 0 0)',
    'accent': 'oklch(0.97 0 0)',
    'accent-foreground': 'oklch(0.205 0 0)',
    'destructive': 'oklch(0.577 0.245 27.325)',
    'destructive-foreground': 'oklch(0.985 0 0)',
    'border': 'oklch(0.922 0 0)',
    'input': 'oklch(0.922 0 0)',
    'ring': 'oklch(0.708 0 0)',
    'chart-1': 'oklch(0.87 0 0)',
    'chart-2': 'oklch(0.556 0 0)',
    'chart-3': 'oklch(0.439 0 0)',
    'chart-4': 'oklch(0.371 0 0)',
    'chart-5': 'oklch(0.269 0 0)',
  },
  darkColors: {},
  typography: {},
  spacing: {},
  borderRadius: {},
  shadows: {},
  animation: {},
};

/**
 * 获取当前激活的主题（完整配置），如果不存在则返回默认主题
 */
export async function getActiveTheme(): Promise<any> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(ACTIVE_THEME_KEY, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 文件不存在时返回默认主题深拷贝
    if (error?.Code === 'NoSuchKey' || error?.code === 'NoSuchKey' || error?.message?.includes('NoSuchKey')) {
      return JSON.parse(JSON.stringify(DEFAULT_THEME));
    }
    console.error('读取激活主题失败:', error);
    return JSON.parse(JSON.stringify(DEFAULT_THEME));
  }
}

/**
 * 保存激活的主题
 * @param theme 主题配置对象
 */
export async function saveActiveTheme(theme: { name: string }): Promise<void> {
  const storage = getPrivateStorage();
  const key = ACTIVE_THEME_KEY;
  try {
    await storage.write(key, JSON.stringify(theme, null, 2), {
      contentType: 'application/json',
    });
  } catch (err) {
    throw err; // 重新抛出，让 API 返回错误
  }
}

/**
 * 展平嵌套对象为 CSS 变量字符串（用于 layout 注入）
 * @param theme 主题配置对象（必须包含 colors 字段）
 * @returns CSS 变量字符串，如 "--background: oklch(1 0 0);\n"
 */
export function flattenThemeToCss(theme: any): string {
  let css = '';
  const colors = theme.colors || {};
  for (const [key, value] of Object.entries(colors)) {
    // 确保变量名以 -- 开头
    const cssVarName = key.startsWith('--') ? key : `--${key}`;
    css += `${cssVarName}: ${value};\n`;
  }
  return css;
}