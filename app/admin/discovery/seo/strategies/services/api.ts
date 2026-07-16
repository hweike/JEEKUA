// app/admin/discovery/seo/strategies/services/api.ts

import type { Strategy, GlobalConfig } from '../types';
import { API_BASE } from '../constants';

export async function fetchStrategies(): Promise<Strategy[]> {
  const res = await fetch(`${API_BASE}/strategies`);
  if (!res.ok) throw new Error('获取策略列表失败');
  const json = await res.json();
  return json.data;
}

export async function fetchStrategy(pageType: string): Promise<Strategy | null> {
  const res = await fetch(`${API_BASE}/strategies/${pageType}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('获取策略失败');
  const json = await res.json();
  return json.data;
}

export async function saveStrategy(strategy: Strategy): Promise<Strategy> {
  const res = await fetch(`${API_BASE}/strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(strategy),
  });
  if (!res.ok) throw new Error('保存策略失败');
  const json = await res.json();
  return json.data;
}

export async function fetchGlobalConfig(): Promise<GlobalConfig | null> {
  const res = await fetch(`${API_BASE}/global-config`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('获取全局配置失败');
  const json = await res.json();
  return json.data;
}

export async function saveGlobalConfig(config: GlobalConfig): Promise<GlobalConfig> {
  const res = await fetch(`${API_BASE}/global-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('保存全局配置失败');
  const json = await res.json();
  return json.data;
}