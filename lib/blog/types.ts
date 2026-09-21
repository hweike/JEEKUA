// lib/blog/types.ts

export interface BlogConfig {
  name: string;
  tagline?: string;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  order?: number;
  template?: string;          // 关联的模板 ID
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  postCount?: number;         // 运行时计算
  children?: BlogCategory[];  // 运行时树形结构
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  date: string;               // 发布日期
  category: string;           // 分类 ID
  author?: string;
  excerpt?: string;
  videoUrl?: string;
  content: string;            // 正文
  tags?: string[];
  seo?: any;                  // 可改为 seoTitle, seoDescription 等
  image?: string;
  // 建议增加以下字段（与产品页对齐）
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  dateModified?: string;
  readingTime?: number;
}