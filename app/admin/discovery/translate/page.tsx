'use client';
import { useState, useEffect } from 'react';

interface Language {
  code: string;
  name: string;
}

export default function TranslatePage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [sourceLocale, setSourceLocale] = useState('zh');
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [mode, setMode] = useState<'incremental' | 'force'>('incremental');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ total: number; completed: number; failed: number } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => setLanguages(data.map((l: any) => ({ code: l.code, name: l.zhName }))));
  }, []);

  const fetchPreview = async () => {
    const res = await fetch(`/api/discovery/translate/preview?source=${sourceLocale}&targets=${targetLocales.join(',')}&types=${contentTypes.join(',')}&mode=${mode}`);
    const data = await res.json();
    setPreview(data);
  };

  const startSync = async () => {
    setLoading(true);
    setProgress(null);
    const res = await fetch('/api/discovery/translate/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceLocale, targetLocales, contentTypes, mode }),
    });
    const { taskId, total } = await res.json();
    setTaskId(taskId);
    setProgress({ total, completed: 0, failed: 0 });

    // 轮询状态
    const interval = setInterval(async () => {
      const statusRes = await fetch(`/api/discovery/translate/status?taskId=${taskId}`);
      const data = await statusRes.json();
      setProgress({ total: data.total, completed: data.completed, failed: data.failed });
      if (data.status === 'completed') {
        clearInterval(interval);
        setLoading(false);
        setToast({ message: `同步完成：成功 ${data.completed}，失败 ${data.failed}`, type: 'success' });
        setTaskId(null);
        fetchPreview(); // 刷新预览
      }
    }, 2000);
  };

  const cancelSync = () => {
    // 实际取消需要后端支持，这里简单重置前端状态
    setLoading(false);
    setTaskId(null);
    setProgress(null);
    setToast({ message: '已取消同步', type: 'error' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && <div className={`p-2 mb-4 rounded ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{toast.message}</div>}
      <h1 className="text-2xl font-bold mb-6">多语言同步与翻译</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">源语言</label>
          <select value={sourceLocale} onChange={(e) => setSourceLocale(e.target.value)} className="border rounded px-3 py-2 w-full">
            {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">目标语言（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {languages.filter(l => l.code !== sourceLocale).map(lang => (
              <label key={lang.code} className="flex items-center gap-1">
                <input type="checkbox" value={lang.code} checked={targetLocales.includes(lang.code)} onChange={(e) => {
                  if (e.target.checked) setTargetLocales([...targetLocales, lang.code]);
                  else setTargetLocales(targetLocales.filter(c => c !== lang.code));
                }} />
                <span>{lang.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">内容类型（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {['home','page','product','productCollection','blogCategory','blogPost','docLibrary','doc','videoCategory','video','inquiry','policy'].map(type => (
              <label key={type} className="flex items-center gap-1">
                <input type="checkbox" value={type} checked={contentTypes.includes(type)} onChange={(e) => {
                  if (e.target.checked) setContentTypes([...contentTypes, type]);
                  else setContentTypes(contentTypes.filter(t => t !== type));
                }} />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">同步模式</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1">
              <input type="radio" value="incremental" checked={mode === 'incremental'} onChange={() => setMode('incremental')} />
              <span>增量（仅同步内容变化的页面）</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" value="force" checked={mode === 'force'} onChange={() => setMode('force')} />
              <span>强制（重新同步所有页面）</span>
            </label>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchPreview} className="bg-gray-200 px-4 py-2 rounded">预览待同步项</button>
          {!loading ? (
            <button onClick={startSync} disabled={targetLocales.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">开始同步</button>
          ) : (
            <button onClick={cancelSync} className="bg-red-600 text-white px-4 py-2 rounded">取消同步</button>
          )}
        </div>
        {preview.length > 0 && (
          <div className="border rounded p-4 max-h-60 overflow-auto">
            <div className="font-semibold mb-2">待同步页面（{preview.length} 项）</div>
            {preview.map((item, idx) => <div key={idx}>{item.title} ({item.id}) → {item.target}</div>)}
          </div>
        )}
        {progress && (
          <div className="border rounded p-4">
            <div className="font-semibold mb-2">同步进度</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(progress.completed + progress.failed) / progress.total * 100}%` }}></div>
            </div>
            <div className="mt-2 text-sm">已完成: {progress.completed} / {progress.total}，失败: {progress.failed}</div>
          </div>
        )}
      </div>
    </div>
  );
}