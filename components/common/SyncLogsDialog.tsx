'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface SyncLog {
  id: string;
  syncType: string;
  sourceLocale: string;
  targetLocale: string;
  status: 'success' | 'failed';
  errorMsg?: string;
  operator: string;
  createdAt: string;
  itemId?: string;
}

interface SyncLogsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  syncType: string;
}

export default function SyncLogsDialog({ isOpen, onClose, syncType }: SyncLogsDialogProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, syncType]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sync/logs?type=${syncType}`);
      const data = await res.json();
      setLogs(data);
      const success = data.filter((log: SyncLog) => log.status === 'success').length;
      const failed = data.filter((log: SyncLog) => log.status === 'failed').length;
      setStats({ total: data.length, success, failed });
    } catch (error) {
      console.error('加载同步日志失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm(`确定要清空所有 ${syncType.toUpperCase()} 类型的同步日志吗？此操作不可恢复。`)) return;
    setClearing(true);
    try {
      const res = await fetch(`/api/sync/logs?type=${syncType}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchLogs();
      } else {
        alert('清空失败');
      }
    } catch (error) {
      alert('清空失败');
    } finally {
      setClearing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">同步日志 - {syncType.toUpperCase()}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex gap-4 text-sm">
            <span>总同步次数: <strong>{stats.total}</strong></span>
            <span className="text-green-600">成功: {stats.success}</span>
            <span className="text-red-600">失败: {stats.failed}</span>
          </div>
          <button
            onClick={handleClear}
            disabled={clearing || logs.length === 0}
            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 size={14} /> {clearing ? '清空中...' : '清空日志'}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无同步记录</div>
          ) : (
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">时间</th>
                  <th className="border px-3 py-2 text-left">源站点</th>
                  <th className="border px-3 py-2 text-left">目标站点</th>
                  <th className="border px-3 py-2 text-left">状态</th>
                  <th className="border px-3 py-2 text-left">操作人</th>
                  <th className="border px-3 py-2 text-left">错误信息</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="border px-3 py-1">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="border px-3 py-1">{log.sourceLocale}</td>
                    <td className="border px-3 py-1">{log.targetLocale}</td>
                    <td className="border px-3 py-1">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> 成功</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600"><XCircle size={14} /> 失败</span>
                      )}
                    </td>
                    <td className="border px-3 py-1">{log.operator}</td>
                    <td className="border px-3 py-1 text-red-500">{log.errorMsg || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}