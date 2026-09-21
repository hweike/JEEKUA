// app/api/themes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getThemeIndex,
  refreshThemeIndex,
  writeThemeIndex,
  generateThemeIndex,
  readThemeIndex,
  ThemeIndexItem,
  readActiveTheme,
  writeActiveTheme,
  getCachedThemeList,
  setCachedThemeList,
  invalidateThemeListCache,
} from '@/lib/theme';
import { getPrivateStorage } from '@/lib/storage/factory';

const CUSTOM_THEMES_PREFIX = 'themes/custom';
const PRESETS_PREFIX = 'themes/presets';

// 颜色映射（仅用于自定义主题）
const CATEGORY_COLORS: Record<string, string> = {
  自定义: '#8b5cf6',
};

let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

function getThemeKey(themeName: string): string {
  return `${CUSTOM_THEMES_PREFIX}/${themeName}.json`;
}

// ============================================================
// ✅ 获取主题列表数据（带缓存）
// ============================================================
async function getThemeListData() {
  // ✅ 命中缓存
  const cached = getCachedThemeList();
  if (cached) {
    console.log('[themes-list] ✅ 缓存命中');
    return cached;
  }

  console.log('[themes-list] 🔴 缓存 MISS，开始扫描...');
  const startTime = Date.now();

  const index = await getThemeIndex(false);

  const data = {
    themes: index.themes.map(item => ({
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      type: item.type,
      category: item.category,
      previewImage: item.previewImage,
      cssVariables: { '--primary': item.primaryColor },
      globalThemePath: item.globalThemePath,
      pageThemePath: item.pageThemePath,
    })),
    activeTheme: index.activeTheme,
  };

  // ✅ 写入缓存
  setCachedThemeList(data);
  console.log(`[themes-list] ✅ 扫描完成，耗时 ${Date.now() - startTime}ms`);
  return data;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get('action') === 'active') {
    const activeTheme = await readActiveTheme();
    return NextResponse.json({ activeTheme: activeTheme?.id || '' });
  }

  const refresh = searchParams.get('refresh') === 'true';

  // 显式 refresh：清空缓存
  if (refresh) {
    invalidateThemeListCache();
  }

  const data = await getThemeListData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  cache = null;
  try {
    const body = await request.json();
    const { action, displayName, cssVariables, darkCssVariables, originalPresetId } = body;

    const storage = getPrivateStorage();

    // =============================================================
    // 复制预设主题
    // =============================================================
    if (action === 'copy' && originalPresetId) {
      const [category, themeName] = originalPresetId.split('_');
      const presetKey = `themes/presets/${category}/${themeName}/theme.json`;
      const presetContent = await storage.read(presetKey, 'utf8');
      const presetData = JSON.parse(presetContent as string);

      let counter = 1;
      let finalName = `Custom-${themeName}`;
      while (true) {
        const dirKey = `themes/custom/${finalName}`;
        try {
          await storage.read(`${dirKey}/theme.json`, 'utf8');
          finalName = `Custom-${themeName}${counter}`;
          counter++;
        } catch {
          break;
        }
      }

      const baseDir = `themes/custom/${finalName}`;

      const globalTheme = {
        name: finalName,
        displayName: displayName || `${themeName} 自定义`,
        type: 'custom',
        cssVars: presetData.cssVars,
        darkMode: presetData.darkMode || 'system',
      };
      await storage.write(`${baseDir}/theme.json`, JSON.stringify(globalTheme, null, 2), {
        contentType: 'application/json',
      });

      const pageTheme = { pages: [] };
      await storage.write(`${baseDir}/page-theme.json`, JSON.stringify(pageTheme, null, 2), {
        contentType: 'application/json',
      });

      let previewImagePath: string | null = null;
      const index = await readThemeIndex();
      const originalTheme = index?.themes.find(t => t.id === originalPresetId);
      if (originalTheme?.previewImage) {
        const srcKey = originalTheme.previewImage;
        const ext = srcKey.split('.').pop() || 'png';
        const destKey = `${baseDir}/preview.${ext}`;

        try {
          const imageBuffer = await storage.read(srcKey, 'binary');
          await storage.write(destKey, imageBuffer as Buffer, { contentType: `image/${ext}` });
          previewImagePath = destKey;
          console.log(`[POST /api/themes] 图片复制成功: ${srcKey} -> ${destKey}`);
        } catch (err) {
          console.warn(`[POST /api/themes] 图片复制失败: ${srcKey}`, err);
        }
      }

      if (!previewImagePath) {
        console.warn(`[POST /api/themes] 未找到预览图，主题: ${originalPresetId}`);
      }

      let primaryColor = CATEGORY_COLORS['自定义'];
      if (presetData.cssVars?.light?.primary) {
        primaryColor = presetData.cssVars.light.primary;
      } else if (presetData.colors?.primary) {
        primaryColor = presetData.colors.primary;
      } else if (presetData.cssVars?.light?.['--primary']) {
        primaryColor = presetData.cssVars.light['--primary'];
      }
      console.log(`[POST /api/themes] 提取 primaryColor: ${primaryColor}`);

      let idx = await readThemeIndex();
      if (!idx) {
        idx = await generateThemeIndex();
      }

      const newThemeItem: ThemeIndexItem = {
        id: finalName,
        type: 'custom',
        category: '自定义',
        name: finalName,
        displayName: displayName || `${themeName} 自定义`,
        previewImage: previewImagePath,
        primaryColor: primaryColor,
        globalThemePath: `${baseDir}/theme.json`,
        pageThemePath: `${baseDir}/page-theme.json`,
      };

      const exists = idx.themes.some(t => t.id === finalName);
      if (!exists) {
        idx.themes.push(newThemeItem);
        idx.updatedAt = new Date().toISOString();
        await writeThemeIndex(idx);
        console.log(`[POST /api/themes] 索引已更新，添加新主题: ${finalName}`);
      } else {
        console.warn(`[POST /api/themes] 主题 ${finalName} 已存在，跳过索引更新`);
      }

      // ✅ 清空列表缓存
      invalidateThemeListCache();

      return NextResponse.json({ success: true, name: finalName });
    }

    // =============================================================
    // 通用创建
    // =============================================================
    const originalName = originalPresetId ? originalPresetId.split('_')[1] : 'theme';
    let counter = 1;
    let finalName = `Custom-${originalName}`;
    while (true) {
      const dirKey = `themes/custom/${finalName}`;
      try {
        await storage.read(`${dirKey}/theme.json`, 'utf8');
        finalName = `Custom-${originalName}${counter}`;
        counter++;
      } catch {
        break;
      }
    }

    const baseDir = `themes/custom/${finalName}`;
    const themeData = {
      name: finalName,
      displayName: displayName || finalName,
      type: 'custom',
      colors: cssVariables || {},
      darkColors: darkCssVariables || {},
      darkMode: 'system',
    };
    await storage.write(`${baseDir}/theme.json`, JSON.stringify(themeData, null, 2), {
      contentType: 'application/json',
    });
    await storage.write(`${baseDir}/page-theme.json`, JSON.stringify({ pages: [] }, null, 2), {
      contentType: 'application/json',
    });

    let previewImagePath: string | null = null;
    if (originalPresetId) {
      const index = await readThemeIndex();
      const originalTheme = index?.themes.find(t => t.id === originalPresetId);
      if (originalTheme?.previewImage) {
        const srcKey = originalTheme.previewImage;
        const ext = srcKey.split('.').pop() || 'png';
        const destKey = `${baseDir}/preview.${ext}`;
        try {
          const imageBuffer = await storage.read(srcKey, 'binary');
          await storage.write(destKey, imageBuffer as Buffer, { contentType: `image/${ext}` });
          previewImagePath = destKey;
          console.log(`[POST /api/themes] 图片复制成功: ${srcKey} -> ${destKey}`);
        } catch (err) {
          console.warn(`[POST /api/themes] 图片复制失败: ${srcKey}`, err);
        }
      }
    }

    let idx = await readThemeIndex();
    if (!idx) {
      idx = await generateThemeIndex();
    }
    const newThemeItem: ThemeIndexItem = {
      id: finalName,
      type: 'custom',
      category: '自定义',
      name: finalName,
      displayName: displayName || finalName,
      previewImage: previewImagePath,
      primaryColor: CATEGORY_COLORS['自定义'],
      globalThemePath: `${baseDir}/theme.json`,
      pageThemePath: `${baseDir}/page-theme.json`,
    };
    const exists = idx.themes.some(t => t.id === finalName);
    if (!exists) {
      idx.themes.push(newThemeItem);
      idx.updatedAt = new Date().toISOString();
      await writeThemeIndex(idx);
    }

    // ✅ 清空列表缓存
    invalidateThemeListCache();

    return NextResponse.json({ success: true, name: finalName });
  } catch (error) {
    console.error('保存主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  cache = null;
  try {
    const { themeName } = await request.json();
    if (!themeName) {
      return NextResponse.json({ error: '缺少 themeName 参数' }, { status: 400 });
    }

    const index = await getThemeIndex();
    const themeItem = index.themes.find(t => t.id === themeName);
    if (!themeItem) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    await writeActiveTheme(themeItem);

    index.activeTheme = themeName;
    index.updatedAt = new Date().toISOString();
    await writeThemeIndex(index);

    // ✅ 清空列表缓存（activeTheme 变了）
    invalidateThemeListCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('激活主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}