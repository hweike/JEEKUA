export interface DocsLib {
  id: string;
  name: string;
  description?: string;
  templateId?: string | null;
  slug?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  sortOrder?: number;
  createdAt: string;
}

export interface Doc {
  id: string;
  libId: string;
  title: string;
  slug: string;
  parentId: string | null;
  order: number;
  file: string;
  templateId?: string | null;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocIndex {
  docs: Doc[];
}

export interface TreeNode {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  order: number;
  children?: TreeNode[];
}