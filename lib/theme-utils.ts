import fs from 'fs';
import path from 'path';

const THEMES_DIR = path.join(process.cwd(), 'data', 'themes');
const ACTIVE_THEME_FILE = path.join(THEMES_DIR, 'active-theme.json');

if (!fs.existsSync(THEMES_DIR)) fs.mkdirSync(THEMES_DIR, { recursive: true });

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

// 获取当前激活的主题（完整配置），如果不存在则返回默认主题
export function getActiveTheme(): any {
  try {
    if (fs.existsSync(ACTIVE_THEME_FILE)) {
      const content = fs.readFileSync(ACTIVE_THEME_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('读取激活主题失败:', error);
  }
  // 返回默认主题的深拷贝
  return JSON.parse(JSON.stringify(DEFAULT_THEME));
}

// 保存激活的主题
export function saveActiveTheme(theme: any) {
  fs.writeFileSync(ACTIVE_THEME_FILE, JSON.stringify(theme, null, 2));
}

// 展平嵌套对象为 CSS 变量字符串（用于 layout 注入）
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