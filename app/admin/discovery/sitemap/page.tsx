// app/admin/discovery/sitemap/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Toast from '@/components/common/Toast';

interface Language {
  code: string;
  name: string;
}

export default function SitemapAdmin() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 获取所有已开通站点
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const langs = data.map((l: any) => ({ code: l.code, name: l.zhName }));
        setLanguages(langs);
        setSelected(langs.map(l => l.code)); // 默认全选
      })
      .catch(err => {
        console.error(err);
        setToast({ message: '获取站点列表失败', type: 'error' });
      });
  }, []);

  const toggleAll = () => {
    if (selected.length === languages.length) setSelected([]);
    else setSelected(languages.map(l => l.code));
  };

  const toggleLocale = (code: string) => {
    setSelected(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  // 重建选定站点索引（同步文件到 pages 表）
  const syncIndex = async () => {
    if (selected.length === 0) {
      setToast({ message: '请至少选择一个站点', type: 'error' });
      return;
    }
    setLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locales: selected }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '同步索引失败');
      }
      setToast({ message: `已为 ${selected.length} 个站点同步文件索引。`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 生成多语言 Sitemap（含 hreflang）
  const generateGlobalSitemap = async () => {
    setGlobalLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/sitemap/generate', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }
      setToast({ message: '多语言站点地图生成成功，已写入 public/sitemap/ 目录。', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setGlobalLoading(false);
    }
  };

  // 生成 robots.txt
  const generateRobots = async () => {
    setRobotsLoading(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/generate-robots', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '生成失败');
      }
      setToast({ message: 'robots.txt 已生成到 public 目录。', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setRobotsLoading(false);
    }
  };

  if (languages.length === 0) {
    return <div className="p-6">加载站点列表中...</div>;
  }

  const allSelected = selected.length === languages.length && languages.length > 0;

  return (
    <div className="p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold mb-4">站点地图管理</h1>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-sm text-yellow-800">
          ⚠️ 生成前请确保已在“网站设置 &gt; 基本设置”中填写了正确的“网站网址”。<br />
          站点地图将使用该网址生成完整URL，否则会阻止生成。
        </p>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">已开通站点列表</label>
          <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800">
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded p-3">
          {languages.map(lang => (
            <label key={lang.code} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(lang.code)}
                onChange={() => toggleLocale(lang.code)}
                className="w-4 h-4"
              />
              <span>{lang.name} ({lang.code})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={syncIndex}
          disabled={loading || selected.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '同步中...' : '重建选定站点索引'}
        </button>
        <button
          onClick={generateGlobalSitemap}
          disabled={globalLoading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {globalLoading ? '生成中...' : '生成多语言 Sitemap（含 hreflang）'}
        </button>
        <button
          onClick={generateRobots}
          disabled={robotsLoading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {robotsLoading ? '生成中...' : '生成 robots.txt'}
        </button>
      </div>
    </div>
  );
}