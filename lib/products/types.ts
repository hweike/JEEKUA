// lib/products/types.ts
export interface PriceTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

export interface ProductFrontMatter {
  product_name: string;
  brand: string;
  sku: string;
  mpn: string;
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
  shipping_cost: number;
  return_policy_days: number;
  aggregate_rating: any;
  categoryId: string;
  seriesId: string;
  parent_product_id: string;
  order?: number; // 排序，用于列表
}

export interface ProductIndexItem {
  productId: string;
  name: string;
  sku: string;
  mainImage: string;
  priceRange: string;
  minOrderQuantity: number;
  order: number;
  updatedAt: string;
}