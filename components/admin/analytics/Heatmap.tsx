// components/admin/analytics/Heatmap.tsx

'use client';

import { useEffect, useState } from 'react';
import type { PageviewPoint } from '@/lib/umami';

interface HeatmapProps {
  data?: PageviewPoint[];
  loading?: boolean;
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data = [], loading }: HeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<Map<string, number>>(new Map());
  const [maxValue, setMaxValue] = useState(1);

  useEffect(() => {
    if (!data || data.length === 0) {
      setHeatmapData(new Map());
      setMaxValue(1);
      return;
    }

    const map = new Map<string, number>();
    data.forEach((point) => {
      const date = new Date(point.x);
      const day = date.getDay();
      const dayIndex = day === 0 ? 6 : day - 1;
      const hour = date.getHours();
      const key = `${dayIndex}-${hour}`;
      map.set(key, (map.get(key) || 0) + point.y);
    });
    setHeatmapData(map);
    const max = Math.max(1, ...Array.from(map.values()));
    setMaxValue(max);
  }, [data]);

  const getValue = (dayIndex: number, hour: number): number => {
    return heatmapData.get(`${dayIndex}-${hour}`) || 0;
  };

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'bg-blue-100';
    if (intensity < 0.4) return 'bg-blue-200';
    if (intensity < 0.6) return 'bg-blue-300';
    if (intensity < 0.8) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow border animate-pulse">
        <div className="h-[400px] bg-gray-100 rounded"></div>
      </div>
    );
  }

  // 判断是否有数据
  const hasData = heatmapData.size > 0;

  return (
    <div className="bg-white border border-edge rounded-lg px-3 md:px-6 py-6 shadow-sm">
      <h2 className="font-semibold tracking-tight text-xl text-gray-800 mb-4">流量</h2>
      
      {!hasData ? (
        <div className="h-[400px] flex items-center justify-center text-gray-400 border rounded-lg bg-gray-50">
          暂无数据
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            {/* 时间轴 */}
            <div className="grid gap-1" style={{ gridTemplateRows: 'repeat(24, 16px)' }}>
              {HOURS.map((hour) => (
                <div key={hour} className="flex flex-row justify-end text-xs text-gray-400 pr-2 leading-[16px]">
                  {hour === 0 ? '12上午' : hour < 12 ? `${hour}上午` : hour === 12 ? '12下午' : `${hour - 12}下午`}
                </div>
              ))}
            </div>
            {/* 7天数据 */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="grid gap-1" style={{ gridTemplateRows: 'repeat(24, 16px)' }}>
                {HOURS.map((hour) => {
                  const value = getValue(dayIndex, hour);
                  return (
                    <div
                      key={`${dayIndex}-${hour}`}
                      className={`rounded-sm w-4 h-4 mx-auto ${getColor(value)}`}
                      title={`${day} ${hour}:00 - ${value} 访问量`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* 图例 */}
          <div className="flex justify-end items-center mt-4 gap-2 text-xs text-gray-500">
            <span>少</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-blue-100 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-200 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-300 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-400 rounded-sm"></div>
              <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            </div>
            <span>多</span>
          </div>
        </div>
      )}
    </div>
  );
}