// lib/seo/page-type-registry.ts

import { PageTypeConfig } from './types';
import { homeConfig } from './configs/home.config';
// ✅ 从 page.config.ts 统一导入 page、policy、inquiry
import { pageConfig, policyConfig, inquiryConfig } from './configs/page.config';
import { productLineConfig } from './configs/productLine.config';
import { productCategoryConfig } from './configs/productCategory.config';
import { productCollectionConfig } from './configs/productCollection.config';
import { productConfig } from './configs/product.config';
// 博客配置
import { blogCategoryConfig, blogCollectionConfig, blogPostConfig } from './configs/blog.config';
// ✅ 视频配置
import { videoCategoryConfig, videoCollectionConfig, videoDetailConfig } from './configs/video.config';
// ✅ 文档配置
import { docLibraryConfig, docConfig } from './configs/doc.config';

// 导出的注册表
export const pageTypeRegistry: Record<string, PageTypeConfig> = {
  // ===== 通用页面 =====
  home: homeConfig,
  page: pageConfig,
  policy: policyConfig,

  // ===== 产品模块 =====
  productLine: productLineConfig,
  productCategory: productCategoryConfig,
  productCollection: productCollectionConfig,
  product: productConfig,

  // ===== 博客模块 =====
  blogCategory: blogCategoryConfig,
  blogCollection: blogCollectionConfig,
  blogPost: blogPostConfig,

  // ===== 视频模块 =====
  videoCategory: videoCategoryConfig,
  videoCollection: videoCollectionConfig,
  videoDetail: videoDetailConfig,

  // ===== 文档模块 =====
  docLibrary: docLibraryConfig,
  doc: docConfig,

  // ===== 其他 =====
  inquiry: inquiryConfig,
};

// 导出类型（方便外部使用）
export type PageTypeRegistry = typeof pageTypeRegistry;
export type RegisteredPageType = keyof PageTypeRegistry;