// app/admin/discovery/components/ProductSyncDialog.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface LogEntry {
  productId: string;
  message: string;
  status: 'processing' | 'success' | 'failed';
  timestamp: number;
}

interface ProductSyncDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  onComplete?: () => void;
  selectedCount: number;
  title?: string;
  syncStrategy?: 'full' | 'incremental'; // 新增：全量或增量
}

export default function ProductSyncDialog({
  isOpen,
  onClose,
  productIds,
  onComplete,
  selectedCount,
  title = '同步产品到目标站点',
  syncStrategy = 'full', // 默认为全量
}: ProductSyncDialogProps) {
  const source = 'en'; // 固定英文作为源
  const [targets, setTargets] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [mode, setMode] = useState<'repair' | 'copy' | 'copy_translate'>('repair');
  const [allEnabledSites, setAllEnabledSites] = useState<{ code: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'config' | 'logs'>('config');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const all = data.map((lang: any) => ({
          code: lang.code,
          name: lang.zhName,
        }));
        setAllEnabledSites(all.filter(site => site.code !== 'en'));
      })
      .catch(err => {
        console.error(err);
        setAllEnabledSites([]);
      });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTargets([]);
      setMode('repair');
      setError(null);
      setView('config');
      setLogs([]);
      setSuccessCount(0);
      setFailedCount(0);
      setSyncing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleTargetToggle = (code: string) => {
    setTargets(prev =>
      prev.includes(code) ? prev.filter(t => t !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    const allCodes = allEnabledSites.map(s => s.code);
    if (targets.length === allCodes.length && allCodes.length > 0) {
      setTargets([]);
    } else {
      setTargets(allCodes);
    }
  };

  // 流式同步
  const handleSync = async () => {
    if (targets.length === 0) {
      setError('请至少选择一个目标站点');
      return;
    }
    if (!productIds || productIds.length === 0) {
      setError('没有要同步的产品');
      return;
    }

    setError(null);
    setSyncing(true);
    setLogs([]);
    setSuccessCount(0);
    setFailedCount(0);
    setView('logs');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 构建请求体，包含 syncStrategy
      const response = await fetch('/api/discovery/product-sync/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          sourceLocale: source,
          targetLocales: targets,
          productIds: productIds,
          mode: mode,
          syncStrategy: syncStrategy, // 传递全量/增量策略
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '同步失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              const log = data.log;
              setLogs(prev => [
                ...prev,
                {
                  productId: log.productId || log.pageId,
                  message: log.message || log.status,
                  status: log.status,
                  timestamp: Date.now(),
                },
              ]);
              if (log.status === 'success') setSuccessCount(prev => prev + 1);
              if (log.status === 'failed') setFailedCount(prev => prev + 1);
            } else if (data.type === 'complete') {
              setSyncing(false);
              setError(null);
              if (onComplete) onComplete();
            } else if (data.type === 'error') {
              setSyncing(false);
              setError(data.error);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setSyncing(false);
      setError(err.message || '同步失败');
    } finally {
      abortControllerRef.current = null;
    }
  };

  const cancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSyncing(false);
    setError('同步已取消');
  };

  if (!isOpen) return null;

  const targetCandidates = allEnabledSites;
  const allSelected = targetCandidates.length > 0 && targets.length === targetCandidates.length;

  const renderConfigView = () => (
    <div className="p-6 space-y-6">
      {/* 源站点 */}
      <div>
        <label className="block text-sm font-medium mb-2">源站点</label>
        <div className="px-3 py-2 bg-gray-100 rounded border text-gray-700">
          英文 (en)
        </div>
        <p className="text-xs text-gray-500 mt-1">
          已选择 {selectedCount} 个产品进行同步
          {syncStrategy === 'incremental' && (
            <span className="ml-2 text-blue-600">（增量模式：跳过已同步的语言）</span>
          )}
          {syncStrategy === 'full' && (
            <span className="ml-2 text-orange-600">（全量模式：覆盖所有目标语言）</span>
          )}
        </p>
      </div>

      {/* 目标站点 */}
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
          {targetCandidates.length === 0 ? (
            <div className="col-span-full text-gray-500 text-sm">暂无已开通站点</div>
          ) : (
            targetCandidates.map(site => (
              <label key={site.code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={targets.includes(site.code)}
                  onChange={() => handleTargetToggle(site.code)}
                  className="w-4 h-4"
                />
                <span>{site.name} ({site.code})</span>
              </label>
            ))
          )}
        </div>
        {syncStrategy === 'incremental' && (
          <p className="text-xs text-gray-500 mt-2">
            💡 增量模式下，已同步的目标语言将自动跳过。
          </p>
        )}
      </div>

      {/* 同步模式 */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start gap-2">
          <input
            type="radio"
            id="mode-repair"
            name="syncMode"
            value="repair"
            checked={mode === 'repair'}
            onChange={() => setMode('repair')}
            className="mt-1 w-4 h-4"
          />
          <div>
            <label htmlFor="mode-repair" className="text-sm font-medium">
              只修复同步关联关系
            </label>
            <p className="text-xs text-gray-500">
              仅设置同步字段，不覆盖目标站点产品内容。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="radio"
            id="mode-copy"
            name="syncMode"
            value="copy"
            checked={mode === 'copy'}
            onChange={() => setMode('copy')}
            className="mt-1 w-4 h-4"
          />
          <div>
            <label htmlFor="mode-copy" className="text-sm font-medium">
              同步复制英文产品内容（只复制不翻译）
            </label>
            <p className="text-xs text-gray-500">
              完整复制产品信息到目标站点，建立同步关联。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="radio"
            id="mode-copy-translate"
            name="syncMode"
            value="copy_translate"
            checked={mode === 'copy_translate'}
            onChange={() => setMode('copy_translate')}
            className="mt-1 w-4 h-4"
          />
          <div>
            <label htmlFor="mode-copy-translate" className="text-sm font-medium">
              同步复制并翻译英文产品内容（Deepseek翻译）
            </label>
            <p className="text-xs text-gray-500">
              复制并翻译产品信息到目标站点，建立同步关联。
            </p>
          </div>
        </div>

        {(mode === 'copy' || mode === 'copy_translate') && (
          <div className="mt-2 p-2 border border-red-300 bg-red-50 rounded text-red-700 text-sm">
            <p className="font-semibold">温馨提示：此操作将覆盖目标站点相同ID的产品内容，不可撤回。</p>
            {syncStrategy === 'incremental' && (
              <p className="text-xs mt-1">但增量模式下，已同步的语言将被跳过，不会重复覆盖。</p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={syncing}>
          取消
        </button>
        <button
          onClick={handleSync}
          disabled={syncing || targets.length === 0 || productIds.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? '同步中...' : '确认同步'}
        </button>
      </div>
    </div>
  );

  const renderLogsView = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('config')}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          disabled={syncing}
        >
          <ArrowLeft size={16} /> 返回同步窗口
        </button>
        <span className="text-sm text-gray-500 ml-auto">
          {syncing ? '同步中...' : '同步完成'}
        </span>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>成功: {successCount}</span>
        <span>失败: {failedCount}</span>
        <span>总计: {selectedCount}</span>
      </div>

      <div className="bg-gray-50 rounded border p-3 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无日志</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`text-sm flex gap-2 ${
                  log.status === 'failed' ? 'text-red-600' :
                  log.status === 'success' ? 'text-green-600' :
                  'text-gray-700'
                }`}
              >
                <span className="font-mono text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-mono">{log.productId}</span>
                <span>→ {log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {!syncing && (
        <div className="flex justify-end gap-2">
          {error && <span className="text-sm text-red-600 mr-auto">{error}</span>}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            关闭
          </button>
        </div>
      )}
      {syncing && (
        <div className="flex justify-end">
          <button
            onClick={cancelSync}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            取消同步
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">
            {view === 'config' ? title : '同步日志'}
            {view === 'config' && syncStrategy === 'incremental' && (
              <span className="ml-2 text-sm font-normal text-blue-600">（增量）</span>
            )}
            {view === 'config' && syncStrategy === 'full' && (
              <span className="ml-2 text-sm font-normal text-orange-600">（全量）</span>
            )}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {view === 'config' ? renderConfigView() : renderLogsView()}
      </div>
    </div>
  );
}