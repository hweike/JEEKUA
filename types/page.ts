// types/page.ts

export type PageType = 'home' | 'policy' | 'custom' | 'Inquiry';
export type Visibility = 'visible' | 'hidden';

/**
 * 页面索引条目（用于列表查询，轻量）
 * - 不含 content
 * - 不含 templateData
 */
export interface PageIndexEntry {
  id: string;
  title: string;
  type: PageType;
  preset: boolean;
  visible: Visibility;
  template: string;
  templateHash: string | null;
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  createdAt: string;
  updatedAt: string;
  locale?: string;
}

/**
 * 页面完整数据（含 content 和 templateData）
 * - 对应 site_pages 表
 */
export interface PageData {
  id: string;
  title: string;
  type: PageType;
  preset: boolean;
  visible: Visibility;
  template: string;
  templateHash: string | null;
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  /** 富文本内容（JSON 字符串） */
  content: string;
  /** 模板数据（Puck JSON） */
  templateData: any | null;
  createdAt: string;
  updatedAt: string;
  locale?: string;
}

/**
 * @deprecated .md 文件已废弃，此类型不再使用
 */
export type PageFrontMatter = never;

/**
 * @deprecated 已迁移到数据库，此类型不再使用
 */
export interface LocalePagesIndex {
  [pageId: string]: PageIndexEntry;
}

export interface HreflangIndex {
  [pageId: string]: {
    [locale: string]: string;
  };
}

export interface Language {
  code: string;
  name: string;
}