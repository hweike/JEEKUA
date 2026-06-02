export interface Product {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  gtin: string;
  description: string;
  shortDescription: string;
  mainImage: string;
  additionalImages: string[];
  priceTiers: Array<{ minQty: number; maxQty: number | null; price: number }>;
  currency: string;
  availability: string;
  minOrderQuantity: number;
  attributes: Record<string, string>;
  variantsText: string;
  productType: string;
  googleProductCategory: number;
  shippingCost: number;
  returnPolicyDays: number;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  categorySlug: string;
  seriesSlug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  slug: string;
  name: string;
}

export interface Series {
  slug: string;
  name: string;
  productModel?: string;
}