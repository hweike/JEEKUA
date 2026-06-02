'use client';

import { useState, useEffect } from 'react';

interface SyncAllModalProps {
  onClose: () => void;
  sourceLocale: string;
  onSyncComplete: () => void;
}

export default function SyncAllModal({ onClose, sourceLocale, onSyncComplete }: SyncAllModalProps) {
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [allLocales, setAllLocales] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [languagesLoading, setLanguagesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        // 确保 locales 是数组，如果不存在则使用空数组
        setAllLocales(Array.isArray(data.locales) ? data.locales : []);
        setLanguagesLoading(false);
      })
      .catch(err => {
        console.error('Failed to load languages', err);
        setAllLocales([]);
        setLanguagesLoading(false);
      });
  }, []);

  const handleSync = async () => {
    if (targetLocales.length === 0) {
      alert('请至少选择一个目标站点');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/pages/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocale,
          targetLocales,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage(`同步完成：成功 ${result.successCount} 个页面，失败 ${result.failedCount} 个。`);
        setTimeout(onSyncComplete, 1500);
      } else {
        setMessage(`错误：${result.error}`);
      }
    } catch (err) {
      setMessage('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (languagesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 text-center">加载语言列表中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">批量同步所有页面</h2>
        <p className="text-sm text-gray-600 mb-4">
          源站点：<strong>{sourceLocale.toUpperCase()}</strong> (当前站点)
        </p>
        <div className="mb-4">
          <label className="block mb-1">目标站点（可多选）</label>
          <div className="border rounded p-2 max-h-48 overflow-auto">
            {allLocales
              .filter(loc => loc.code !== sourceLocale)
              .map(loc => (
                <label key={loc.code} className="block">
                  <input
                    type="checkbox"
                    value={loc.code}
                    checked={targetLocales.includes(loc.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTargetLocales([...targetLocales, loc.code]);
                      } else {
                        setTargetLocales(targetLocales.filter(c => c !== loc.code));
                      }
                    }}
                    className="mr-2"
                  />
                  {loc.name} ({loc.code})
                </label>
              ))}
            {allLocales.filter(loc => loc.code !== sourceLocale).length === 0 && (
              <div className="text-gray-500 text-sm">没有其他可用站点</div>
            )}
          </div>
        </div>
        {message && <div className="mb-4 text-sm text-gray-600">{message}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">取消</button>
          <button onClick={handleSync} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {loading ? '同步中...' : '开始同步'}
          </button>
        </div>
      </div>
    </div>
  );
}