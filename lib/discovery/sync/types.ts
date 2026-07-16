// lib/discovery/sync/types.ts

export interface SyncContext {
  /** pages 表中的源页面记录 */
  sourcePage: any;
  /** 目标语言代码，如 'zh', 'de' */
  targetLocale: string;
  repairOnly: boolean;      // true: 仅修复关联，不复制业务数据
  translate?: boolean;      // false: 不翻译（只复制原文），true: 翻译
  operator?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  /** 完整同步时返回翻译后的数据，供 route 更新 pages 表使用 */
  data?: any;
}