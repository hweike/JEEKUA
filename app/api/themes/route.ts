import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllThemePresets } from '@/lib/theme-presets';

const THEMES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'themes');
const CUSTOM_THEMES_DIR = path.join(THEMES_DIR, 'custom');
const PRESETS_DIR = path.join(THEMES_DIR, 'presets');
const ACTIVE_THEME_FILE = path.join(THEMES_DIR, 'active-theme.json');

if (!fs.existsSync(THEMES_DIR)) fs.mkdirSync(THEMES_DIR, { recursive: true });
if (!fs.existsSync(CUSTOM_THEMES_DIR)) fs.mkdirSync(CUSTOM_THEMES_DIR, { recursive: true });

// 获取当前激活的主题ID（从 active-theme.json 读取）
function getActiveThemeId(): string {
  try {
    if (fs.existsSync(ACTIVE_THEME_FILE)) {
      const data = fs.readFileSync(ACTIVE_THEME_FILE, 'utf-8');
      const { name } = JSON.parse(data);
      return name;
    }
  } catch (error) {
    console.error('读取激活主题失败:', error);
  }
  return ''; // 没有激活主题时返回空字符串
}

// 获取所有自定义主题（带预览图片）
function getCustomThemes() {
  const themes: any[] = [];
  if (!fs.existsSync(CUSTOM_THEMES_DIR)) return themes;
  const files = fs.readdirSync(CUSTOM_THEMES_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(CUSTOM_THEMES_DIR, file), 'utf-8');
      const theme = JSON.parse(content);
      if (theme.name && theme.cssVariables) {
        let previewImage = null;
        const baseName = theme.name;
        for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'gif']) {
          const imgPath = path.join(CUSTOM_THEMES_DIR, `${baseName}.${ext}`);
          if (fs.existsSync(imgPath)) {
            previewImage = `/api/theme-preview?path=${encodeURIComponent(imgPath)}`;
            break;
          }
        }
        themes.push({
          id: theme.name,
          name: theme.name,
          displayName: theme.displayName,
          type: 'custom',
          cssVariables: theme.cssVariables,
          previewImage,
        });
      }
    } catch (error) {
      console.error(`读取自定义主题失败: ${file}`, error);
    }
  }
  return themes;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // 用于获取当前激活的主题ID
  if (searchParams.get('action') === 'active') {
    const activeTheme = getActiveThemeId();
    return NextResponse.json({ activeTheme });
  }

  // 获取所有内置主题（从文件系统动态读取）
  const presets = getAllThemePresets();
  const builtinThemes = presets.map(preset => {
    let previewImage = null;
    const categoryDir = path.join(PRESETS_DIR, preset.category);
    const baseName = preset.name;
    for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'gif']) {
      const imgPath = path.join(categoryDir, `${baseName}.${ext}`);
      if (fs.existsSync(imgPath)) {
        previewImage = `/api/theme-preview?path=${encodeURIComponent(imgPath)}`;
        break;
      }
    }
    return {
      id: preset.id,
      name: preset.name,
      displayName: preset.name,
      type: 'builtin',
      cssVariables: preset.cssVars?.light || {},
      previewImage,
    };
  });

  const customThemes = getCustomThemes();
  const allThemes = [...builtinThemes, ...customThemes];
  const activeTheme = getActiveThemeId();

  return NextResponse.json({ themes: allThemes, activeTheme });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 添加 darkCssVariables 到解构中
    const { displayName, cssVariables, darkCssVariables, originalPresetId } = body;

    // 生成唯一的自定义主题名称
    const originalName = originalPresetId ? originalPresetId.split('_')[1] : 'theme';
    let counter = 1;
    let finalName = `Custom-${originalName}`;
    while (fs.existsSync(path.join(CUSTOM_THEMES_DIR, `${finalName}.json`))) {
      finalName = `Custom-${originalName}${counter}`;
      counter++;
    }

    const themeData = {
      name: finalName,
      displayName: displayName || finalName,
      type: 'custom',
      cssVariables,
      darkCssVariables: darkCssVariables || {}, // 保存暗色变量
    };
    const filePath = path.join(CUSTOM_THEMES_DIR, `${finalName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(themeData, null, 2), 'utf-8');

    // 复制图片（如果提供了原始预设主题 ID）
    if (originalPresetId) {
      const [category, themeName] = originalPresetId.split('_');
      const srcDir = path.join(PRESETS_DIR, category);
      for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'gif']) {
        const srcPath = path.join(srcDir, `${themeName}.${ext}`);
        if (fs.existsSync(srcPath)) {
          const destPath = path.join(CUSTOM_THEMES_DIR, `${finalName}.${ext}`);
          fs.copyFileSync(srcPath, destPath);
          break;
        }
      }
    }

    return NextResponse.json({ success: true, name: finalName });
  } catch (error) {
    console.error('保存主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { themeName } = await request.json();
    if (!themeName) {
      return NextResponse.json({ error: '缺少 themeName 参数' }, { status: 400 });
    }

    // 验证主题是否存在（内置或自定义）
    const presets = getAllThemePresets();
    const customThemes = getCustomThemes();
    const allThemeIds = [...presets.map(p => p.id), ...customThemes.map(c => c.id)];
    if (!allThemeIds.includes(themeName)) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    // 写入 active-theme.json
    fs.writeFileSync(ACTIVE_THEME_FILE, JSON.stringify({ name: themeName }, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('激活主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}