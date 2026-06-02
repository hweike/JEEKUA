// modules/discovery/types.ts
export interface SeoData {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  canonical: string | null;
  noindex: boolean;
  nofollow: boolean;
}

export interface PageInfo {
  id: string;               // 唯一标识，如 "product:smartphone"
  title: string;            // 页面标题
  slug: string;             // URL slug
  url: string;              // 相对路径，不含语言前缀
  type: string;             // home, page, product, doc, blog, video, category, inquiry, policy
  content: string;          // 纯文本摘要（用于搜索）
  seo: SeoData;
  updatedAt: string;        // ISO 时间戳
}

// 用于内部链接选择器的树形节点
export interface LinkTreeNode {
  label: string;
  type: string;             // 分组类型或页面类型
  url?: string;             // 叶子节点有 url
  id?: string;              // 叶子节点有 id
  children?: LinkTreeNode[];
}

// 扫描配置
export interface ContentTypeConfig {
  type: string;             // 页面类型，如 'product', 'doc'
  sourceDir: string;        // 相对于 data/ 的目录，如 'products/zh'
  filePattern: RegExp;      // 文件匹配，如 /\.md$/
  urlPrefix: string;        // URL 前缀，如 '/products'
  getSlug: (filename: string, frontmatter: any) => string;
  getTitle: (frontmatter: any, locale: string) => string;
  getContent?: (markdownContent: string) => string; // 可选，提取纯文本
}