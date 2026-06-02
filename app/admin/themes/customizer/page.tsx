'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HexColorPicker } from 'react-colorful';
import * as Tabs from '@radix-ui/react-tabs';

const safeString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.backgroundColor) return String(value.backgroundColor);
    if (value.color) return String(value.color);
    if (value.background) return String(value.background);
    const keys = Object.keys(value);
    if (keys.length === 1 && typeof value[keys[0]] === 'string') return value[keys[0]];
    return '';
  }
  return String(value);
};

const getNumberFromValue = (value: any, unit: string = 'rem'): number => {
  const str = safeString(value);
  const match = str.match(new RegExp(`([\\d.]+)${unit}`));
  if (match) return parseFloat(match[1]);
  if (str.endsWith('px')) return parseFloat(str) / 16;
  if (str.endsWith('rem')) return parseFloat(str);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const cleanColors = (colors: any): any => {
  if (!colors || typeof colors !== 'object') return {};
  const cleaned: any = {};
  for (const key in colors) {
    const val = colors[key];
    if (typeof val === 'object' && val !== null) {
      const extracted = val.backgroundColor ?? val.color ?? val.background ?? Object.values(val)[0];
      cleaned[key] = extracted ? String(extracted) : '';
    } else {
      cleaned[key] = String(val);
    }
  }
  return cleaned;
};

const colorLabels: Record<string, string> = {
  background: '页面背景色',
  foreground: '页面文字色',
  card: '卡片背景色',
  'card-foreground': '卡片文字色',
  popover: '弹窗背景色',
  'popover-foreground': '弹窗文字色',
  primary: '主色调',
  'primary-foreground': '主色调文字色',
  secondary: '次要色',
  'secondary-foreground': '次要色文字色',
  muted: '柔和背景色',
  'muted-foreground': '柔和文字色',
  accent: '强调色',
  'accent-foreground': '强调色文字色',
  destructive: '警示色',
  'destructive-foreground': '警示色文字色',
  border: '边框色',
  input: '输入框边框色',
  ring: '聚焦环颜色',
  radius: '圆角大小',
  'chart-1': '图表颜色 1',
  'chart-2': '图表颜色 2',
  'chart-3': '图表颜色 3',
  'chart-4': '图表颜色 4',
  'chart-5': '图表颜色 5',
  sidebar: '侧边栏背景',
  'sidebar-foreground': '侧边栏文字',
  'sidebar-primary': '侧边栏主色',
  'sidebar-primary-foreground': '侧边栏主色文字',
  'sidebar-accent': '侧边栏强调色',
  'sidebar-accent-foreground': '侧边栏强调色文字',
  'sidebar-border': '侧边栏边框',
  'sidebar-ring': '侧边栏聚焦环',
  'navbar-bg': '导航栏背景色',
  'navbar-text': '导航栏文字色',
  'navbar-hover-bg': '导航栏悬浮背景',
  'navbar-hover-text': '导航栏悬浮文字',
  'navbar-active-text': '导航栏激活文字色',
  'footer-bg': '页脚背景色',
  'footer-text': '页脚文字色',
  'footer-link': '页脚链接色',
  'footer-link-hover': '页脚链接悬浮色',
};

// 自定义变量默认值（导航栏 + 页脚）
const DEFAULT_CUSTOM_VARS = {
  'navbar-bg': '#ffffff',
  'navbar-text': '#1f2937',
  'navbar-hover-bg': '#f3f4f6',
  'navbar-hover-text': '#3b82f6',
  'navbar-active-text': '#3b82f6',
  'footer-bg': '#ffffff',
  'footer-text': '#6b7280',
  'footer-link': '#3b82f6',
  'footer-link-hover': '#2563eb',
};

// 确保 colors 对象包含所有自定义变量（缺失则用默认值填充）
const ensureCustomVars = (colors: any) => {
  return { ...DEFAULT_CUSTOM_VARS, ...colors };
};

export default function ThemeEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetId = searchParams.get('presetId');
  const themeId = searchParams.get('themeId');
  const [theme, setTheme] = useState<any>({
    colors: {},
    darkColors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
    animation: {},
    darkMode: 'system',
  });
  const [loading, setLoading] = useState(true);
  const [activeColorVar, setActiveColorVar] = useState<string | null>(null);
  const [activeDarkColorVar, setActiveDarkColorVar] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const darkPickerRef = useRef<HTMLDivElement>(null);
  const [isShadowAdvanced, setIsShadowAdvanced] = useState(false);
  const [isEditingPreset, setIsEditingPreset] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [originalThemeId, setOriginalThemeId] = useState('');
  const [presetDisplayName, setPresetDisplayName] = useState('');

  useEffect(() => {
    if (themeId) {
      fetch(`/api/themes/${encodeURIComponent(themeId)}`)
        .then(res => res.json())
        .then(customTheme => {
          const customThemeData = {
            name: customTheme.name,
            displayName: customTheme.displayName,
            colors: ensureCustomVars(cleanColors(customTheme.cssVariables)),
            darkColors: cleanColors(customTheme.darkCssVariables || {}),
            typography: {},
            spacing: {},
            borderRadius: {},
            shadows: {},
            animation: {},
            darkMode: customTheme.darkMode || 'system',
          };
          setTheme(customThemeData);
          setIsEditingCustom(true);
          setOriginalThemeId(customTheme.name);
          setLoading(false);
        })
        .catch(err => {
          console.error('加载自定义主题失败', err);
          setLoading(false);
        });
    } else if (presetId) {
      fetch(`/api/theme-presets?presetId=${presetId}`)
        .then(res => res.json())
        .then(preset => {
          const presetTheme = {
            name: `Custom-${preset.name}`,
            displayName: `${preset.name} 自定义`,
            colors: ensureCustomVars(cleanColors(preset.cssVars.light)),
            darkColors: cleanColors(preset.cssVars.dark),
            typography: preset.typography || {},
            spacing: preset.spacing || {},
            borderRadius: preset.borderRadius || {},
            shadows: preset.shadows || {},
            animation: preset.animation || {},
            darkMode: 'system',
          };
          setTheme(presetTheme);
          setIsEditingPreset(true);
          setPresetDisplayName(preset.name);
          setLoading(false);
        })
        .catch(err => {
          console.error('加载预设主题失败', err);
          setLoading(false);
        });
    } else {
      fetch('/api/theme-activate')
        .then(res => res.json())
        .then(data => {
          const cleanedData = {
            ...data,
            colors: ensureCustomVars(cleanColors(data.colors)),
            darkColors: cleanColors(data.darkColors),
          };
          setTheme(cleanedData);
          setLoading(false);
        })
        .catch(err => {
          console.error('加载当前主题失败', err);
          setLoading(false);
        });
    }
  }, [presetId, themeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setActiveColorVar(null);
      }
      if (darkPickerRef.current && !darkPickerRef.current.contains(event.target as Node)) {
        setActiveDarkColorVar(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateNested = (category: string, key: string, value: string) => {
    setTheme((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const saveTheme = async () => {
    if (isEditingCustom) {
      const updatedTheme = {
        name: originalThemeId,
        displayName: theme.displayName,
        cssVariables: theme.colors,
        darkCssVariables: theme.darkColors,
        darkMode: theme.darkMode,
      };
      const res = await fetch(`/api/themes/${encodeURIComponent(originalThemeId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTheme),
      });
      if (res.ok) {
        const activeRes = await fetch('/api/themes?action=active');
        const activeData = await activeRes.json();
        if (activeData.activeTheme === originalThemeId) {
          await fetch('/api/theme-activate', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              colors: theme.colors,
              darkColors: theme.darkColors,
              darkMode: theme.darkMode,
            }),
          });
          for (const [key, value] of Object.entries(theme.colors)) {
            document.documentElement.style.setProperty(key, value as string);
          }
          alert('主题已更新并立即生效');
        } else {
          alert('自定义主题已更新');
        }
        window.location.reload();
      } else {
        alert('保存失败');
      }
        } else if (isEditingPreset) {
      const displayName = `${presetDisplayName} 自定义`;
      const customTheme = {
        displayName: displayName,
        cssVariables: theme.colors,
        darkCssVariables: theme.darkColors,
        originalPresetId: presetId,
      };
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customTheme),
      });
      if (res.ok) {
        const result = await res.json(); // 假设后端返回 { success: true, name: "Custom-xxx" }
        const newThemeId = result.name;
        alert(`自定义主题已保存：${displayName}`);
        // 跳转到新生成的自定义主题的编辑页面，而不是刷新当前页
        router.push(`/admin/themes/customizer?themeId=${encodeURIComponent(newThemeId)}`);
      } else {
        const errorData = await res.json();
        alert(`保存失败: ${errorData.error || '未知错误'}`);
      }
    } else {
      await fetch('/api/theme-activate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colors: theme.colors,
          darkColors: theme.darkColors,
          darkMode: theme.darkMode,
        }),
      });
      for (const [key, value] of Object.entries(theme.colors)) {
        document.documentElement.style.setProperty(key, value as string);
      }
      alert('保存成功，样式已更新');
      window.location.reload();
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;

  const colors = theme.colors || {};
  const darkColors = theme.darkColors || {};
  const typography = theme.typography || {};
  const spacing = theme.spacing || {};
  const borderRadius = theme.borderRadius || {};
  const shadows = theme.shadows || {};
  const animation = theme.animation || {};

  let pageTitle = '主题定制器';
  if (isEditingPreset) pageTitle = `复制预设主题(${presetDisplayName})`;
  else if (isEditingCustom) pageTitle = `编辑自定义主题(${theme.displayName || originalThemeId})`;

  const parseShadow = (shadowStr: string) => {
    const str = safeString(shadowStr);
    const regex = /([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+(.+)/;
    const match = str.match(regex);
    if (match) {
      return { x: match[1], y: match[3], blur: match[5], spread: match[7], color: match[9] };
    }
    return { x: '0', y: '4px', blur: '6px', spread: '-1px', color: 'rgb(0 0 0 / 0.1)' };
  };
  const shadowParts = parseShadow(shadows['--shadow-md']);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/themes')} className="px-4 py-2 bg-gray-200 rounded">返回主题库</button>
          <button onClick={saveTheme} className="bg-blue-600 text-white px-4 py-2 rounded">保存主题</button>
        </div>
      </div>

      <Tabs.Root defaultValue="colors" className="space-y-4">
       <Tabs.List className="flex flex-wrap space-x-1 border-b">
          <Tabs.Trigger value="colors" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            亮色颜色
          </Tabs.Trigger>
          <Tabs.Trigger value="darkColors" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            暗色颜色
          </Tabs.Trigger>
          <Tabs.Trigger value="typography" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            文字
          </Tabs.Trigger>
          <Tabs.Trigger value="spacing" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            间距
          </Tabs.Trigger>
          <Tabs.Trigger value="borderRadius" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            圆角
          </Tabs.Trigger>
          <Tabs.Trigger value="shadows" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            阴影
          </Tabs.Trigger>
          <Tabs.Trigger value="animation" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            动效
          </Tabs.Trigger>
          <Tabs.Trigger value="navbar" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            导航栏
          </Tabs.Trigger>
          <Tabs.Trigger value="footer" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            页脚
          </Tabs.Trigger>
          <Tabs.Trigger value="darkMode" className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900">
            深色模式
          </Tabs.Trigger>
        </Tabs.List>

        
       {/* 亮色颜色标签页 - 排除导航栏和页脚的自定义变量 */}
        <Tabs.Content value="colors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(colors)
              .filter(([key]) => {
                // 排除导航栏和页脚的自定义变量
                const excludeKeys = [
                  'navbar-bg', 'navbar-text', 'navbar-hover-bg', 'navbar-hover-text', 'navbar-active-text',
                  'footer-bg', 'footer-text', 'footer-link', 'footer-link-hover'
                ];
                return !excludeKeys.includes(key);
              })
              .map(([key, val]) => {
                const label = colorLabels[key] || key;
                const colorValue = safeString(val);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm w-32">{label}</label>
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                        style={{ backgroundColor: colorValue || '#ffffff' }}
                        onClick={() => setActiveColorVar(activeColorVar === key ? null : key)}
                      />
                      {activeColorVar === key && (
                        <div ref={pickerRef} className="absolute z-[9999] mt-2 bg-white p-3 rounded-lg shadow-xl border" style={{ right: 0 }}>
                          <HexColorPicker color={colorValue || '#ffffff'} onChange={(newColor) => updateNested('colors', key, newColor)} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Tabs.Content>

        {/* 暗色颜色标签页 */}
        <Tabs.Content value="darkColors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(darkColors).length === 0 ? (
              <div className="col-span-2 text-center text-gray-500">暂无暗色配置，请从预设主题复制或手动添加</div>
            ) : (
              Object.entries(darkColors).map(([key, val]) => {
                const label = colorLabels[key] || key;
                const colorValue = safeString(val);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm w-32">{label}</label>
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                        style={{ backgroundColor: colorValue || '#ffffff' }}
                        onClick={() => setActiveDarkColorVar(activeDarkColorVar === key ? null : key)}
                      />
                      {activeDarkColorVar === key && (
                        <div ref={darkPickerRef} className="absolute z-[9999] mt-2 bg-white p-3 rounded-lg shadow-xl border" style={{ right: 0 }}>
                          <HexColorPicker color={colorValue || '#ffffff'} onChange={(newColor) => updateNested('darkColors', key, newColor)} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Tabs.Content>

        {/* 文字标签页 */}
        <Tabs.Content value="typography" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">字体选择</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm mb-1">正文/标题字体</label>
                <select
                  value={safeString(typography['--font-family-sans'])}
                  onChange={(e) => updateNested('typography', '--font-family-sans', e.target.value)}
                  className="border rounded p-2 w-full"
                >
                  <option value="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif">系统默认</option>
                  <option value="Inter, system-ui, sans-serif">Inter</option>
                  <option value="Roboto, system-ui, sans-serif">Roboto</option>
                  <option value="'Noto Sans SC', system-ui, sans-serif">Noto Sans SC</option>
                  <option value="'PingFang SC', 'Microsoft YaHei', sans-serif">苹方/微软雅黑</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">等宽字体（代码）</label>
                <select
                  value={safeString(typography['--font-family-mono'])}
                  onChange={(e) => updateNested('typography', '--font-family-mono', e.target.value)}
                  className="border rounded p-2 w-full"
                >
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="'SF Mono', Monaco, 'Cascadia Code', monospace">SF Mono / Monaco</option>
                  <option value="'Fira Code', monospace">Fira Code</option>
                  <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                  <option value="'Source Code Pro', monospace">Source Code Pro</option>
                  <option value="'Ubuntu Mono', monospace">Ubuntu Mono</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">文字大小</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">正文大小（rem）</label>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={getNumberFromValue(typography['--font-size-base'], 'rem')}
                  onChange={(e) => updateNested('typography', '--font-size-base', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--font-size-base'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">小号文字大小（rem）</label>
                <input
                  type="range"
                  min="0.625"
                  max="1.25"
                  step="0.025"
                  value={getNumberFromValue(typography['--font-size-sm'], 'rem')}
                  onChange={(e) => updateNested('typography', '--font-size-sm', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--font-size-sm'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">大标题大小（rem）</label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={getNumberFromValue(typography['--font-size-2xl'], 'rem')}
                  onChange={(e) => updateNested('typography', '--font-size-2xl', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--font-size-2xl'])}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">文字粗细</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">正常文字粗细（100-900）</label>
                <input
                  type="range"
                  min="100"
                  max="900"
                  step="100"
                  value={parseInt(safeString(typography['--font-weight-normal'])) || 400}
                  onChange={(e) => updateNested('typography', '--font-weight-normal', e.target.value)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--font-weight-normal'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">加粗文字粗细</label>
                <input
                  type="range"
                  min="100"
                  max="900"
                  step="100"
                  value={parseInt(safeString(typography['--font-weight-bold'])) || 700}
                  onChange={(e) => updateNested('typography', '--font-weight-bold', e.target.value)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--font-weight-bold'])}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">行间距与字符间距</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">正文行间距（数字）</label>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.1"
                  value={parseFloat(safeString(typography['--line-height-normal'])) || 1.5}
                  onChange={(e) => updateNested('typography', '--line-height-normal', e.target.value)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--line-height-normal'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">字符间距（em）</label>
                <input
                  type="range"
                  min="-0.05"
                  max="0.1"
                  step="0.005"
                  value={getNumberFromValue(typography['--letter-spacing-normal'], 'em')}
                  onChange={(e) => updateNested('typography', '--letter-spacing-normal', `${e.target.value}em`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(typography['--letter-spacing-normal'])}</div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* 间距标签页 */}
        <Tabs.Content value="spacing" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">间距设置</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">基础间距单位（rem）</label>
                <input
                  type="range"
                  min="0.125"
                  max="0.5"
                  step="0.025"
                  value={getNumberFromValue(spacing['--spacing-unit'], 'rem')}
                  onChange={(e) => updateNested('spacing', '--spacing-unit', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(spacing['--spacing-unit'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">容器内边距（rem）</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.25"
                  value={getNumberFromValue(spacing['--container-padding'], 'rem')}
                  onChange={(e) => updateNested('spacing', '--container-padding', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(spacing['--container-padding'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">区块间距（rem）</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={getNumberFromValue(spacing['--section-gap'], 'rem')}
                  onChange={(e) => updateNested('spacing', '--section-gap', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">当前值：{safeString(spacing['--section-gap'])}</div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* 圆角标签页 */}
        <Tabs.Content value="borderRadius" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">圆角大小</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">默认圆角（按钮/卡片）</label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={getNumberFromValue(borderRadius['--radius'], 'rem')}
                  onChange={(e) => updateNested('borderRadius', '--radius', `${e.target.value}rem`)}
                  className="w-full"
                />
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-16 h-8 border bg-gray-100" style={{ borderRadius: `${getNumberFromValue(borderRadius['--radius'], 'rem')}rem` }} />
                  <span className="text-sm">{safeString(borderRadius['--radius'])}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">完全圆形（头像/徽章）</label>
                <select
                  value={safeString(borderRadius['--radius-full'])}
                  onChange={(e) => updateNested('borderRadius', '--radius-full', e.target.value)}
                  className="border rounded p-2 w-full"
                >
                  <option value="9999px">完全圆形（默认）</option>
                  <option value="1rem">大圆角（1rem）</option>
                  <option value="0.5rem">中等圆角（0.5rem）</option>
                  <option value="0.25rem">小圆角（0.25rem）</option>
                  <option value="0">无圆角</option>
                </select>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* 阴影标签页 */}
        <Tabs.Content value="shadows" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">阴影效果</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">阴影强度</label>
                <select
                  value={(() => {
                    const shadow = safeString(shadows['--shadow-md']);
                    if (shadow.includes('0 1px 3px')) return 'sm';
                    if (shadow.includes('0 4px 6px')) return 'md';
                    if (shadow.includes('0 10px 15px')) return 'lg';
                    return 'custom';
                  })()}
                  onChange={(e) => {
                    const preset = e.target.value;
                    if (preset === 'sm') updateNested('shadows', '--shadow-md', '0 1px 3px 0 rgb(0 0 0 / 0.1)');
                    else if (preset === 'md') updateNested('shadows', '--shadow-md', '0 4px 6px -1px rgb(0 0 0 / 0.1)');
                    else if (preset === 'lg') updateNested('shadows', '--shadow-md', '0 10px 15px -3px rgb(0 0 0 / 0.1)');
                  }}
                  className="border rounded p-2 w-full mb-2"
                >
                  <option value="sm">轻微阴影</option>
                  <option value="md">中等阴影（推荐）</option>
                  <option value="lg">明显阴影</option>
                  <option value="custom">自定义（见下方）</option>
                </select>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={isShadowAdvanced} onChange={(e) => setIsShadowAdvanced(e.target.checked)} />
                  <label className="text-sm">高级模式（自定义阴影值）</label>
                </div>

                {isShadowAdvanced && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs">X偏移</label>
                      <input
                        type="text"
                        value={shadowParts.x}
                        onChange={(e) => {
                          const newShadow = `${e.target.value} ${shadowParts.y} ${shadowParts.blur} ${shadowParts.spread} ${shadowParts.color}`;
                          updateNested('shadows', '--shadow-md', newShadow);
                        }}
                        className="border rounded p-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs">Y偏移</label>
                      <input
                        type="text"
                        value={shadowParts.y}
                        onChange={(e) => {
                          const newShadow = `${shadowParts.x} ${e.target.value} ${shadowParts.blur} ${shadowParts.spread} ${shadowParts.color}`;
                          updateNested('shadows', '--shadow-md', newShadow);
                        }}
                        className="border rounded p-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs">模糊半径</label>
                      <input
                        type="text"
                        value={shadowParts.blur}
                        onChange={(e) => {
                          const newShadow = `${shadowParts.x} ${shadowParts.y} ${e.target.value} ${shadowParts.spread} ${shadowParts.color}`;
                          updateNested('shadows', '--shadow-md', newShadow);
                        }}
                        className="border rounded p-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs">扩散半径</label>
                      <input
                        type="text"
                        value={shadowParts.spread}
                        onChange={(e) => {
                          const newShadow = `${shadowParts.x} ${shadowParts.y} ${shadowParts.blur} ${e.target.value} ${shadowParts.color}`;
                          updateNested('shadows', '--shadow-md', newShadow);
                        }}
                        className="border rounded p-1 w-full"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs">阴影颜色</label>
                      <input
                        type="text"
                        value={shadowParts.color}
                        onChange={(e) => {
                          const newShadow = `${shadowParts.x} ${shadowParts.y} ${shadowParts.blur} ${shadowParts.spread} ${e.target.value}`;
                          updateNested('shadows', '--shadow-md', newShadow);
                        }}
                        className="border rounded p-1 w-full"
                      />
                    </div>
                  </div>
                )}
                <div className="h-12 w-full bg-white rounded border mt-2" style={{ boxShadow: safeString(shadows['--shadow-md']) }} />
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* 动效标签页 */}
        <Tabs.Content value="animation" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">过渡动画速度</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">快速（鼠标悬停）</label>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={getNumberFromValue(animation['--transition-duration-150'], 'ms')}
                  onChange={(e) => updateNested('animation', '--transition-duration-150', `${e.target.value}ms`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">{safeString(animation['--transition-duration-150'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">正常（元素展开/收起）</label>
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="25"
                  value={getNumberFromValue(animation['--transition-duration-200'], 'ms')}
                  onChange={(e) => updateNested('animation', '--transition-duration-200', `${e.target.value}ms`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">{safeString(animation['--transition-duration-200'])}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">慢速（页面切换）</label>
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="50"
                  value={getNumberFromValue(animation['--transition-duration-300'], 'ms')}
                  onChange={(e) => updateNested('animation', '--transition-duration-300', `${e.target.value}ms`)}
                  className="w-full"
                />
                <div className="mt-1 text-sm">{safeString(animation['--transition-duration-300'])}</div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">动画曲线</h3>
            <select
              value={safeString(animation['--transition-timing-ease'])}
              onChange={(e) => updateNested('animation', '--transition-timing-ease', e.target.value)}
              className="border rounded p-2 w-full"
            >
              <option value="ease">平滑（ease）</option>
              <option value="linear">线性（linear）</option>
              <option value="ease-in">渐入（ease-in）</option>
              <option value="ease-out">渐出（ease-out）</option>
              <option value="ease-in-out">渐入渐出（ease-in-out）</option>
              <option value="cubic-bezier(0.4, 0, 0.2, 1)">自定义（默认缓动）</option>
            </select>
          </div>
        </Tabs.Content>

        {/* 导航栏标签页 - 使用不带 -- 的变量名 */}
        <Tabs.Content value="navbar" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">导航栏样式</h3>
            <div className="space-y-4">
              {[
                { var: 'navbar-bg', label: '背景色', defaultColor: '#ffffff' },
                { var: 'navbar-text', label: '文字色', defaultColor: '#1f2937' },
                { var: 'navbar-hover-bg', label: '悬浮背景色', defaultColor: '#f3f4f6' },
                { var: 'navbar-hover-text', label: '悬浮文字色', defaultColor: '#3b82f6' },
                { var: 'navbar-active-text', label: '悬停色（激活文字色）', defaultColor: '#3b82f6' },
              ].map((item) => {
                let colorValue = item.defaultColor;
                const raw = colors[item.var];
                if (typeof raw === 'string') colorValue = raw;
                else if (raw && typeof raw === 'object') {
                  const extracted = raw.backgroundColor ?? raw.color ?? raw.background;
                  if (typeof extracted === 'string') colorValue = extracted;
                }
                return (
                  <div key={item.var} className="flex items-center justify-between">
                    <label className="text-sm">{item.label}</label>
                    <input
                      type="color"
                      value={colorValue}
                      onChange={(e) => updateNested('colors', item.var, e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              提示：在 Navbar 组件中需使用对应的 CSS 变量，如 <code>backgroundColor: 'var(--navbar-bg)'</code>。
            </p>
          </div>
        </Tabs.Content>

        {/* 页脚标签页 */}
        <Tabs.Content value="footer" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">页脚样式</h3>
            <div className="space-y-4">
              {[
                { var: 'footer-bg', label: '背景色', defaultColor: '#ffffff' },
                { var: 'footer-text', label: '文字色', defaultColor: '#6b7280' },
                { var: 'footer-link', label: '链接文字色', defaultColor: '#3b82f6' },
                { var: 'footer-link-hover', label: '链接悬浮色', defaultColor: '#2563eb' },
              ].map((item) => {
                let colorValue = item.defaultColor;
                const raw = colors[item.var];
                if (typeof raw === 'string') colorValue = raw;
                else if (raw && typeof raw === 'object') {
                  const extracted = raw.backgroundColor ?? raw.color ?? raw.background;
                  if (typeof extracted === 'string') colorValue = extracted;
                }
                return (
                  <div key={item.var} className="flex items-center justify-between">
                    <label className="text-sm">{item.label}</label>
                    <input
                      type="color"
                      value={colorValue}
                      onChange={(e) => updateNested('colors', item.var, e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              提示：在 Footer 组件中需使用对应的 CSS 变量。
            </p>
          </div>
        </Tabs.Content>

        {/* 深色模式标签页 */}
        <Tabs.Content value="darkMode" className="space-y-4">
          <div>
            <label className="block font-semibold mb-2">深色模式策略</label>
            <select
              value={theme.darkMode || 'system'}
              onChange={(e) => setTheme((prev: any) => ({ ...prev, darkMode: e.target.value }))}
              className="border rounded p-2"
            >
              <option value="light">始终亮色</option>
              <option value="dark">始终深色</option>
              <option value="system">跟随系统</option>
            </select>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}