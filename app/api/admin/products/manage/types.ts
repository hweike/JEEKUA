// app/admin/products/manage/types.ts
export interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

export interface Attribute {
  key: string;
  value: string;
}

export interface Product {
  productId: string;
  product_name: string;
  brand: string;
  sku: string;
  mpn: string;            // 隐藏但保留
  gtin: string;
  price_tiers: PriceTier[];
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  min_order_quantity: number;
  main_image_url: string;
  additional_images: string[];
  description: string;
  short_description: string;
  attributes: Record<string, string>;
  variants_text: string;
  product_type: string;
  google_product_category: number;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  slug: string;
  categoryId: string;
  seriesId: string;          // 二级分类 ID，若为空则直接挂在一级下
  parent_product_id: string;
  order: number;             // 排序，用于列表
  updatedAt: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  productLineId: string;     // 所属产品线 ID
  series: Series[];
}

export interface Series {
  id: string;
  name: string;
  slug: string;
  productModel?: string;     // 关联的产品模型（可选）
}