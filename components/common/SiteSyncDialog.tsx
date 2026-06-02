'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SiteSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: (source: string, targets: string[]) => Promise<{ success: boolean; message?: string }>;
  currentLocale?: string;
  title?: string;
}

export default function SiteSyncDialog({
  isOpen,
  onClose,
  onSync,
  currentLocale = 'zh',
  title = '多语言站点一键同步',
}: SiteSyncDialogProps) {
  const [source, setSource] = useState(currentLocale);
  const [targets, setTargets] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [availableSites, setAvailableSites] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const allSites = data.map((lang: any) => ({
          code: lang.code,
          name: lang.zhName,
        }));
        // 源站点只保留中文和英文（已开通）
        const filtered = allSites.filter(site => site.code === 'zh' || site.code === 'en');
        setAvailableSites(filtered);
        if (filtered.some(s => s.code === currentLocale)) {
          setSource(currentLocale);
        } else if (filtered.length > 0) {
          setSource(filtered[0].code);
        }
      })
      .catch(console.error);
  }, [currentLocale]);

  const handleTargetToggle = (code: string) => {
    setTargets(prev =>
      prev.includes(code) ? prev.filter(t => t !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    // 目标站点候选列表 = 所有已开通站点（不限制 zh/en）排除源站点
    const allTargetCandidates = allEnabledSites.filter(s => s.code !== source).map(s => s.code);
    if (targets.length === allTargetCandidates.length && allTargetCandidates.length > 0) {
      setTargets([]);
    } else {
      setTargets(allTargetCandidates);
    }
  };

  // 所有已开通站点（用于目标站点列表）
  const [allEnabledSites, setAllEnabledSites] = useState<{ code: string; name: string }[]>([]);

  // 单独获取所有已开通站点（目标站点用）
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const all = data.map((lang: any) => ({
          code: lang.code,
          name: lang.zhName,
        }));
        setAllEnabledSites(all);
      })
      .catch(console.error);
  }, []);

  const handleSyncClick = async () => {
    if (!source || targets.length === 0) {
      alert('请选择源站点和至少一个目标站点');
      return;
    }
    setSyncing(true);
    try {
      const result = await onSync(source, targets);
      if (!result.success) {
        // 父组件已显示 Toast
      }
      onClose();
    } catch (error: any) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  // 目标站点候选列表（所有已开通站点，排除源站点）
  const targetCandidates = allEnabledSites.filter(s => s.code !== source);
  const allSelected = targetCandidates.length > 0 && targets.length === targetCandidates.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">源站点</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {availableSites.map(site => (
                <option key={site.code} value={site.code}>
                  {site.name} ({site.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">同步到如下目标站点</label>
              {targetCandidates.length > 0 && (
                <button onClick={handleSelectAll} className="text-xs text-blue-600 hover:text-blue-800">
                  {allSelected ? '取消全选' : '全选'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded p-3">
              {targetCandidates.map(site => (
                <label key={site.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={targets.includes(site.code)}
                    onChange={() => handleTargetToggle(site.code)}
                    className="w-4 h-4"
                  />
                  <span>{site.name} ({site.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={syncing}>
            取消
          </button>
          <button
            onClick={handleSyncClick}
            disabled={syncing || targets.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? '同步中...' : '开始同步'}
          </button>
        </div>
      </div>
    </div>
  );
}