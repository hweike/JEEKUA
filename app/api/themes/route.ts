// app/api/themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllThemePresets } from '@/lib/theme-presets';
import { getActiveTheme, saveActiveTheme } from '@/lib/theme-utils';
import { getPrivateStorage } from '@/lib/storage/factory';

const CUSTOM_THEMES_PREFIX = 'themes/custom';
const PRESETS_PREFIX = 'themes/presets';

// 内存缓存
let themesCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 分钟

function getThemeKey(themeName: string): string {
  return `${CUSTOM_THEMES_PREFIX}/${themeName}.json`;
}

async function getCustomThemes() {
  const storage = getPrivateStorage();
  try {
    // 1. 列出所有自定义主题的 JSON 文件
    const allKeys = await storage.list(CUSTOM_THEMES_PREFIX);
    const jsonKeys = allKeys.filter(key => key.endsWith('.json'));

    if (jsonKeys.length === 0) return [];

    // 2. 获取该目录下所有图片文件的 Key，建立 Set 便于快速查找
    const imageKeys = allKeys.filter(key => /\.(webp|png|jpg|jpeg|gif)$/i.test(key));
    const imageKeySet = new Set(imageKeys);

    // 3. 并行处理每个 JSON 文件
    const themes = await Promise.all(
      jsonKeys.map(async (key) => {
        try {
          const content = await storage.read(key, 'utf8');
          const theme = JSON.parse(content as string);
          if (!theme.name || !theme.cssVariables) return null;

          let previewImage: string | null = null;
          const baseName = theme.name;
          const extList = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
          for (const ext of extList) {
            const imgKey = `${CUSTOM_THEMES_PREFIX}/${baseName}.${ext}`;
            if (imageKeySet.has(imgKey)) {
              previewImage = `/api/theme-preview?path=${encodeURIComponent(imgKey)}`;
              break;
            }
          }
          return {
            id: theme.name,
            name: theme.name,
            displayName: theme.displayName,
            type: 'custom',
            cssVariables: theme.cssVariables,
            darkCssVariables: theme.darkCssVariables || {},
            previewImage,
          };
        } catch (err) {
          console.error(`读取自定义主题失败: ${key}`, err);
          return null;
        }
      })
    );

    return themes.filter(t => t !== null);
  } catch (err) {
    console.error('列出自定义主题失败:', err);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 单独获取激活主题（无需缓存干扰）
  if (searchParams.get('action') === 'active') {
    const activeTheme = await getActiveTheme();
    return NextResponse.json({ activeTheme: activeTheme.name || '' });
  }

  // 检查缓存
  if (themesCache && Date.now() - themesCache.timestamp < CACHE_TTL) {
    return NextResponse.json(themesCache.data);
  }

  // 获取内置主题（内部需优化，此处仅调用）
  const presets = await getAllThemePresets();
  const builtinThemes = presets.map(preset => ({
    id: preset.id,
    name: preset.name,
    displayName: preset.name,
    type: 'builtin',
    cssVariables: preset.cssVars?.light || {},
    darkCssVariables: preset.cssVars?.dark || {},
    previewImage: preset.previewImage || null,
  }));

  // 获取自定义主题（已优化）
  const customThemes = await getCustomThemes();

  const allThemes = [...builtinThemes, ...customThemes];
  const activeThemeObj = await getActiveTheme();
  const activeTheme = activeThemeObj.name || '';

  const responseData = { themes: allThemes, activeTheme };
  themesCache = { data: responseData, timestamp: Date.now() };
  return NextResponse.json(responseData);
}

export async function POST(request: Request) {
  // 清除缓存，因为数据变化了
  themesCache = null;
  try {
    const body = await request.json();
    const { displayName, cssVariables, darkCssVariables, originalPresetId } = body;

    const originalName = originalPresetId ? originalPresetId.split('_')[1] : 'theme';
    let counter = 1;
    let finalName = `Custom-${originalName}`;
    const storage = getPrivateStorage();
    while (true) {
      const key = getThemeKey(finalName);
      try {
        await storage.read(key, 'utf8');
        finalName = `Custom-${originalName}${counter}`;
        counter++;
      } catch {
        break;
      }
    }

    const themeData = {
      name: finalName,
      displayName: displayName || finalName,
      type: 'custom',
      cssVariables: cssVariables || {},
      darkCssVariables: darkCssVariables || {},
    };
    const themeKey = getThemeKey(finalName);
    await storage.write(themeKey, JSON.stringify(themeData, null, 2), { contentType: 'application/json' });

    if (originalPresetId) {
      const [category, themeName] = originalPresetId.split('_');
      const srcPrefix = `${PRESETS_PREFIX}/${category}`;
      const destPrefix = CUSTOM_THEMES_PREFIX;
      const extList = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
      for (const ext of extList) {
        const srcKey = `${srcPrefix}/${themeName}.${ext}`;
        const destKey = `${destPrefix}/${finalName}.${ext}`;
        try {
          await storage.read(srcKey, 'utf8');
          const imageBuffer = await storage.read(srcKey, 'binary');
          await storage.write(destKey, imageBuffer as Buffer, { contentType: `image/${ext}` });
          break;
        } catch {
          // 源图片不存在
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
  // 清除缓存，因为激活状态变化
  themesCache = null;
  try {
    const { themeName } = await request.json();
    if (!themeName) {
      return NextResponse.json({ error: '缺少 themeName 参数' }, { status: 400 });
    }

    const presets = await getAllThemePresets();
    const customThemes = await getCustomThemes();
    const allThemeIds = [...presets.map(p => p.id), ...customThemes.map(c => c.id)];
    if (!allThemeIds.includes(themeName)) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    await saveActiveTheme({ name: themeName });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('激活主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}