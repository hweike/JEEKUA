'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { feature } from 'topojson-client';
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
  const [geoData, setGeoData] = useState<any>(null);

  // 更新最大值
  useEffect(() => {
    if (data && data.length > 0) {
      const max = Math.max(...data.map(d => d.y));
      setMaxValue(max > 0 ? max : 1);
    }
  }, [data]);

  // 加载并转换 TopoJSON 为 GeoJSON
  useEffect(() => {
    fetch(geoUrl)
      .then(res => res.json())
      .then(topology => {
        const countries = feature(topology, topology.objects.countries);
        setGeoData(countries);
      })
      .catch(err => console.error('Failed to load map data:', err));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[400px] bg-gray-100 rounded animate-pulse"></div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center text-gray-400 border rounded-lg bg-gray-50">
        暂无数据
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center text-gray-400 border rounded-lg bg-gray-50">
        加载地图...
      </div>
    );
  }

  // 国家 -> 数值映射
  const countryMap: Record<string, number> = {};
  data.forEach(item => {
    countryMap[item.x] = item.y;
  });

  // 颜色比例尺（同原逻辑）
  const colorScale = scaleQuantize<string>()
    .domain([0, maxValue])
    .range(['#f0f8ff', '#d6e9ff', '#b8d9ff', '#96c4ff', '#72adff', '#4a94ff', '#1e79ff', '#0059e6']);

  // 动态获取每个国家的填充色
  const getCountryStyle = (feature: any) => {
    const countryCode = feature.id;
    const value = countryMap[countryCode] || 0;
    const fill = value > 0 ? colorScale(value) : '#f5f5f5';
    return {
      fillColor: fill,
      fillOpacity: 1,
      color: '#e0e0e0',
      weight: 0.5,
      dashArray: null,
    };
  };

  // 悬停交互（与原 hover 效果一致）
  const onEachCountry = (feature: any, layer: any) => {
    layer.on({
      mouseover: () => {
        layer.setStyle({ fillColor: '#4a94ff' });
      },
      mouseout: () => {
        layer.setStyle(getCountryStyle(feature));
      },
    });
  };

  return (
    <div className="w-full" style={{ height }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        touchZoom={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
        />
        <GeoJSON
          data={geoData}
          style={getCountryStyle}
          onEachFeature={onEachCountry}
        />
      </MapContainer>
    </div>
  );
}