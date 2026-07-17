// components/admin/analytics/SessionsTable.tsx

'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Session, SessionListResponse } from '@/lib/umami';

interface SessionsTableProps {
  startAt: number;
  endAt: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  searchQuery?: string;
}

export function SessionsTable({ 
  startAt, 
  endAt, 
  page, 
  pageSize, 
  onPageChange,
  searchQuery = '',
}: SessionsTableProps) {
  const [data, setData] = useState<SessionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        // 构建 URL，包含搜索参数（如果存在）
        let url = `/api/admin/analytics/sessions?startAt=${startAt}&endAt=${endAt}&page=${page}&pageSize=${pageSize}`;
        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '获取会话列表失败');
        }
        const json = await res.json();
        if (json && typeof json === 'object' && Array.isArray(json.data)) {
          setData(json);
        } else {
          setData({ data: [], total: 0, page: 1, pageSize });
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
        setError(err instanceof Error ? err.message : '加载失败，请稍后重试');
        setData({ data: [], total: 0, page: 1, pageSize });
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [startAt, endAt, page, pageSize, searchQuery]);

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const sessions = data?.data || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">加载会话数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
        <p className="text-sm text-gray-400 mt-2">请检查网络连接或稍后重试</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        {searchQuery ? `未找到匹配 "${searchQuery}" 的会话` : '暂无会话数据'}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访客ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">访问页数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">停留时长</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">浏览器</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作系统</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">国家</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.map((session: Session) => (
              <tr key={session.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[120px]">{session.visitorId}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{session.pageviews || 0}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatDuration(session.duration)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{session.browser || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{session.os || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{session.device || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{session.country || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {session.createdAt ? new Date(session.createdAt).toLocaleString('zh-CN') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 {data?.total || 0} 条记录，第 {page}/{totalPages} 页
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}