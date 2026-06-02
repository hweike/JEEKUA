'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/types/page';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  onSyncComplete: () => void;
}

export default function SyncModal({ isOpen, onClose, pageId, onSyncComplete }: SyncModalProps) {
  const [sourceLocale, setSourceLocale] = useState('zh');
  const [targetLocales, setTargetLocales] = useState<string[]>([]);
  const [allLocales, setAllLocales] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/languages/enabled')
        .then(res => res.json())
        .then(data => setAllLocales(data.locales));
    }
  }, [isOpen]);

  const handleSync = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/pages/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          sourceLocale,
          targetLocales,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage(`同步成功: ${result.success.join(', ')}。失败: ${result.failed.map((f: any) => f.locale).join(', ')}`);
        onSyncComplete();
      } else {
        setMessage(`错误: ${result.error}`);
      }
    } catch (err) {
      setMessage('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">同步复制页面</h2>
        <div className="mb-4">
          <label className="block mb-1">源站点</label>
          <select
            value={sourceLocale}
            onChange={(e) => setSourceLocale(e.target.value)}
            className="border rounded w-full p-2"
          >
            {allLocales.filter(loc => loc.code === 'zh' || loc.code === 'en').map(loc => (
              <option key={loc.code} value={loc.code}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-1">目标站点（可多选）</label>
          <div className="border rounded p-2 max-h-48 overflow-auto">
            {allLocales.map(loc => (
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
          </div>
        </div>
        {message && <div className="mb-4 text-sm text-gray-600">{message}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">取消</button>
          <button onClick={handleSync} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {loading ? '同步中...' : '确认同步'}
          </button>
        </div>
      </div>
    </div>
  );
}