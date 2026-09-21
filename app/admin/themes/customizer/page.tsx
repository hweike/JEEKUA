'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import Toast from '@/components/Toast';
import { ThemeData, EditScope, ThemeIndexItem } from './types';
import { computeDiff } from '@/lib/theme';
import GlobalTabs from './components/global/GlobalTabs';
import PageTabs from './components/page/PageTabs';

// ============================================================
// 页面路径映射
// ============================================================
const PAGE_TYPE_MAP: Record<string, string> = {
  home: '/',
  products: '/products/*',
  blog: '/blog/*',
  docs: '/docs/*',
  video: '/videos/*',
  inquiry: '/inquiry/*',
  account: '/account/*',
  custom: '',
  search: '/search',
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  products: '产品页',
  blog: 'Blog',
  docs: '文档页',
  video: '视频页',
  inquiry: '询盘页',
  account: '用户中心',
  custom: '普通页面',
  search: '搜索页',
};

const PAGE_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: 'home', label: '首页' },
  { id: 'products', label: '产品页' },
  { id: 'blog', label: 'Blog' },
  { id: 'docs', label: '文档页' },
  { id: 'video', label: '视频页' },
  { id: 'inquiry', label: '询盘页' },
  { id: 'account', label: '用户中心' },
  { id: 'custom', label: '普通页面' },
  { id: 'search', label: '搜索页' },
];

const DEFAULT_THEME: ThemeData = {
  colors: {},
  darkColors: {},
  typography: {},
  spacing: {},
  borderRadius: {},
  shadows: {},
  animation: {},
  darkMode: 'system',
};

const STORAGE_KEY = 'theme-editor-mode';

/**
 * 将任意 darkMode 值规范化为合法类型
 */
function normalizeDarkMode(value: string | undefined): 'system' | 'light' | 'dark' {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

/**
 * 规范化主题数据，统一为 { colors, darkColors, darkMode } 格式
 */
function normalizeThemeData(data: any): {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  darkMode: 'system' | 'light' | 'dark';
} {
  if (!data || typeof data !== 'object') {
    return { colors: {}, darkColors: {}, darkMode: 'system' };
  }

  if (data.colors !== undefined && data.darkColors !== undefined) {
    return {
      colors: data.colors || {},
      darkColors: data.darkColors || {},
      darkMode: normalizeDarkMode(data.darkMode),
    };
  }

  if (data.cssVars) {
    const light = data.cssVars.light || {};
    const dark = data.cssVars.dark || {};
    const theme = data.cssVars.theme || {};
    return {
      colors: { ...light, ...theme },
      darkColors: { ...dark, ...theme },
      darkMode: normalizeDarkMode(data.darkMode),
    };
  }

  if (data.colors || data.darkColors) {
    return {
      colors: data.colors || {},
      darkColors: data.darkColors || {},
      darkMode: normalizeDarkMode(data.darkMode),
    };
  }

  return { colors: {}, darkColors: {}, darkMode: 'system' };
}

export default function ThemeEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const themeId = searchParams.get('themeId');

  // ---------- 状态 ----------
  const [editScope, setEditScope] = useState<EditScope>('global');
  const [selectedPageType, setSelectedPageType] = useState<string>('home');
  const [customPath, setCustomPath] = useState<string>('');
  const [theme, setTheme] = useState<ThemeData>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [themeItem, setThemeItem] = useState<ThemeIndexItem | null>(null);
  const [originalGlobal, setOriginalGlobal] = useState<ThemeData | null>(null);
  const [originalPageOverrides, setOriginalPageOverrides] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [baseCssDefaults, setBaseCssDefaults] = useState<Record<string, string>>({});

  // ✅ 新增：记录"已保存的页面覆盖"版本，用于判断 pageTheme 是否真变了
  const lastSavedPageOverridesRef = useRef<any>(null);

  // ---------- 计算当前页面路径 ----------
  const pagePath = useMemo(() => {
    if (selectedPageType === 'custom') return customPath || '/custom';
    return PAGE_TYPE_MAP[selectedPageType] || '/';
  }, [selectedPageType, customPath]);

  // ---------- 从已加载的 originalPageOverrides 中提取当前页面覆盖 ----------
  const getCurrentPageOverride = useCallback(() => {
    const pages = originalPageOverrides?.pages || [];
    return pages.find((p: any) => p.pagePath === pagePath)?.overrides || {};
  }, [originalPageOverrides, pagePath]);

  // ---------- 检测未保存修改 ----------
  const hasUnsavedChanges = useMemo(() => {
    if (editScope === 'global') {
      const diff = computeDiff(originalGlobal || DEFAULT_THEME, theme);
      return Object.keys(diff).length > 0;
    } else {
      const originalOverride = getCurrentPageOverride();
      const diff = computeDiff(originalOverride, theme);
      return Object.keys(diff).length > 0;
    }
  }, [editScope, theme, originalGlobal, getCurrentPageOverride]);

  // ---------- 加载全局主题（通过 API） ----------
  const loadTheme = useCallback(async () => {
    console.log('[loadTheme] 开始加载全局主题...');
    setLoading(true);
    try {
      let themeIdToLoad = themeId;
      if (!themeIdToLoad) {
        const activeRes = await fetch('/api/themes');
        if (!activeRes.ok) throw new Error('获取激活主题失败');
        const activeData = await activeRes.json();
        themeIdToLoad = activeData.activeTheme;
        if (!themeIdToLoad) throw new Error('未找到激活主题');
      }

      const detailRes = await fetch(`/api/themes/${encodeURIComponent(themeIdToLoad)}`);
      if (!detailRes.ok) throw new Error('获取主题详情失败');
      const data = await detailRes.json();

      console.log('[loadTheme] API 返回数据:', data);

      const normalized = normalizeThemeData(data);

      console.log('[loadTheme] 规范化后的数据:', normalized);

      // ============================================================
      // 为导航栏、页脚、公告栏变量提供默认值（从基础变量派生）
      // 这些默认值与页面主题中的 fallback 规则保持一致
      // ============================================================
      const defaultColors = {
        // 导航栏
        'navbar-bg': normalized.colors['navbar-bg'] || normalized.colors['background'] || '#ffffff',
        'navbar-text': normalized.colors['navbar-text'] || normalized.colors['foreground'] || '#000000',
        'navbar-hover-bg': normalized.colors['navbar-hover-bg'] || normalized.colors['secondary'] || '#e5e7eb',
        'navbar-hover-text': normalized.colors['navbar-hover-text'] || normalized.colors['secondary-foreground'] || '#000000',
        'navbar-active-text': normalized.colors['navbar-active-text'] || normalized.colors['primary'] || '#2563eb',
        'navbar-divider-color': normalized.colors['navbar-divider-color'] || normalized.colors['border'] || '#e5e7eb',
        // 公告栏
        'announcement-bg': normalized.colors['announcement-bg'] || normalized.colors['popover'] || '#ffffff',
        'announcement-text': normalized.colors['announcement-text'] || normalized.colors['popover-foreground'] || '#000000',
        // 页脚
        'footer-bg': normalized.colors['footer-bg'] || normalized.colors['background'] || '#f8fafc',
        'footer-text': normalized.colors['footer-text'] || normalized.colors['foreground'] || '#000000',
        'footer-link': normalized.colors['footer-link'] || normalized.colors['primary'] || '#2563eb',
        'footer-link-hover': normalized.colors['footer-link-hover'] || normalized.colors['accent'] || '#3b82f6',
        'footer-divider-color': normalized.colors['footer-divider-color'] || normalized.colors['border'] || '#e5e7eb',
      };

      const defaultDarkColors = {
        'navbar-bg': normalized.darkColors['navbar-bg'] || normalized.darkColors['background'] || '#1f2937',
        'navbar-text': normalized.darkColors['navbar-text'] || normalized.darkColors['foreground'] || '#f9fafb',
        'navbar-hover-bg': normalized.darkColors['navbar-hover-bg'] || normalized.darkColors['secondary'] || '#374151',
        'navbar-hover-text': normalized.darkColors['navbar-hover-text'] || normalized.darkColors['secondary-foreground'] || '#f9fafb',
        'navbar-active-text': normalized.darkColors['navbar-active-text'] || normalized.darkColors['primary'] || '#60a5fa',
        'navbar-divider-color': normalized.darkColors['navbar-divider-color'] || normalized.darkColors['border'] || '#374151',
        'announcement-bg': normalized.darkColors['announcement-bg'] || normalized.darkColors['popover'] || '#374151',
        'announcement-text': normalized.darkColors['announcement-text'] || normalized.darkColors['popover-foreground'] || '#f9fafb',
        'footer-bg': normalized.darkColors['footer-bg'] || normalized.darkColors['background'] || '#111827',
        'footer-text': normalized.darkColors['footer-text'] || normalized.darkColors['foreground'] || '#f9fafb',
        'footer-link': normalized.darkColors['footer-link'] || normalized.darkColors['primary'] || '#60a5fa',
        'footer-link-hover': normalized.darkColors['footer-link-hover'] || normalized.darkColors['accent'] || '#93c5fd',
        'footer-divider-color': normalized.darkColors['footer-divider-color'] || normalized.darkColors['border'] || '#374151',
      };

      const safeTheme: ThemeData = {
        colors: { ...normalized.colors, ...defaultColors },
        darkColors: { ...normalized.darkColors, ...defaultDarkColors },
        typography: data.typography || {},
        spacing: data.spacing || {},
        borderRadius: data.borderRadius || {},
        shadows: data.shadows || {},
        animation: data.animation || {},
        darkMode: normalized.darkMode,
      };

      console.log('[loadTheme] 构建的 safeTheme:', safeTheme);

      const colorKeys = Object.keys(safeTheme.colors);
      if (colorKeys.length === 0) {
        console.warn('[loadTheme] ⚠️ 警告：colors 为空，请检查 API 返回数据');
      } else {
        console.log('[loadTheme] colors 包含键:', colorKeys.slice(0, 10));
      }

      setTheme(safeTheme);
      setOriginalGlobal(JSON.parse(JSON.stringify(safeTheme)));

      const item: ThemeIndexItem = {
        id: data.id || themeIdToLoad,
        type: data.type || 'custom',
        category: data.category || '自定义',
        name: data.name || themeIdToLoad,
        displayName: data.displayName || themeIdToLoad,
        previewImage: data.previewImage || null,
        primaryColor: data.primaryColor || '#8b5cf6',
        globalThemePath: data.globalThemePath || `themes/custom/${themeIdToLoad}/theme.json`,
        pageThemePath: data.pageThemePath || `themes/custom/${themeIdToLoad}/page-theme.json`,
      };
      setThemeItem(item);

      setOriginalPageOverrides(data.pageTheme || { pages: [] });

      // ✅ 初始化"已保存版本"
      lastSavedPageOverridesRef.current = data.pageTheme || { pages: [] };

      console.log('[loadTheme] 全局主题加载完成');
      return item;
    } catch (err) {
      console.error('[loadTheme] 加载失败:', err);
      setToast({
        message: err instanceof Error ? err.message : '加载主题失败，请刷新重试',
        type: 'error',
      });
      setTheme(DEFAULT_THEME);
      setOriginalGlobal(DEFAULT_THEME);
      return null;
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  // ---------- 应用页面主题 ----------
  const applyPageTheme = useCallback(() => {
    const override = getCurrentPageOverride();
    const pageTheme: ThemeData = {
      colors: override.colors || {},
      darkColors: override.darkColors || {},
      typography: override.typography || {},
      spacing: override.spacing || {},
      borderRadius: override.borderRadius || {},
      shadows: override.shadows || {},
      animation: override.animation || {},
      darkMode: override.darkMode || 'system',
    };
    console.log('[applyPageTheme] 应用页面主题:', pageTheme);
    setTheme(pageTheme);
  }, [getCurrentPageOverride]);

  // ---------- 存储模式到 localStorage ----------
  const saveModeToStorage = useCallback((scope: EditScope, pageType: string, path: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        editScope: scope,
        selectedPageType: pageType,
        customPath: path,
      }));
    } catch {}
  }, []);

  const restoreModeFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          editScope: data.editScope as EditScope || 'global',
          selectedPageType: data.selectedPageType || 'home',
          customPath: data.customPath || '',
        };
      }
    } catch {}
    return { editScope: 'global' as EditScope, selectedPageType: 'home', customPath: '' };
  }, []);

  // ---------- 初始化 ----------
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      console.log('[初始化] 开始...');
      const restored = restoreModeFromStorage();
      console.log('[初始化] 恢复的模式:', restored);
      setEditScope(restored.editScope);
      setSelectedPageType(restored.selectedPageType);
      setCustomPath(restored.customPath);

      const item = await loadTheme();
      console.log('[初始化] 全局主题加载完毕，themeItem:', item);

      if (restored.editScope === 'page' && item) {
        console.log('[初始化] 页面模式，应用页面主题');
        applyPageTheme();
      } else {
        console.log('[初始化] 全局模式，不加载页面主题');
      }
      console.log('[初始化] 完成');
    };

    init();
  }, [loadTheme, applyPageTheme, restoreModeFromStorage]);

  // ✅ 加载基础 CSS 默认值（通过 API 调用，避免在客户端直接使用 fs）
  useEffect(() => {
    fetch('/api/themes/base-defaults')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch base defaults');
        return res.json();
      })
      .then(setBaseCssDefaults)
      .catch((err) => {
        console.error('[加载基础 CSS 默认值] 失败:', err);
      });
  }, []);

  // ---------- 切换模式 ----------
  const handleScopeChange = useCallback(async (newScope: EditScope) => {
    if (newScope === editScope) return;
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        '当前有未保存的修改，切换模式将丢失这些修改。\n确定要继续吗？'
      );
      if (!confirmed) return;
    }

    setEditScope(newScope);
    saveModeToStorage(newScope, selectedPageType, customPath);

    if (newScope === 'global') {
      await loadTheme();
    } else {
      applyPageTheme();
    }
  }, [editScope, hasUnsavedChanges, loadTheme, applyPageTheme, selectedPageType, customPath, saveModeToStorage]);

  // ---------- 当页面路径或模式变化时，自动应用页面主题 ----------
  useEffect(() => {
    if (editScope === 'page' && themeItem) {
      applyPageTheme();
    }
  }, [editScope, pagePath, themeItem, applyPageTheme]);

  // ---------- 更新主题数据 ----------
  const updateTheme = useCallback(<K extends keyof ThemeData>(
    category: K,
    key: string,
    value: string
  ) => {
    setTheme((prev) => {
      const prevCategory = prev[category] as Record<string, string> || {};
      return {
        ...prev,
        [category]: {
          ...prevCategory,
          [key]: value,
        },
      };
    });
  }, []);

  // ---------- 保存主题 ----------
  const saveTheme = async () => {
    if (isSaving) return;
    if (!themeItem) {
      setToast({ message: '未加载主题，无法保存', type: 'error' });
      return;
    }

    console.log('[保存主题] 模式:', editScope);
    setIsSaving(true);

    try {
      if (editScope === 'global') {
        // ============================================================
        // ✅ 关键优化：只有 pageTheme 真的变了，才把它带上
        // ============================================================
        const pageOverridesStr = JSON.stringify(originalPageOverrides ?? null);
        const lastSavedPageOverridesStr = JSON.stringify(
          lastSavedPageOverridesRef.current ?? null
        );

        const payload: any = {
          colors: theme.colors,
          darkColors: theme.darkColors,
          darkMode: theme.darkMode,
          typography: theme.typography,
          spacing: theme.spacing,
          borderRadius: theme.borderRadius,
          shadows: theme.shadows,
          animation: theme.animation,
        };

        // ✅ 只在页面覆盖真变了时才传 pageTheme
        const pageOverridesChanged = pageOverridesStr !== lastSavedPageOverridesStr;
        if (pageOverridesChanged) {
          payload.pageTheme = originalPageOverrides;
        }

        console.log('[保存主题] 全局模式 - pageOverridesChanged:', pageOverridesChanged);

        const res = await fetch(`/api/themes/${encodeURIComponent(themeItem.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());

        // ✅ 保存成功后，记录当前 pageOverrides 作为"已保存版本"
        lastSavedPageOverridesRef.current = originalPageOverrides;

        setOriginalGlobal({
          colors: theme.colors,
          darkColors: theme.darkColors,
          typography: theme.typography,
          spacing: theme.spacing,
          borderRadius: theme.borderRadius,
          shadows: theme.shadows,
          animation: theme.animation,
          darkMode: theme.darkMode,
        });
        setToast({ message: '全局主题已保存', type: 'success' });
      } else {
        const path = selectedPageType === 'custom' ? customPath : PAGE_TYPE_MAP[selectedPageType] || '/';
        const newOverride = { ...theme };

        const isEmpty = Object.keys(newOverride).length === 0 ||
          (Object.keys(newOverride).every(key => {
            const val = (newOverride as any)[key];
            return !val || Object.keys(val).length === 0;
          }));

        const pages = originalPageOverrides?.pages ? [...originalPageOverrides.pages] : [];
        const existingIndex = pages.findIndex((p: any) => p.pagePath === path);

        if (isEmpty) {
          if (existingIndex !== -1) pages.splice(existingIndex, 1);
        } else {
          if (existingIndex !== -1) {
            pages[existingIndex].overrides = newOverride;
          } else {
            pages.push({ pagePath: path, overrides: newOverride });
          }
        }

        const pageDataToSave = { pages };
        const payload = { pageTheme: pageDataToSave };
        console.log('[保存主题] 页面模式 - 保存 payload:', payload);
        const res = await fetch(`/api/themes/${encodeURIComponent(themeItem.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());

        setOriginalPageOverrides(pageDataToSave);
        // ✅ 页面模式保存后，也要更新"已保存版本"
        lastSavedPageOverridesRef.current = pageDataToSave;
        setToast({ message: `页面主题已保存 (${path})`, type: 'success' });
      }
    } catch (err) {
      console.error('[保存主题] 失败:', err);
      setToast({ message: '保存失败，请重试', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ---------- 页面类型切换处理 ----------
  const handlePageTypeChange = useCallback((value: string) => {
    setSelectedPageType(value);
    saveModeToStorage(editScope, value, customPath);
  }, [editScope, customPath, saveModeToStorage]);

  const handleCustomPathChange = useCallback((value: string) => {
    setCustomPath(value);
    saveModeToStorage(editScope, selectedPageType, value);
  }, [editScope, selectedPageType, saveModeToStorage]);

  // ---------- 加载状态 ----------
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-gray-500 text-lg">加载主题中...</div>
          <div className="text-xs text-gray-400 mt-2">请检查控制台日志</div>
        </div>
      </div>
    );
  }

  // ---------- 渲染 ----------
  return (
    <div className="container mx-auto p-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">
          {editScope === 'global' 
            ? '编辑全局主题' 
            : `编辑${PAGE_TYPE_LABELS[selectedPageType] || '页面'}主题`
          }
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-md border">
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                editScope === 'global' ? 'bg-white shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => handleScopeChange('global')}
            >
              全局
            </button>
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                editScope === 'page' ? 'bg-white shadow-sm' : 'text-gray-500'
              }`}
              onClick={() => handleScopeChange('page')}
            >
              页面
            </button>
          </div>

          {editScope === 'page' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedPageType}
                onChange={(e) => handlePageTypeChange(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                {PAGE_TYPE_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              {selectedPageType === 'custom' && (
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => handleCustomPathChange(e.target.value)}
                  placeholder="如 /about 或 /policy"
                  className="px-3 py-1 border rounded text-sm w-40"
                />
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/themes')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              返回主题库
            </button>
            <button
              onClick={saveTheme}
              disabled={isSaving}
              className={`px-4 py-2 rounded transition ${
                isSaving
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaving ? '保存中...' : '保存主题'}
            </button>
          </div>
        </div>
      </div>

      {editScope === 'page' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm">
          💡 此处设置仅影响当前页面，全局主题保持不变。
        </div>
      )}

      {editScope === 'global' ? (
        <Tabs.Root defaultValue="colors" className="space-y-4">
          <Tabs.List className="flex flex-wrap gap-1 border-b">
            <>
              <TabTrigger value="colors">亮色颜色</TabTrigger>
              <TabTrigger value="darkColors">暗色颜色</TabTrigger>
              <TabTrigger value="typography">文字</TabTrigger>
              <TabTrigger value="spacing">间距</TabTrigger>
              <TabTrigger value="radius">圆角</TabTrigger>
              <TabTrigger value="shadows">阴影</TabTrigger>
              <TabTrigger value="animation">动效</TabTrigger>
              {/* ✅ 已移除「导航栏」和「页脚」标签，其内容已整合到「亮色颜色」的对应分组中 */}
              <TabTrigger value="darkMode">深色模式</TabTrigger>
            </>
          </Tabs.List>

          <GlobalTabs
            colors={theme.colors}
            darkColors={theme.darkColors}
            typography={theme.typography}
            spacing={theme.spacing}
            borderRadius={theme.borderRadius}
            shadows={theme.shadows}
            animation={theme.animation}
            darkMode={theme.darkMode}
            baseCssDefaults={baseCssDefaults}
            onUpdate={updateTheme}
            onDarkModeUpdate={(value) =>
              setTheme((prev) => ({ ...prev, darkMode: value as 'system' | 'light' | 'dark' }))
            }
          />
        </Tabs.Root>
      ) : (
        <PageTabs
          pageType={selectedPageType}
          customPath={customPath}
          theme={theme}
          globalTheme={originalGlobal || undefined}
          onUpdate={updateTheme}
          onDarkModeUpdate={(value) =>
            setTheme((prev) => ({ ...prev, darkMode: value as 'system' | 'light' | 'dark' }))
          }
        />
      )}
    </div>
  );
}

function TabTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Tabs.Trigger
      value={value}
      className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900"
    >
      {children}
    </Tabs.Trigger>
  );
}