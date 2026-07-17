// components/admin/analytics/WorldMap.tsx

'use client';

import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import type { MetricItem } from '@/lib/umami';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface WorldMapProps {
  data: MetricItem[];
  loading?: boolean;
  height?: number;
}

export function WorldMap({ data = [], loading, height = 400 }: WorldMapProps) {
  const [maxValue, setMaxValue] = useState(1);

  useEffect(() => {
    if (data && data.length > 0) {
      const max = Math.max(...data.map(d => d.y));
      setMaxValue(max > 0 ? max : 1);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded animate-pulse"></div>
    );
  }

  const countryMap: Record<string, number> = {};
  data?.forEach(item => {
    countryMap[item.x] = item.y;
  });

  const colorScale = scaleQuantize<string>()
    .domain([0, maxValue])
    .range(['#f0f8ff', '#d6e9ff', '#b8d9ff', '#96c4ff', '#72adff', '#4a94ff', '#1e79ff', '#0059e6']);

  // 如果没有数据，显示空状态
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center text-gray-400 border rounded-lg bg-gray-50">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ComposableMap
        projectionConfig={{
          scale: 140,
          center: [0, 20],
        }}
        width={800}
        height={height}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryCode = geo.id;
              const value = countryMap[countryCode] || 0;
              const fill = value > 0 ? colorScale(value) : '#f5f5f5';
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#e0e0e0"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#4a94ff', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}