// components/admin/analytics/RealtimeActivityLog.tsx

'use client';

import { Search, Eye, User, MousePointerClick, X } from 'lucide-react';

type FilterType = 'all' | 'pageview' | 'session' | 'event';

interface Activity {
  id: string;
  type: 'pageview' | 'session' | 'event';
  event?: string;
  path?: string;
  visitorId?: string;
  timestamp: string;
  browser?: string;
  country?: string;
}

interface RealtimeActivityLogProps {
  activities: Activity[];
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '所有' },
  { key: 'pageview', label: '浏览量' },
  { key: 'session', label: '访客' },
  { key: 'event', label: '行为类别' },
];

const TYPE_ICONS = {
  pageview: Eye,
  session: User,
  event: MousePointerClick,
};

const TYPE_COLORS = {
  pageview: 'text-blue-600 bg-blue-50',
  session: 'text-green-600 bg-green-50',
  event: 'text-orange-600 bg-orange-50',
};

export function RealtimeActivityLog({
  activities,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  loading,
}: RealtimeActivityLogProps) {
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pageview': return '浏览量';
      case 'session': return '访客';
      case 'event': return '行为';
      default: return type;
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'pageview':
        return `浏览了 ${activity.path || '/'}`;
      case 'session':
        return `新会话 ${activity.visitorId ? `(${activity.visitorId.substring(0, 8)})` : ''}`;
      case 'event':
        return `触发了 ${activity.event || '未知事件'}`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-gray-700">活动日志</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 sm:w-40"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* 筛选按钮 */}
            <div className="flex border rounded-lg overflow-hidden">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => onFilterChange(f.key)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    filter === f.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } ${f.key !== 'all' ? 'border-l' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center text-gray-400 py-8">暂无活动</div>
        ) : (
          <div className="space-y-2">
            {activities.map(activity => {
              const Icon = TYPE_ICONS[activity.type] || Eye;
              const colorClass = TYPE_COLORS[activity.type] || 'text-gray-600 bg-gray-50';
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-1.5 rounded-full ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {getTypeLabel(activity.type)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      {activity.country && (
                        <span className="text-xs text-gray-400">· {activity.country}</span>
                      )}
                      {activity.browser && (
                        <span className="text-xs text-gray-400">· {activity.browser}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}