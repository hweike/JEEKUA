// lib/AiHelper/core/registry.ts
import { RegisteredType } from './types';
import { productCategoryAdapter } from '../services/product-category.service';
import { productAdapter } from '../services/product.service'; 
import { docAdapter } from '../services/doc.service';
import { blogCategoryAdapter } from '../services/blog-category.service';
import { blogPostAdapter } from '../services/blog-post.service';
import { videoCategoryAdapter } from '../services/video-category.service';
import { videoAdapter } from '../services/video.service';
import { pageAdapter } from '../services/page.service';

export const registry: RegisteredType[] = [
  {
    type: 'product-category',
    label: '产品分类',
    service: productCategoryAdapter,
    supportedLanguages: [],
    exportLimit: null,
  },
  {
    type: 'product', // 新增产品类型
    label: '产品',
    service: productAdapter,
    supportedLanguages: [],
    exportLimit: 20, // 限制最多导出20个产品（根据需求）
  },
  {
    type: 'doc',
    label: '文档',
    service: docAdapter,
    supportedLanguages: [],
    exportLimit: 1, // 每次只允许1篇
  },
  {
    type: 'blog-category',
    label: '博客分类',
    service: blogCategoryAdapter,
    supportedLanguages: [],
    exportLimit: null, // 无限制（通常分类数量少）
  },
  
  {
    type: 'blog-post',
    label: '博客文章',
    service: blogPostAdapter,
    supportedLanguages: [],
    exportLimit: 1, // 每次只允许一篇
  },

  {
    type: 'video-category',
    label: '视频分类',
    service: videoCategoryAdapter,
    supportedLanguages: [],
    exportLimit: null, // 无限制
  },

   {
    type: 'video',
    label: '视频',
    service: videoAdapter,
    supportedLanguages: [],
    exportLimit: 1, // 每次只允许一篇
  },
  {
  type: 'page',
  label: '页面',
  service: pageAdapter,
  supportedLanguages: [],
  exportLimit: 1,  // 每次一篇
}
];

export function getRegisteredType(type: string): RegisteredType | undefined {
  return registry.find(item => item.type === type);
}

export function getAllTypes(): Array<{ type: string; label: string; exportLimit: number | null }> {
  return registry.map(({ type, label, exportLimit }) => ({
    type,
    label,
    exportLimit,
  }));
}