// app/admin/discovery/seo/components/SEOTable.tsx

'use client';

import { Edit, CheckSquare, Square } from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge'; // 修正路径
import { ScoreCircle } from './ScoreCircle';
import { PAGE_TYPE_LABELS, type PageListItem } from '../types';

interface SEOTableProps {
  pages: PageListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  onEdit: (page: PageListItem) => void;
  loading?: boolean;
}

export function SEOTable({
  pages,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onEdit,
  loading,
}: SEOTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        加载中...
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
        <p className="text-lg">暂无页面</p>
        <p className="text-sm mt-1">请调整筛选条件或等待数据同步</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left">
                <button onClick={onToggleSelectAll} className="text-gray-500 hover:text-gray-700">
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                标题
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                语言
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SEO 评分
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page) => (
              <tr key={`${page.id}-${page.locale}`} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <button
                    onClick={() => onToggleSelect(page.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedIds.has(page.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{page.title}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">
                    {page.seo?.metaTitle || '未设置标题'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {PAGE_TYPE_LABELS[page.type] || page.type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{page.locale}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={page.seoStatus} />
                </td>
                <td className="px-4 py-3">
                  {page.seoScore !== undefined ? (
                    <ScoreCircle score={page.seoScore} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit(page)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}