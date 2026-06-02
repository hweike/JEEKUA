'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';

interface Theme {
  id: string;
  name: string;
  displayName: string;
  type: 'builtin' | 'custom';
  cssVariables: Record<string, string>;
  darkCssVariables?: Record<string, string>; // 暗色模式变量
  previewImage?: string | null;
  category?: string;
}

const categoryChineseMap: Record<string, string> = {
  Blue: '蓝色',
  Red: '红色',
  Green: '绿色',
  Purple: '紫色',
  Orange: '橙色',
  Gray: '灰色',
  Pink: '粉色',
  Yellow: '黄色',
  Cyan: '青色',
  Indigo: '靛蓝',
  Teal: '蓝绿',
  Brown: '棕色',
  自定义: '自定义主题',
};

function getCategoryChinese(english: string): string {
  return categoryChineseMap[english] || english;
}

export default function ThemesPage() {
  const router = useRouter();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      const data = await res.json();
      // 为内置主题添加 category，并确保 darkCssVariables 存在
      const themesWithCategory = data.themes.map((theme: Theme) => {
        if (theme.type === 'builtin') {
          const category = theme.id.split('_')[0];
          return { ...theme, category, darkCssVariables: theme.darkCssVariables || {} };
        }
        return { ...theme, darkCssVariables: theme.darkCssVariables || {} };
      });
      setThemes(themesWithCategory);
      setActiveTheme(data.activeTheme);
      const builtinCategories = Array.from(new Set(themesWithCategory.filter((t: Theme) => t.type === 'builtin').map((t: Theme) => t.category!)));
      if (builtinCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(builtinCategories[0]);
      } else if (builtinCategories.length === 0 && themesWithCategory.some((t: Theme) => t.type === 'custom') && !selectedCategory) {
        setSelectedCategory('自定义');
      }
    } catch (error) {
      console.error('加载主题失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, []);

  const applyTheme = async (theme: Theme) => {
    setApplying(theme.id);
    try {
      // 1. 激活主题（记录当前激活的主题名称）
      const res = await fetch('/api/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName: theme.id }),
      });
      if (!res.ok) throw new Error('激活失败');

      // 2. 将主题的完整 CSS 变量（亮色+暗色）保存到 active-theme.json
      const activateRes = await fetch('/api/theme-activate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colors: theme.cssVariables,
          darkColors: theme.darkCssVariables || {},
          typography: {},
          spacing: {},
          borderRadius: {},
          shadows: {},
          animation: {},
          darkMode: 'system', // 可以后续扩展
        }),
      });
      if (activateRes.ok) {
        // 动态更新当前页面的亮色 CSS 变量
        for (const [key, value] of Object.entries(theme.cssVariables)) {
          document.documentElement.style.setProperty(key, value);
        }
        setActiveTheme(theme.id);
        alert('主题已应用');
      } else {
        alert('应用失败');
      }
    } catch (error) {
      console.error(error);
      alert('应用失败');
    } finally {
      setApplying(null);
    }
  };

  const deleteCustomTheme = async (themeId: string) => {
    if (!confirm('确定要删除这个自定义主题吗？')) return;
    try {
      const res = await fetch(`/api/themes/${encodeURIComponent(themeId)}`, { method: 'DELETE' });
      if (res.ok) {
        alert('删除成功');
        loadThemes();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error(error);
      alert('删除失败');
    }
  };

  if (loading) return <div className="p-8 text-center">加载主题库中...</div>;

  const builtinThemes = themes.filter(t => t.type === 'builtin');
  const customThemes = themes.filter(t => t.type === 'custom');
  const builtinCategories = Array.from(new Set(builtinThemes.map(t => t.category!)));
  const allCategories = [...builtinCategories, '自定义'];

  const activeThemeObj = themes.find(t => t.id === activeTheme);
  const activeDisplayText = activeThemeObj
    ? `${activeThemeObj.type === 'builtin' ? getCategoryChinese(activeThemeObj.category!) : '自定义'} - ${activeThemeObj.displayName}`
    : '无';

  const getThemesByCategory = (category: string) => {
    if (category === '自定义') return customThemes;
    return builtinThemes.filter(t => t.category === category);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">主题库</h1>
        <div className="text-sm text-gray-600">
          当前应用的主题是：{activeDisplayText}
        </div>
      </div>

      <Tabs.Root value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        <Tabs.List className="flex space-x-1 border-b">
          {allCategories.map(cat => (
            <Tabs.Trigger
              key={`trigger-${cat}`}
              value={cat}
              className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900"
            >
              {cat === '自定义' ? '自定义主题' : getCategoryChinese(cat)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {allCategories.map(cat => (
          <Tabs.Content key={`content-${cat}`} value={cat} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getThemesByCategory(cat).map(theme => (
                <div key={theme.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                  <div className="mb-3 h-32 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                    {theme.previewImage ? (
                      <img
                        src={theme.previewImage}
                        alt={theme.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-full border"
                          style={{ backgroundColor: theme.cssVariables['--primary'] || '#3b82f6' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full border"
                      style={{ backgroundColor: theme.cssVariables['--primary'] || '#3b82f6' }}
                    />
                    <span className="font-medium">{theme.displayName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyTheme(theme)}
                      disabled={activeTheme === theme.id || applying === theme.id}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {applying === theme.id ? '应用中...' : activeTheme === theme.id ? '当前使用' : '应用主题'}
                    </button>
                    <button
                      onClick={() => router.push(`/admin/themes/customizer?${theme.type === 'builtin' ? `presetId=${theme.id}` : `themeId=${encodeURIComponent(theme.id)}`}`)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      {theme.type === 'builtin' ? '复制' : '编辑'}
                    </button>
                    
                    {theme.type === 'custom' && (
                      <button
                        onClick={() => deleteCustomTheme(theme.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {getThemesByCategory(cat).length === 0 && (
              <div className="text-center text-gray-500 py-8">
                暂无主题
              </div>
            )}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}