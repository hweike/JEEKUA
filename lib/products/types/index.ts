// lib/products/types/index.ts
export interface Series {
  id: string;
  name: string;
  slug: string;
  order: number;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  productLineId: string;
  templateId: string;
  image: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  attributeTemplateId: string;
  series: Series[];
}

export interface ProductLine {
  id: string;
  name: string;
  order: number;
  templateId: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
}

// 存储文件的完整结构（包含两类数据）
export interface ProductData {
  productLines: ProductLine[];
  categories: Category[];
}