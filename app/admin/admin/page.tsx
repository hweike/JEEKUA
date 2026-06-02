// app/admin/themes/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface Theme {
  name: string;
  displayName: string;
  type: 'builtin' | 'custom';
  cssVariables: Record<string, string>;
}

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', displayName: '' });
  const [cssVariables, setCssVariables] = useState<Record<string, string>>({});

  // 获取所有主题和当前激活主题
  const fetchThemes = async () => {
    try {
      const res = await fetch('/api/themes');
      const data = await res.json();
      setThemes(data.themes);
      setActiveTheme(data.activeTheme);
    } catch (error) {
      console.error('获取主题失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换激活主题
  const activateTheme = async (themeName: string) => {
    try {
      const res = await fetch('/api/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName }),
      });
      if (res.ok) {
        setActiveTheme(themeName);
        // 刷新页面样式：可以重新加载或触发全局样式更新，这里简单刷新
        window.location.reload();
      } else {
        alert('切换失败');
      }
    } catch (error) {
      console.error('切换主题失败:', error);
    }
  };

  // 删除自定义主题
  const deleteTheme = async (themeName: string) => {
    if (!confirm(`确定要删除主题“${themeName}”吗？`)) return;
    try {
      const res = await fetch(`/api/themes/${themeName}`, { method: 'DELETE' });
      if (res.ok) {
        fetchThemes();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除主题失败:', error);
    }
  };

  // 打开 StyleGlide 编辑器（内置实时编辑）
  const openStyleGlideEditor = () => {
    // 如果全局已经加载了 StyleGlide，调用它的打开方法
    if (typeof window !== 'undefined' && (window as any).StyleGlideThemeEditor) {
      (window as any).StyleGlideThemeEditor.open();
    } else {
      alert('编辑器未加载，请确保在开发环境中运行');
    }
  };

  // 从 StyleGlide 获取当前 CSS 变量（用户编辑后导出）
  const captureFromStyleGlide = () => {
    if (typeof window !== 'undefined' && (window as any).StyleGlideThemeEditor) {
      const vars = (window as any).StyleGlideThemeEditor.getCurrentCssVariables();
      setCssVariables(vars);
      return vars;
    }
    return null;
  };

  // 保存自定义主题（新建或更新）
  const saveCustomTheme = async () => {
    if (!customForm.name || !customForm.name.startsWith('Custom-')) {
      alert('自定义主题名称必须以 "Custom-" 开头');
      return;
    }
    // 获取当前的 CSS 变量（优先从编辑器捕获，否则使用表单中的）
    let vars = cssVariables;
    if (Object.keys(vars).length === 0) {
      vars = captureFromStyleGlide() || {};
    }
    if (Object.keys(vars).length === 0) {
      alert('请先使用编辑器调整主题或手动填写 CSS 变量');
      return;
    }

    const payload = {
      name: customForm.name,
      displayName: customForm.displayName || customForm.name,
      cssVariables: vars,
    };

    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('保存成功');
        setEditingTheme(null);
        setCustomForm({ name: '', displayName: '' });
        setCssVariables({});
        fetchThemes();
      } else {
        const error = await res.json();
        alert(error.error || '保存失败');
      }
    } catch (error) {
      console.error('保存主题失败:', error);
    }
  };

  // 编辑已有自定义主题
  const editCustomTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setCustomForm({ name: theme.name, displayName: theme.displayName });
    setCssVariables(theme.cssVariables);
    // 可选：将 CSS 变量注入到 StyleGlide 编辑器（如果有 API）
    setIsEditorOpen(true);
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">加载主题配置中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">网站主题管理</h1>
        <div className="space-x-2">
          <button
            onClick={openStyleGlideEditor}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            打开可视化编辑器
          </button>
          <button
            onClick={() => setIsEditorOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + 新建自定义主题
          </button>
        </div>
      </div>

      {/* 主题列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                主题名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                预览
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {themes.map((theme) => (
              <tr key={theme.name}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{theme.displayName}</div>
                  <div className="text-xs text-gray-500">{theme.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      theme.type === 'builtin'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {theme.type === 'builtin' ? '内置' : '自定义'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-1">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.cssVariables['--primary'] || '#3b82f6' }}
                      title="主色"
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.cssVariables['--background'] || '#ffffff' }}
                      title="背景色"
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: theme.cssVariables['--foreground'] || '#1f2937' }}
                      title="前景色"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {activeTheme === theme.name && (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      当前使用
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => activateTheme(theme.name)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    应用
                  </button>
                  {theme.type === 'custom' && (
                    <>
                      <button
                        onClick={() => editCustomTheme(theme)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => deleteTheme(theme.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 新建/编辑自定义主题的表单（弹窗） */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingTheme ? '编辑自定义主题' : '新建自定义主题'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">主题标识（必须以 Custom- 开头）</label>
                <input
                  type="text"
                  value={customForm.name}
                  onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="例如: Custom-MyTheme"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">显示名称</label>
                <input
                  type="text"
                  value={customForm.displayName}
                  onChange={(e) => setCustomForm({ ...customForm, displayName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="我的主题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS 变量配置（可直接修改，或使用可视化编辑器调整后点击“捕获当前变量”）
                </label>
                <textarea
                  rows={10}
                  value={JSON.stringify(cssVariables, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setCssVariables(parsed);
                    } catch {
                      // 无效 JSON 忽略
                    }
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm font-mono text-sm p-2"
                  placeholder='{"--primary": "221.2 83.2% 53.3%", ...}'
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    const vars = captureFromStyleGlide();
                    if (vars) setCssVariables(vars);
                    else alert('请确保已打开 StyleGlide 编辑器并进行了调整');
                  }}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  捕获当前编辑器变量
                </button>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  onClick={saveCustomTheme}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存主题
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}