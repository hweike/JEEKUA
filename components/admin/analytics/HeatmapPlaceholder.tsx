// components/admin/analytics/HeatmapPlaceholder.tsx

export function HeatmapPlaceholder() {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const hours = Array.from({ length: 24 }, (_, i) => 
    i === 0 ? '12上午' : i < 12 ? `${i}上午` : i === 12 ? '12下午' : `${i - 12}下午`
  );

  return (
    <div className="bg-white border border-edge rounded-lg px-3 md:px-6 py-6 shadow-sm">
      <h2 className="font-semibold tracking-tight text-xl text-gray-800 mb-4">流量</h2>
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          {/* 时间轴标签 */}
          <div className="grid gap-1" style={{ gridTemplateRows: 'repeat(24, 16px)' }}>
            {hours.map((h) => (
              <div key={h} className="flex flex-row justify-end text-xs text-gray-400 pr-2">
                {h}
              </div>
            ))}
          </div>
          {/* 7天数据 */}
          {days.map((day) => (
            <div key={day} className="grid gap-1" style={{ gridTemplateRows: 'repeat(24, 16px)' }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-sm w-4 h-4 mx-auto opacity-20"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}