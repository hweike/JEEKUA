// lib/umami/queries.ts

import { fetchUmami } from './client';
import type {
  WebsiteStats,
  PageviewPoint,
  MetricItem,
  SessionListResponse,
  CompareStats,
  MetricType,
  TimeUnit,
  CompareMode,
  ActiveVisitorsResponse,
} from './types';

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

if (!WEBSITE_ID) {
  console.warn('[Umami] NEXT_PUBLIC_UMAMI_WEBSITE_ID 未设置');
}

/**
 * 构建查询参数字符串
 */
function buildParams(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return entries.length ? `?${entries.join('&')}` : '';
}

/**
 * 1. 获取核心指标
 */
export async function getStats(startAt: number, endAt: number): Promise<WebsiteStats> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  const params = buildParams({ startAt, endAt });
  return fetchUmami(`/api/websites/${WEBSITE_ID}/stats${params}`);
}

/**
 * 2. 获取页面浏览量时间序列 (趋势图)
 */
export async function getPageviews(
  startAt: number,
  endAt: number,
  unit: TimeUnit = 'day'
): Promise<PageviewPoint[]> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  const params = buildParams({ startAt, endAt, unit });
  return fetchUmami(`/api/websites/${WEBSITE_ID}/pageviews${params}`);
}

/**
 * 3. 获取维度分类数据 (行为类别、受众细分)
 * @param type 维度类型: url, referrer, browser, os, device, country, city, language
 * @param limit 返回条数，默认 10
 */
export async function getMetrics(
  startAt: number,
  endAt: number,
  type: MetricType,
  limit: number = 10
): Promise<MetricItem[]> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  const params = buildParams({ startAt, endAt, type, limit });
  return fetchUmami(`/api/websites/${WEBSITE_ID}/metrics${params}`);
}

/**
 * 4. 获取会话列表 (分页)
 */
export async function getSessions(
  startAt: number,
  endAt: number,
  page: number = 1,
  pageSize: number = 20
): Promise<SessionListResponse> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  const params = buildParams({ startAt, endAt, page, pageSize });
  return fetchUmami(`/api/websites/${WEBSITE_ID}/sessions${params}`);
}

/**
 * 5. 获取实时在线人数
 */
export async function getActiveVisitors(): Promise<ActiveVisitorsResponse> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  return fetchUmami(`/api/websites/${WEBSITE_ID}/active`);
}

/**
 * 6. 获取比较数据 (与上一周期或去年同期对比)
 * @param compare 'prev' 上一周期, 'yoy' 去年同期
 */
export async function getCompareStats(
  startAt: number,
  endAt: number,
  compare: CompareMode = 'prev'
): Promise<CompareStats> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  const params = buildParams({ startAt, endAt, compare });
  return fetchUmami(`/api/websites/${WEBSITE_ID}/stats${params}`);
}

/**
 * 7. 获取单个会话详情
 */
export async function getSessionDetail(sessionId: string): Promise<Session> {
  if (!WEBSITE_ID) throw new Error('[Umami] Website ID 未配置');
  return fetchUmami(`/api/websites/${WEBSITE_ID}/sessions/${sessionId}`);
}