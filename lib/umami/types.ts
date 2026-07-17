// lib/umami/types.ts

/**
 * 核心指标
 */
export interface WebsiteStats {
  pageviews: number;
  visitors: number;
  visits: number;
  bounceRate: number;
  totalTime: number;
}

/**
 * 时间序列数据点 (用于趋势图)
 */
export interface PageviewPoint {
  x: number;  // 时间戳 (毫秒)
  y: number;  // 数值
}

/**
 * 维度数据项 (用于分类统计)
 */
export interface MetricItem {
  x: string;  // 维度值，如 "Chrome", "US"
  y: number;  // 数值
}

/**
 * 会话信息
 */
export interface Session {
  id: string;
  visitorId: string;
  pageviews: number;
  duration: number;
  browser: string;
  os: string;
  device: string;
  country: string;
  city?: string;
  language?: string;
  createdAt: string; // ISO 日期字符串
}

/**
 * 会话列表响应
 */
export interface SessionListResponse {
  data: Session[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 比较数据 (与上一周期或去年同期对比)
 */
export interface CompareStats extends WebsiteStats {
  change: {
    pageviews: number;   // 百分比变化 (如 12.5 表示 +12.5%)
    visitors: number;
    visits: number;
    bounceRate: number;
    totalTime: number;
  };
}

/**
 * Metrics 支持的维度类型
 */
export type MetricType = 
  | 'url'          // 页面 URL
  | 'referrer'     // 来源
  | 'browser'      // 浏览器
  | 'os'           // 操作系统
  | 'device'       // 设备类型 (mobile/desktop/tablet)
  | 'country'      // 国家
  | 'city'         // 城市
  | 'language';    // 语言

/**
 * 时间单位
 */
export type TimeUnit = 'minute' | 'hour' | 'day' | 'month';

/**
 * 比较模式
 */
export type CompareMode = 'prev' | 'yoy';

/**
 * 实时在线响应
 */
export interface ActiveVisitorsResponse {
  visitors: number;
}