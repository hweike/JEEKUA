// lib/files/constants.ts
export const ReferenceType = {
  ProductCategory: 'product_category',
  Product: 'product',
  BlogCategory: 'blog_category',
  BlogPost: 'blog_post',
  Document: 'document',
  VideoCategory: 'video_category',
  Video: 'video',
} as const;

export type ReferenceTypeValue = typeof ReferenceType[keyof typeof ReferenceType];

export const REFERENCE_TYPE_OPTIONS: { value: ReferenceTypeValue; label: string }[] = [
  { value: ReferenceType.ProductCategory, label: '产品分类' },
  { value: ReferenceType.Product, label: '产品' },
  { value: ReferenceType.BlogCategory, label: '博客分类' },
  { value: ReferenceType.BlogPost, label: '博客文章' },
  { value: ReferenceType.Document, label: '文档' },
  { value: ReferenceType.VideoCategory, label: '视频分类' },
  { value: ReferenceType.Video, label: '视频' },
];