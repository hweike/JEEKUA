// components/admin/analytics/RealtimeList.tsx

'use client';

interface RealtimeListProps {
  title: string;
  items: { name: string; value: number }[];
  loading?: boolean;
  valueLabel?: string;
  maxItems?: number;
}

export function RealtimeList({
  title,
  items,
  loading,
  valueLabel = '访问量',
  maxItems = 10,
}: RealtimeListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-10"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <div className="bg-white rounded-lg shadow border p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {displayItems.length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">暂无数据</div>
      ) : (
        <div className="space-y-1.5">
          {displayItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700 truncate flex-1 mr-2" title={item.name}>
                {item.name}
              </span>
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {item.value.toLocaleString()}
              </span>
            </div>
          ))}
          {items.length > maxItems && (
            <div className="text-xs text-gray-400 text-center pt-1">
              还有 {items.length - maxItems} 项
            </div>
          )}
        </div>
      )}
    </div>
  );
}