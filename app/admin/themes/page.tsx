'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import Toast from '@/components/Toast';

interface Theme {
  id: string;
  name: string;
  displayName: string;
  type: 'builtin' | 'custom';
  cssVariables: Record<string, string>;
  darkCssVariables?: Record<string, string>;
  previewImage?: string | null;
  category?: string;
}

const categoryChineseMap: Record<string, string> = {
  Blue: '蓝色',
  Red: '红色',
  Green: '绿色',
  Purple: '紫色',
  Orange: '橙色',
  Black: '黑色',
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
  const searchParams = useSearchParams();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 加载主题列表
  const loadThemes = async (source = 'loadThemes', retry = 0) => {
    console.log(`[${source}] 开始加载主题列表... (尝试 ${retry + 1})`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到30秒

      const res = await fetch(`/api/themes?t=${Date.now()}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log(`[${source}] 获取到数据:`, data);

      const themesData = Array.isArray(data.themes) ? data.themes : [];

      const themesWithCategory = themesData.map((theme: Theme) => {
        let category = theme.category || '';
        if (theme.type === 'builtin' && !category && theme.id && typeof theme.id === 'string') {
          category = theme.id.includes('_') ? theme.id.split('_')[0] : '';
        }
        return {
          ...theme,
          category,
          darkCssVariables: theme.darkCssVariables || {},
        };
      });

      console.log(`[${source}] 处理后主题数量: ${themesWithCategory.length}`);
      setThemes(themesWithCategory);
      setActiveTheme(data.activeTheme || '');
      setRetryCount(0); // 成功后重置重试计数

      const builtinCategories: string[] = Array.from(
        new Set(
          themesWithCategory
            .filter((t: Theme) => t.type === 'builtin' && t.category && t.category.trim() !== '')
            .map((t: Theme) => t.category!)
        )
      );
      if (builtinCategories.length > 0 && !selectedCategory) {
        setSelectedCategory(builtinCategories[0]!);
      } else if (builtinCategories.length === 0 && themesWithCategory.some((t: Theme) => t.type === 'custom') && !selectedCategory) {
        setSelectedCategory('自定义');
      }
      console.log(`[${source}] 加载完成，loading 设为 false`);
    } catch (error: any) {
      console.error(`[${source}] 加载失败:`, error);
      if (error.name === 'AbortError' && retry < 2) {
        console.log(`[${source}] 超时，${retry + 1}/2 次重试...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadThemes(source, retry + 1);
      }
      if (error.name === 'AbortError') {
        setToast({ message: '加载主题超时，请检查网络后重试', type: 'error' });
      } else {
        setToast({ message: '加载主题失败，请刷新重试', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理来自定制器的 Toast 消息
  useEffect(() => {
    const toastMsg = searchParams.get('toast');
    if (toastMsg) {
      console.log('[useEffect] 收到 toast 参数:', toastMsg);
      setToast({ message: toastMsg, type: 'success' });
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('toast');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  // 加载主题列表
  useEffect(() => {
    loadThemes('useEffect 初始化').catch(err => {
      console.error('useEffect catch:', err);
      setLoading(false);
      setToast({ message: '加载主题失败，请刷新重试', type: 'error' });
    });
  }, []);

  // 应用主题
  const applyTheme = async (theme: Theme) => {
    console.log('[applyTheme] 开始应用主题:', theme.id);
    setApplying(theme.id);
    try {
      const res = await fetch('/api/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName: theme.id }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`应用主题失败 (${res.status}): ${errorText}`);
      }

      setActiveTheme(theme.id);
      setToast({ message: '主题已应用', type: 'success' });
      console.log('[applyTheme] 主题应用成功');
    } catch (error) {
      console.error('[applyTheme] 应用失败:', error);
      setToast({ message: '应用主题失败，请重试', type: 'error' });
    } finally {
      setApplying(null);
    }
  };

  // 复制预设主题
  const handleCopyPreset = async (theme: Theme) => {
    if (theme.type !== 'builtin') return;
    setCopying(theme.id);
    console.log('[handleCopyPreset] 开始复制预设主题:', theme.id);
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy',
          originalPresetId: theme.id,
          displayName: `${theme.displayName} 自定义`,
        }),
      });
      console.log('[handleCopyPreset] POST 响应状态:', res.status);
      if (res.ok) {
        const result = await res.json();
        console.log('[handleCopyPreset] 复制成功，新主题 ID:', result.name);
        setToast({ message: `主题复制成功，请进入自定义主题进行二次修改`, type: 'success' });
        await loadThemes('handleCopyPreset 刷新');
      } else {
        const error = await res.json();
        console.error('[handleCopyPreset] 复制失败:', error);
        setToast({ message: `复制失败: ${error.error || '未知错误'}`, type: 'error' });
      }
    } catch (error) {
      console.error('[handleCopyPreset] 复制异常:', error);
      setToast({ message: '复制主题失败，请重试', type: 'error' });
    } finally {
      setCopying(null);
    }
  };

  // 删除自定义主题
  const deleteCustomTheme = async (themeId: string) => {
    if (themeId === activeTheme) {
      setToast({ message: '正在使用的主题不能删除', type: 'error' });
      return;
    }

    if (!confirm('确定要删除这个自定义主题吗？')) return;
    setDeleting(themeId);
    console.log('[deleteCustomTheme] 开始删除主题:', themeId);
    try {
      const res = await fetch(`/api/themes/${encodeURIComponent(themeId)}`, { method: 'DELETE' });
      console.log('[deleteCustomTheme] DELETE 响应状态:', res.status);
      if (res.ok) {
        setToast({ message: '删除成功', type: 'success' });
        await loadThemes('deleteCustomTheme 刷新');
        setThemes(prev => prev.filter(t => t.id !== themeId));
        console.log('[deleteCustomTheme] 删除完成，列表已更新');
      } else {
        const errorText = await res.text();
        throw new Error(`删除失败 (${res.status}): ${errorText}`);
      }
    } catch (error) {
      console.error('[deleteCustomTheme] 删除失败:', error);
      setToast({ message: '删除失败，请重试', type: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <div className="p-8 text-center">加载主题库中...</div>;

  const builtinThemes = themes.filter(t => t.type === 'builtin');
  const customThemes = themes.filter(t => t.type === 'custom');
  const builtinCategories: string[] = Array.from(new Set(builtinThemes.map(t => t.category!)));
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
              {getThemesByCategory(cat).map(theme => {
                const isActive = activeTheme === theme.id;

                return (
                  <div key={theme.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                    <div 
                      className="mb-3 w-full bg-gray-100 rounded-md overflow-hidden"
                      style={{ aspectRatio: '16 / 10' }}
                    >
                      {theme.previewImage ? (
                        <img
                          src={`/api/themes/preview?path=${encodeURIComponent(theme.previewImage)}`}
                          alt={theme.displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.fallback-color');
                              if (fallback) fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : (
                        <div className="fallback-color w-full h-full flex items-center justify-center">
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
                      {isActive && (
                        <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          当前使用
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => applyTheme(theme)}
                        disabled={isActive || applying === theme.id}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {applying === theme.id ? '应用中...' : isActive ? '当前使用' : '应用主题'}
                      </button>
                      {theme.type === 'builtin' ? (
                        <button
                          onClick={() => handleCopyPreset(theme)}
                          disabled={copying === theme.id}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          {copying === theme.id ? '正在复制...' : '复制'}
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/admin/themes/customizer?themeId=${encodeURIComponent(theme.id)}`)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                        >
                          编辑
                        </button>
                      )}
                      {theme.type === 'custom' && !isActive && (
                        <button
                          onClick={() => deleteCustomTheme(theme.id)}
                          disabled={deleting === theme.id}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting === theme.id ? '正在删除...' : '删除'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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