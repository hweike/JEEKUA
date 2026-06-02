'use client';
import { useEffect, useState } from 'react';

interface SyncLog {
  id: number;
  syncType: string;
  source_locale: string;
  target_locale: string;
  item_id: string;
  status: string;
  errorMsg: string;
  created_at: string;
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [filter, setFilter] = useState({ status: '', sourceLocale: '', targetLocale: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.sourceLocale) params.append('sourceLocale', filter.sourceLocale);
    if (filter.targetLocale) params.append('targetLocale', filter.targetLocale);
    const res = await fetch(`/api/discovery/sync-logs?${params.toString()}`);
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">同步日志</h1>
      <div className="flex gap-4 mb-4">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="border rounded px-2 py-1">
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
          <option value="skipped">跳过</option>
        </select>
        <input type="text" placeholder="源语言" value={filter.sourceLocale} onChange={(e) => setFilter({ ...filter, sourceLocale: e.target.value })} className="border rounded px-2 py-1" />
        <input type="text" placeholder="目标语言" value={filter.targetLocale} onChange={(e) => setFilter({ ...filter, targetLocale: e.target.value })} className="border rounded px-2 py-1" />
        <button onClick={fetchLogs} className="bg-blue-600 text-white px-4 py-1 rounded">筛选</button>
      </div>
      {loading ? <div>加载中...</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-50">
              <tr><th className="px-4 py-2 text-left">时间</th><th className="px-4 py-2 text-left">类型</th><th className="px-4 py-2 text-left">源</th><th className="px-4 py-2 text-left">目标</th><th className="px-4 py-2 text-left">页面ID</th><th className="px-4 py-2 text-left">状态</th><th className="px-4 py-2 text-left">错误信息</th></tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{log.syncType}</td>
                  <td className="px-4 py-2">{log.source_locale}</td>
                  <td className="px-4 py-2">{log.target_locale}</td>
                  <td className="px-4 py-2">{log.item_id}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{log.status}</span></td>
                  <td className="px-4 py-2">{log.errorMsg || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}