// app/admin/logs/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  type: 'login' | 'admin' | 'menu';
  // 登录日志
  email?: string;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  message?: string;
  // 管理员操作日志
  operatorEmail?: string;
  action?: 'add' | 'delete';
  targetEmail?: string;
  targetName?: string;
  // 菜单访问日志
  path?: string;
  menuName?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<'login' | 'admin' | 'menu' | ''>('');
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const res = await fetch(`/api/admin/logs?${params.toString()}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page, type]);

  const renderLogRow = (log: LogEntry) => {
    const time = new Date(log.timestamp).toLocaleString();
    if (log.type === 'login') {
      return (
        <tr key={log.timestamp + log.email} className="border-b">
          <td className="px-4 py-2">{time}</td>
          <td className="px-4 py-2">登录</td>
          <td className="px-4 py-2">{log.email}</td>
          <td className="px-4 py-2">{log.ip}</td>
          <td className="px-4 py-2">{log.success ? '成功' : '失败'}</td>
          <td className="px-4 py-2">{log.message || ''}</td>
        </tr>
      );
    } else if (log.type === 'admin') {
      return (
        <tr key={log.timestamp + log.targetEmail} className="border-b">
          <td className="px-4 py-2">{time}</td>
          <td className="px-4 py-2">管理员操作</td>
          <td className="px-4 py-2">{log.operatorEmail}</td>
          <td className="px-4 py-2">{log.action === 'add' ? '添加' : '删除'}</td>
          <td className="px-4 py-2">{log.targetEmail} ({log.targetName})</td>
          <td className="px-4 py-2">{log.ip}</td>
        </tr>
      );
    } else {
      return (
        <tr key={log.timestamp + log.path} className="border-b">
          <td className="px-4 py-2">{time}</td>
          <td className="px-4 py-2">菜单访问</td>
          <td className="px-4 py-2">{log.email}</td>
          <td className="px-4 py-2">{log.menuName}</td>
          <td className="px-4 py-2">{log.path}</td>
          <td className="px-4 py-2">{log.ip}</td>
        </tr>
      );
    }
  };

  if (loading && page === 1) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-4">网站日志</h1>
      <div className="mb-4 flex gap-2">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value as any); setPage(1); }}
          className="border rounded p-2"
        >
          <option value="">全部类型</option>
          <option value="login">登录日志</option>
          <option value="admin">管理员操作</option>
          <option value="menu">菜单访问</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">时间</th>
              <th className="px-4 py-2 text-left">类型</th>
              <th className="px-4 py-2 text-left">用户/操作者</th>
              <th className="px-4 py-2 text-left">详情</th>
              <th className="px-4 py-2 text-left">IP</th>
              <th className="px-4 py-2 text-left">备注</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => renderLogRow(log))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          上一页
        </button>
        <span>第 {page} 页 / 共 {Math.ceil(total / limit)} 页 (总计 {total} 条)</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page * limit >= total}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>
  );
}