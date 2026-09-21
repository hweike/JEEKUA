// app/api/themes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getThemeById,
  readGlobalTheme,
  readPageTheme,
  writeGlobalTheme,
  writePageTheme,
  getThemeIndex,
  setActiveThemeId,
  writeThemeIndex,
  readThemeIndex,
  invalidateThemeListCache,
} from '@/lib/theme';
import { getPrivateStorage } from '@/lib/storage/factory';

// ============================================================
// 辅助：判断是否颜色值
// ============================================================
function isColorValue(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value.startsWith('oklch') ||
    value.startsWith('oklab') ||
    value.startsWith('lab') ||
    value.startsWith('lch') ||
    value.startsWith('color(') ||
    value.startsWith('var(') ||
    value === 'transparent' ||
    value === 'currentColor'
  );
}

// ============================================================
// 辅助：从对象中提取颜色变量
// ============================================================
function filterColorVars(obj: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value !== '' && isColorValue(value)) {
      result[key] = value;
    }
  }
  return result;
}

// ============================================================
// 辅助：按前缀提取非颜色变量
// ============================================================
function extractByPrefix(
  obj: Record<string, any>,
  prefixes: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (prefixes.some((prefix) => key === prefix || key.startsWith(prefix))) {
      if (typeof value === 'string' && value !== '') {
        result[key] = value;
      }
    }
  }
  return result;
}

// ============================================================
// 辅助：从 cssVars.theme 中提取各类非颜色变量
// ============================================================
function extractNonColorFromTheme(theme: Record<string, any>) {
  return {
    typography: extractByPrefix(theme, [
      'font-',
      'text-',
      'line-height',
      'letter-spacing',
      'tracking-',
    ]),
    spacing: extractByPrefix(theme, [
      'spacing',
      'container-padding',
      'section-gap',
      'grid-gap',
      'product-card-padding',
    ]),
    borderRadius: extractByPrefix(theme, [
      'radius',
      'product-card-radius',
      'btn-radius',
      'input-radius',
    ]),
    shadows: extractByPrefix(theme, [
      'shadow-',
      'shadow',
      'product-card-shadow',
      'product-card-hover-shadow',
      'dropdown-shadow',
      'btn-shadow',
    ]),
    animation: extractByPrefix(theme, ['transition-']),
  };
}

// ============================================================
// 辅助：规范化主题数据（提取 colors 和 darkColors）
// ============================================================
function normalizeThemeData(raw: any): {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  darkMode: string;
} {
  if (!raw) {
    return { colors: {}, darkColors: {}, darkMode: 'system' };
  }

  // 如果已经是 { colors, darkColors } 格式
  if (raw.colors !== undefined && raw.darkColors !== undefined) {
    return {
      colors: raw.colors || {},
      darkColors: raw.darkColors || {},
      darkMode: raw.darkMode || 'system',
    };
  }

  // 如果是 { cssVars: { light, dark, theme } } 格式
  if (raw.cssVars) {
    const light = raw.cssVars.light || {};
    const dark = raw.cssVars.dark || {};
    const theme = raw.cssVars.theme || {};
    return {
      colors: { ...light, ...theme },
      darkColors: { ...dark, ...theme },
      darkMode: raw.darkMode || 'system',
    };
  }

  // 降级
  return { colors: {}, darkColors: {}, darkMode: 'system' };
}

// ============================================================
// GET: 获取主题详情
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: themeId } = await params;
  const themeItem = await getThemeById(themeId);
  if (!themeItem) {
    return NextResponse.json({ error: '主题不存在' }, { status: 404 });
  }

  const [global, page] = await Promise.all([
    readGlobalTheme(themeItem),
    readPageTheme(themeItem),
  ]);

  const normalized = normalizeThemeData(global);

  // ✅ 从 cssVars.theme 中提取非颜色变量
  const themeVars = global.cssVars?.theme || {};

  // ✅ 兼容过渡期：若顶层有旧数据，优先使用；否则从 cssVars.theme 提取
  const extracted = extractNonColorFromTheme(themeVars);

  const typography = {
    ...extracted.typography,
    ...(global.typography || {}), // 兼容旧格式（顶层优先）
  };
  const spacing = {
    ...extracted.spacing,
    ...(global.spacing || {}),
  };
  const borderRadius = {
    ...extracted.borderRadius,
    ...(global.borderRadius || {}),
  };
  const shadows = {
    ...extracted.shadows,
    ...(global.shadows || {}),
  };
  const animation = {
    ...extracted.animation,
    ...(global.animation || {}),
  };

  return NextResponse.json({
    id: themeItem.id,
    name: themeItem.name,
    displayName: themeItem.displayName,
    type: themeItem.type,
    category: themeItem.category,
    previewImage: themeItem.previewImage,
    primaryColor: themeItem.primaryColor,
    globalThemePath: themeItem.globalThemePath,
    pageThemePath: themeItem.pageThemePath,
    colors: normalized.colors,
    darkColors: normalized.darkColors,
    darkMode: normalized.darkMode,
    // ✅ 返回非颜色变量（格式保持不变）
    typography,
    spacing,
    borderRadius,
    shadows,
    animation,
    pageTheme: page,
  });
}

// ============================================================
// PUT: 更新主题（并行写 + 索引异步写 + 清列表缓存）
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: themeId } = await params;
    const body = await request.json();
    const {
      colors,
      darkColors,
      darkMode,
      pageTheme,
      typography,
      spacing,
      borderRadius,
      shadows,
      animation,
    } = body;

    const themeItem = await getThemeById(themeId);
    if (!themeItem) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    // ✅ 并行写入：global + page 互不依赖
    const writePromises: Promise<void>[] = [];

    // =============================================================
    // 1. 全局主题
    // =============================================================
    const hasGlobalUpdate =
      colors !== undefined ||
      darkColors !== undefined ||
      darkMode !== undefined ||
      typography !== undefined ||
      spacing !== undefined ||
      borderRadius !== undefined ||
      shadows !== undefined ||
      animation !== undefined;

    if (hasGlobalUpdate) {
      const currentGlobal = await readGlobalTheme(themeItem);

      // ✅ 提取当前 cssVars.theme（保留已有变量）
      const currentCssVars = currentGlobal.cssVars || {};
      const currentTheme = currentCssVars.theme || {};

      // ✅ 合并非颜色变量到 cssVars.theme
      const updatedTheme = {
        ...currentTheme,
        ...(typography || {}),
        ...(spacing || {}),
        ...(borderRadius || {}),
        ...(shadows || {}),
        ...(animation || {}),
      };

      // ✅ 过滤空字符串
      const cleanedTheme: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedTheme)) {
        if (typeof value === 'string' && value !== '') {
          cleanedTheme[key] = value;
        } else if (typeof value !== 'string') {
          cleanedTheme[key] = value as any;
        }
      }

      // ✅ 构建新的 cssVars
      const updatedCssVars = {
        ...currentCssVars,
        theme: cleanedTheme,
        light: colors !== undefined ? colors : currentCssVars.light || {},
        dark: darkColors !== undefined ? darkColors : currentCssVars.dark || {},
      };

      // ✅ 构建全局数据（保留未知字段，但删除旧的顶层非颜色字段）
      const {
        typography: _oldTypo,
        spacing: _oldSpacing,
        borderRadius: _oldRadius,
        shadows: _oldShadows,
        animation: _oldAnimation,
        ...restGlobal
      } = currentGlobal;

      const globalData = {
        ...restGlobal,
        name: themeItem.name,
        displayName: themeItem.displayName,
        cssVars: updatedCssVars,
        darkMode:
          darkMode !== undefined ? darkMode : currentGlobal.darkMode || 'system',
      };

      writePromises.push(writeGlobalTheme(themeItem, globalData));
    }

    // =============================================================
    // 2. 页面主题
    // =============================================================
    if (pageTheme !== undefined) {
      writePromises.push(writePageTheme(themeItem, pageTheme));
    }

    // ✅ 并行执行写入（3 次写 → 变成 max(1 次 global, 1 次 page)）
    await Promise.all(writePromises);

    // =============================================================
    // 3. 索引更新：fire-and-forget，不阻塞响应
    //    索引只存元信息（updatedAt），前台不依赖它
    // =============================================================
    void (async () => {
      try {
        const index = await getThemeIndex();
        index.updatedAt = new Date().toISOString();
        await writeThemeIndex(index);
      } catch (e) {
        console.error('[PUT] 异步写索引失败:', e);
      }
    })();

    // =============================================================
    // 4. ✅ 清空主题列表缓存（主题数据变了，列表需要刷新）
    // =============================================================
    invalidateThemeListCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新主题失败:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// ============================================================
// DELETE: 删除主题（同步索引 + 异步删文件）
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: themeId } = await params;
  console.log(`[DELETE] 开始删除主题: ${themeId}`);

  try {
    const storage = getPrivateStorage();

    let themeItem = await getThemeById(themeId);
    const themeExistsInIndex = !!themeItem;

    const baseDir = `themes/custom/${themeId}`;
    let fileExists = false;
    try {
      await storage.read(`${baseDir}/theme.json`, 'utf8');
      fileExists = true;
    } catch {}

    console.log(`[DELETE] 索引中存在: ${themeExistsInIndex}, 文件存在: ${fileExists}`);

    if (!themeExistsInIndex && !fileExists) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }

    if (themeExistsInIndex && themeItem!.type !== 'custom') {
      return NextResponse.json({ error: '只能删除自定义主题' }, { status: 403 });
    }

    // =============================================================
    // ✅ 同步：更新索引（保证列表立即刷新）
    // =============================================================
    let index = await readThemeIndex();
    if (!index) {
      index = await getThemeIndex(true);
    }

    const originalLength = index.themes.length;
    index.themes = index.themes.filter((t) => t.id !== themeId);
    if (index.themes.length < originalLength) {
      index.updatedAt = new Date().toISOString();
      await writeThemeIndex(index);
    }

    const currentIndex = await getThemeIndex();
    if (currentIndex.activeTheme === themeId) {
      const firstBuiltin = currentIndex.themes.find((t) => t.type === 'builtin');
      if (firstBuiltin) {
        await setActiveThemeId(firstBuiltin.id);
      } else {
        currentIndex.activeTheme = '';
        currentIndex.updatedAt = new Date().toISOString();
        await writeThemeIndex(currentIndex);
      }
    }

    // ✅ 清空列表缓存
    invalidateThemeListCache();

    // =============================================================
    // ✅ 异步：删除文件（不阻塞响应）
    // =============================================================
    void (async () => {
      const deleteStart = Date.now();
      try {
        let existingFiles: string[] = [];
        try {
          const listed = await storage.list(baseDir);
          existingFiles = listed.map((f: string) =>
            f.startsWith(baseDir) ? f : `${baseDir}/${f}`
          );
        } catch (err) {
          console.warn(`[DELETE] list 失败，用预定义列表:`, err);
          existingFiles = [
            `${baseDir}/theme.json`,
            `${baseDir}/page-theme.json`,
            `${baseDir}/preview.webp`,
            `${baseDir}/preview.png`,
            `${baseDir}/preview.jpg`,
            `${baseDir}/preview.jpeg`,
            `${baseDir}/preview.gif`,
          ];
        }

        const results = await Promise.allSettled(
          existingFiles.map((file: string) => storage.delete(file))
        );
        const deletedCount = results.filter(r => r.status === 'fulfilled').length;
        console.log(
          `[DELETE] 后台文件删除完成: ${deletedCount}/${existingFiles.length}，耗时 ${Date.now() - deleteStart}ms`
        );
      } catch (err) {
        console.error(`[DELETE] 后台文件删除失败: ${themeId}`, err);
      }
    })();

    // ✅ 立即返回，不等文件删除完成
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE] 删除主题 ${themeId} 失败:`, error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}