// types/page.ts
export type PageType = 'home' | 'policy' | 'custom';
export type Visibility = 'visible' | 'hidden';

export interface PageIndexEntry {
  id: string;
  title: string;
  type: PageType;
  preset: boolean;
  visible: Visibility;
  template: string;
  templateHash?: string;   // 新增
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageData {
  id: string;
  title: string;
  type: PageType;
  preset: boolean;
  visible: Visibility;
  template: string;
  templateHash?: string;   // 新增
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  content: string;
  locale?: string;
  templateData?: any;      // 新增
  createdAt: string;
  updatedAt: string;
}

export interface PageFrontMatter {
  id: string;
  title: string;
  type: PageType;
  preset: boolean;
  visible: Visibility;
  template: string;
  templateHash?: string;   // 新增
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  templateData?: any;      // 新增
  createdAt: string;
  updatedAt: string;
}

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