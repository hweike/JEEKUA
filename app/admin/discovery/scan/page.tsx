'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import Toast from '@/components/common/Toast';

interface Language {
  code: string;
  name: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface SiteResult {
  locale: string;
  success: boolean;
  error?: string;
  logs: LogEntry[];
  completed: boolean;
}

export default function ScanPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SiteResult[]>([]);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({ total: 0, completed: 0, success: 0, failed: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const langs: Language[] = data.map((l: any) => ({ code: l.code, name: l.zhName }));
        setLanguages(langs);
        setSelected(langs.map(l => l.code));
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

  const toggleExpand = (locale: string) => {
    setExpandedSites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locale)) newSet.delete(locale);
      else newSet.add(locale);
      return newSet;
    });
  };

  const startScan = async () => {
    if (selected.length === 0) {
      setToast({ message: '请至少选择一个站点', type: 'error' });
      return;
    }
    setRunning(true);
    setResults([]);
    setExpandedSites(new Set());
    setStats({ total: selected.length, completed: 0, success: 0, failed: 0 });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locales: selected, concurrency }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const siteLogsMap = new Map<string, LogEntry[]>();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'locale_log') {
              const { locale, log } = data;
              const existingLogs = siteLogsMap.get(locale) || [];
              existingLogs.push(log);
              siteLogsMap.set(locale, existingLogs);

              setResults(prev => {
                const existing = prev.find(r => r.locale === locale);
                if (existing) {
                  return prev.map(r =>
                    r.locale === locale ? { ...r, logs: existingLogs } : r
                  );
                } else {
                  return [...prev, {
                    locale,
                    success: false,
                    error: undefined,
                    logs: existingLogs,
                    completed: false,
                  }];
                }
              });
            } else if (data.type === 'locale_result') {
              const isSuccess = data.success;
              setStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                success: isSuccess ? prev.success + 1 : prev.success,
                failed: isSuccess ? prev.failed : prev.failed + 1,
              }));
              if (!isSuccess) {
                setExpandedSites(prev => new Set(prev).add(data.locale));
              }
              setResults(prev => prev.map(r =>
                r.locale === data.locale
                  ? {
                      ...r,
                      success: isSuccess,
                      error: data.error,
                      completed: true,
                      logs: siteLogsMap.get(data.locale) || [],
                    }
                  : r
              ));
            } else if (data.type === 'complete') {
              setRunning(false);
              setToast({ message: '所有站点处理完成', type: 'success' });
              abortControllerRef.current = null;
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 取消操作已在 cancelScan 中处理，这里不再重复处理，避免干扰
        console.log('扫描已取消（由 AbortController 触发）');
      } else {
        console.error(error);
        setToast({ message: error.message || '处理失败', type: 'error' });
        setRunning(false);
      }
    }
  };

  const cancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 将所有未完成的站点标记为已取消
    setResults(prev => {
      const updated = prev.map(r => {
        if (!r.completed) {
          return {
            ...r,
            completed: true,
            success: false,
            error: '已取消',
            logs: [
              ...r.logs,
              {
                time: new Date().toISOString(),
                message: '⚠️ 扫描已被用户取消',
                type: 'warning' as const,
              },
            ],
          };
        }
        return r;
      });
      return updated;
    });

    // 更新统计信息：将未完成的站点计入失败
    setStats(prev => {
      const total = prev.total;
      const completedNow = prev.completed;
      const remaining = total - completedNow;
      return {
        ...prev,
        completed: total, // 全部标记为已完成
        success: prev.success,
        failed: prev.failed + remaining,
      };
    });

    setRunning(false);
    setToast({ message: '扫描已取消', type: 'info' });
  };

  const reset = () => {
    setSelected(languages.map(l => l.code));
    setConcurrency(3);
    setResults([]);
    setExpandedSites(new Set());
    setStats({ total: 0, completed: 0, success: 0, failed: 0 });
    setRunning(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  if (languages.length === 0) {
    return <div className="p-6">加载站点列表中...</div>;
  }

  const allSelected = selected.length === languages.length && languages.length > 0;
  const hasResults = stats.total > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-bold mb-6">重建站点页面索引</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
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
                  disabled={running}
                />
                <span>{lang.name} ({lang.code})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-2">并发数 (建议 3~5，避免过载)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            className="border rounded px-3 py-1 w-24"
            disabled={running}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={startScan}
            disabled={running || selected.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? '扫描中...' : '开始重建索引'}
          </button>
          {running && (
            <button
              onClick={cancelScan}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              取消扫描
            </button>
          )}
          <button
            onClick={reset}
            disabled={running}
            className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
          >
            重置
          </button>
        </div>

        {hasResults && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <div className="flex flex-wrap items-center gap-4">
              <span>进度: {stats.completed}/{stats.total}</span>
              <span>✅ 成功: {stats.success}</span>
              <span>❌ 失败: {stats.failed}</span>
              {stats.failed > 0 && <span className="text-red-500 font-bold">存在失败站点</span>}
              {stats.completed === stats.total && stats.total > 0 && (
                <span className="text-green-600 font-bold">全部完成</span>
              )}
            </div>
            {stats.total > 0 && (
              <div className="w-full bg-gray-200 h-2 mt-2 rounded overflow-hidden">
                <div
                  className="bg-blue-600 h-2 transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((res) => (
            <div
              key={res.locale}
              className={`bg-white rounded-lg shadow overflow-hidden ${
                !res.completed ? 'border-2 border-blue-300' : ''
              } ${!res.success && res.completed ? 'border-2 border-red-300' : ''}`}
            >
              <div
                className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between cursor-pointer hover:bg-gray-100"
                onClick={() => toggleExpand(res.locale)}
              >
                <div className="flex items-center gap-3">
                  {res.completed ? (
                    res.success ? (
                      <CheckCircle className="text-green-600" size={20} />
                    ) : (
                      <XCircle className="text-red-600" size={20} />
                    )
                  ) : (
                    <Loader2 className="text-blue-600 animate-spin" size={20} />
                  )}
                  <span className="font-medium">
                    {languages.find(l => l.code === res.locale)?.name || res.locale} ({res.locale})
                  </span>
                  {!res.completed && <span className="text-sm text-blue-600">扫描中...</span>}
                  {res.completed && !res.success && res.error && (
                    <span className="text-sm text-red-500"> - {res.error}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{res.logs.length} 条日志</span>
                  {expandedSites.has(res.locale) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>
              {expandedSites.has(res.locale) && (
                <div className="p-4 max-h-96 overflow-y-auto bg-gray-50">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 w-40">时间</th>
                        <th className="text-left py-1">日志</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.logs.map((log, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-1 text-gray-500 text-xs">{new Date(log.time).toLocaleTimeString()}</td>
                          <td className="py-1">
                            <span className={log.type === 'error' ? 'text-red-600' : log.type === 'warning' ? 'text-yellow-600' : 'text-gray-700'}>
                              {log.message}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}