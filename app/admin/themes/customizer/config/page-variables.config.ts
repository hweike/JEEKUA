// app/admin/themes/customizer/config/page-variables.config.ts
import { VARIABLE_LABELS } from './variables';

/**
 * ============================================================
 * 页面变量配置
 * 定义每个页面类型使用哪些变量，以及它们的全局回退关系
 * ============================================================
 */

export interface PageVariableDefinition {
  /** 显示名称（直接引用 VARIABLE_LABELS，或自定义） */
  label: string;
  /** 回退的全局变量键（当全局未定义该键时使用） */
  fallback: string;
  /** 在页面编辑器中所属分组 */
  category: string;
}

/**
 * 各页面类型的变量配置
 * 键 = 页面类型 (home, products, blog, ...)
 */
export const PAGE_VARIABLES: Record<string, Record<string, PageVariableDefinition>> = {
  // ============================================================
  // 首页 (home)
  // ============================================================
  home: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },
    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },
    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },
    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },
    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },
  },

  // ============================================================
  // 产品页面 (products)
  // ============================================================
  products: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 商品卡片 (ProductCard)
    // ============================================================
    'product-card-bg': { label: VARIABLE_LABELS['product-card-bg'], fallback: 'card', category: 'product-card' },
    'product-card-border': { label: VARIABLE_LABELS['product-card-border'], fallback: 'border', category: 'product-card' },
    'product-card-title-color': { label: VARIABLE_LABELS['product-card-title-color'], fallback: 'card-foreground', category: 'product-card' },
    'product-card-title-hover': { label: VARIABLE_LABELS['product-card-title-hover'], fallback: 'primary', category: 'product-card' },
    'product-card-placeholder-bg': { label: VARIABLE_LABELS['product-card-placeholder-bg'], fallback: 'muted', category: 'product-card' },
    'product-price-color': { label: VARIABLE_LABELS['product-price-color'], fallback: 'primary', category: 'product-card' },
    'product-card-shadow': { label: VARIABLE_LABELS['product-card-shadow'], fallback: 'shadow-md', category: 'product-card' },
    'product-card-hover-shadow': { label: VARIABLE_LABELS['product-card-hover-shadow'], fallback: 'shadow-lg', category: 'product-card' },
    'product-card-radius': { label: VARIABLE_LABELS['product-card-radius'], fallback: 'radius', category: 'product-card' },

    // ============================================================
    // 分类树侧边栏 (CategoryTree)
    // ============================================================
    'category-tree-text': { label: VARIABLE_LABELS['category-tree-text'], fallback: 'foreground', category: 'category-tree' },
    'category-tree-hover-text': { label: VARIABLE_LABELS['category-tree-hover-text'], fallback: 'primary', category: 'category-tree' },
    'category-tree-hover-bg': { label: VARIABLE_LABELS['category-tree-hover-bg'], fallback: 'muted', category: 'category-tree' },
    'category-tree-active-text': { label: VARIABLE_LABELS['category-tree-active-text'], fallback: 'primary', category: 'category-tree' },
    'category-tree-active-bg': { label: VARIABLE_LABELS['category-tree-active-bg'], fallback: 'accent', category: 'category-tree' },
    'category-tree-border': { label: VARIABLE_LABELS['category-tree-border'], fallback: 'border', category: 'category-tree' },

    // ============================================================
    // 产品线列表 (ProductLineBlock)
    // ============================================================
    'product-line-header-bg': { label: VARIABLE_LABELS['product-line-header-bg'], fallback: 'background', category: 'product-line-header' },
    'product-line-header-text': { label: VARIABLE_LABELS['product-line-header-text'], fallback: 'foreground', category: 'product-line-header' },
    'product-line-description-text': { label: VARIABLE_LABELS['product-line-description-text'], fallback: 'muted-foreground', category: 'product-line-header' },
    'pagination-bg': { label: VARIABLE_LABELS['pagination-bg'], fallback: 'background', category: 'pagination' },
    'pagination-text': { label: VARIABLE_LABELS['pagination-text'], fallback: 'foreground', category: 'pagination' },
    'pagination-active-bg': { label: VARIABLE_LABELS['pagination-active-bg'], fallback: 'primary', category: 'pagination' },
    'pagination-active-text': { label: VARIABLE_LABELS['pagination-active-text'], fallback: 'primary-foreground', category: 'pagination' },
    'pagination-hover-bg': { label: VARIABLE_LABELS['pagination-hover-bg'], fallback: 'muted', category: 'pagination' },
    'pagination-border': { label: VARIABLE_LABELS['pagination-border'], fallback: 'border', category: 'pagination' },

    // ============================================================
    // 工业产品线表格 (IndustrialProductLineBlock)
    // ============================================================
    'industrial-header-bg': { label: VARIABLE_LABELS['industrial-header-bg'], fallback: 'background', category: 'industrial-header' },
    'industrial-header-text': { label: VARIABLE_LABELS['industrial-header-text'], fallback: 'foreground', category: 'industrial-header' },
    'industrial-description-text': { label: VARIABLE_LABELS['industrial-description-text'], fallback: 'muted-foreground', category: 'industrial-header' },
    'industrial-table-bg': { label: VARIABLE_LABELS['industrial-table-bg'], fallback: 'card', category: 'industrial-table' },
    'industrial-table-header-bg': { label: VARIABLE_LABELS['industrial-table-header-bg'], fallback: 'muted', category: 'industrial-table' },
    'industrial-table-border': { label: VARIABLE_LABELS['industrial-table-border'], fallback: 'border', category: 'industrial-table' },
    'industrial-table-row-hover-bg': { label: VARIABLE_LABELS['industrial-table-row-hover-bg'], fallback: 'muted', category: 'industrial-table' },
    'industrial-table-child-row-bg': { label: VARIABLE_LABELS['industrial-table-child-row-bg'], fallback: 'muted', category: 'industrial-table' },
    'industrial-table-text': { label: VARIABLE_LABELS['industrial-table-text'], fallback: 'foreground', category: 'industrial-table' },
    'industrial-table-muted-text': { label: VARIABLE_LABELS['industrial-table-muted-text'], fallback: 'muted-foreground', category: 'industrial-table' },
    'industrial-table-link-color': { label: VARIABLE_LABELS['industrial-table-link-color'], fallback: 'primary', category: 'industrial-table' },
    'industrial-pagination-bg': { label: VARIABLE_LABELS['industrial-pagination-bg'], fallback: 'background', category: 'industrial-pagination' },
    'industrial-pagination-text': { label: VARIABLE_LABELS['industrial-pagination-text'], fallback: 'foreground', category: 'industrial-pagination' },
    'industrial-pagination-active-bg': { label: VARIABLE_LABELS['industrial-pagination-active-bg'], fallback: 'primary', category: 'industrial-pagination' },
    'industrial-pagination-active-text': { label: VARIABLE_LABELS['industrial-pagination-active-text'], fallback: 'primary-foreground', category: 'industrial-pagination' },
    'industrial-pagination-hover-bg': { label: VARIABLE_LABELS['industrial-pagination-hover-bg'], fallback: 'muted', category: 'industrial-pagination' },
    'industrial-pagination-border': { label: VARIABLE_LABELS['industrial-pagination-border'], fallback: 'border', category: 'industrial-pagination' },
    'industrial-hover-image-bg': { label: VARIABLE_LABELS['industrial-hover-image-bg'], fallback: 'card', category: 'industrial-hover-image' },
    'industrial-hover-image-border': { label: VARIABLE_LABELS['industrial-hover-image-border'], fallback: 'border', category: 'industrial-hover-image' },

    // ============================================================
    // 产品集合 (ProductCollectionsBlock)
    // ============================================================
    'product-collections-bg': { label: VARIABLE_LABELS['product-collections-bg'], fallback: 'background', category: 'product-collections' },
    'product-collections-text': { label: VARIABLE_LABELS['product-collections-text'], fallback: 'foreground', category: 'product-collections' },
    'product-collections-title-color': { label: VARIABLE_LABELS['product-collections-title-color'], fallback: 'foreground', category: 'product-collections' },
    'product-collections-description-text': { label: VARIABLE_LABELS['product-collections-description-text'], fallback: 'muted-foreground', category: 'product-collections' },
    'product-collections-filter-bg': { label: VARIABLE_LABELS['product-collections-filter-bg'], fallback: 'background', category: 'product-collections-filter' },
    'product-collections-filter-text': { label: VARIABLE_LABELS['product-collections-filter-text'], fallback: 'foreground', category: 'product-collections-filter' },
    'product-collections-filter-border': { label: VARIABLE_LABELS['product-collections-filter-border'], fallback: 'border', category: 'product-collections-filter' },
    'product-collections-filter-muted-text': { label: VARIABLE_LABELS['product-collections-filter-muted-text'], fallback: 'muted-foreground', category: 'product-collections-filter' },
    'product-collections-filter-input-bg': { label: VARIABLE_LABELS['product-collections-filter-input-bg'], fallback: 'background', category: 'product-collections-filter' },
    'product-collections-filter-input-text': { label: VARIABLE_LABELS['product-collections-filter-input-text'], fallback: 'foreground', category: 'product-collections-filter' },
    'product-collections-pagination-bg': { label: VARIABLE_LABELS['product-collections-pagination-bg'], fallback: 'background', category: 'product-collections-pagination' },
    'product-collections-pagination-text': { label: VARIABLE_LABELS['product-collections-pagination-text'], fallback: 'foreground', category: 'product-collections-pagination' },
    'product-collections-pagination-hover-bg': { label: VARIABLE_LABELS['product-collections-pagination-hover-bg'], fallback: 'muted', category: 'product-collections-pagination' },
    'product-collections-pagination-border': { label: VARIABLE_LABELS['product-collections-pagination-border'], fallback: 'border', category: 'product-collections-pagination' },

    // ============================================================
    // 产品详情页 (ProductDetailsBlock)
    // ============================================================
    'product-details-bg': { label: VARIABLE_LABELS['product-details-bg'], fallback: 'background', category: 'product-details' },
    'product-details-text': { label: VARIABLE_LABELS['product-details-text'], fallback: 'foreground', category: 'product-details' },
    'product-details-media-border': { label: VARIABLE_LABELS['product-details-media-border'], fallback: 'border', category: 'product-details-media' },
    'product-details-media-bg': { label: VARIABLE_LABELS['product-details-media-bg'], fallback: 'muted', category: 'product-details-media' },
    'product-details-thumbnail-border': { label: VARIABLE_LABELS['product-details-thumbnail-border'], fallback: 'border', category: 'product-details-media' },
    'product-details-thumbnail-active-border': { label: VARIABLE_LABELS['product-details-thumbnail-active-border'], fallback: 'primary', category: 'product-details-media' },
    'product-details-title-color': { label: VARIABLE_LABELS['product-details-title-color'], fallback: 'foreground', category: 'product-details' },
    'product-details-brand-color': { label: VARIABLE_LABELS['product-details-brand-color'], fallback: 'muted-foreground', category: 'product-details' },
    'product-details-price-color': { label: VARIABLE_LABELS['product-details-price-color'], fallback: 'primary', category: 'product-details' },
    'product-details-price-range-color': { label: VARIABLE_LABELS['product-details-price-range-color'], fallback: 'muted-foreground', category: 'product-details' },
    'product-details-variant-border': { label: VARIABLE_LABELS['product-details-variant-border'], fallback: 'border', category: 'product-details-variant' },
    'product-details-variant-bg': { label: VARIABLE_LABELS['product-details-variant-bg'], fallback: 'card', category: 'product-details-variant' },
    'product-details-variant-text': { label: VARIABLE_LABELS['product-details-variant-text'], fallback: 'foreground', category: 'product-details-variant' },
    'product-details-params-border': { label: VARIABLE_LABELS['product-details-params-border'], fallback: 'border', category: 'product-details-params' },
    'product-details-params-label-color': { label: VARIABLE_LABELS['product-details-params-label-color'], fallback: 'muted-foreground', category: 'product-details-params' },
    'product-details-params-value-color': { label: VARIABLE_LABELS['product-details-params-value-color'], fallback: 'foreground', category: 'product-details-params' },
    'product-details-description-text': { label: VARIABLE_LABELS['product-details-description-text'], fallback: 'foreground', category: 'product-details' },
    'product-details-spec-text': { label: VARIABLE_LABELS['product-details-spec-text'], fallback: 'muted-foreground', category: 'product-details' },
    'product-details-stock-text': { label: VARIABLE_LABELS['product-details-stock-text'], fallback: 'muted-foreground', category: 'product-details' },
    'product-details-inquiry-bg': { label: VARIABLE_LABELS['product-details-inquiry-bg'], fallback: '#FF6A00', category: 'product-details-buttons' },
    'product-details-inquiry-text': { label: VARIABLE_LABELS['product-details-inquiry-text'], fallback: '#ffffff', category: 'product-details-buttons' },
    'product-details-inquiry-hover-bg': { label: VARIABLE_LABELS['product-details-inquiry-hover-bg'], fallback: '#e85e00', category: 'product-details-buttons' },
    'product-details-chat-bg': { label: VARIABLE_LABELS['product-details-chat-bg'], fallback: '#25D366', category: 'product-details-buttons' },
    'product-details-chat-text': { label: VARIABLE_LABELS['product-details-chat-text'], fallback: '#ffffff', category: 'product-details-buttons' },
    'product-details-chat-hover-bg': { label: VARIABLE_LABELS['product-details-chat-hover-bg'], fallback: '#1da851', category: 'product-details-buttons' },
    'product-details-store-border': { label: VARIABLE_LABELS['product-details-store-border'], fallback: 'border', category: 'product-details-buttons' },
    'product-details-store-text': { label: VARIABLE_LABELS['product-details-store-text'], fallback: 'foreground', category: 'product-details-buttons' },
    'product-details-store-hover-bg': { label: VARIABLE_LABELS['product-details-store-hover-bg'], fallback: 'muted', category: 'product-details-buttons' },
    'product-details-modal-overlay': { label: VARIABLE_LABELS['product-details-modal-overlay'], fallback: 'rgba(0,0,0,0.5)', category: 'product-details-modal' },
    'product-details-modal-bg': { label: VARIABLE_LABELS['product-details-modal-bg'], fallback: '#ffffff', category: 'product-details-modal' },
    'product-details-modal-close-color': { label: VARIABLE_LABELS['product-details-modal-close-color'], fallback: 'foreground', category: 'product-details-modal' },

    // ---- 筛选栏/空状态 ----
    'filter-bg': { label: '筛选栏背景色', fallback: 'background', category: 'filter' },
    'filter-text': { label: '筛选栏文字色', fallback: 'foreground', category: 'filter' },
    'filter-border': { label: '筛选栏边框色', fallback: 'border', category: 'filter' },
    'filter-active-bg': { label: '筛选激活背景色', fallback: 'primary', category: 'filter' },
    'filter-active-text': { label: '筛选激活文字色', fallback: 'primary-foreground', category: 'filter' },
    'filter-hover-bg': { label: '筛选悬停背景色', fallback: 'muted', category: 'filter' },
    'empty-state-bg': { label: '空状态背景色', fallback: 'background', category: 'empty-state' },
    'empty-state-text': { label: '空状态文字色', fallback: 'muted-foreground', category: 'empty-state' },
  },

  // ============================================================
  // 博客页面 (blog)
  // ============================================================
  blog: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 博客容器 (BlogBlock / BlogCollectionBlock)
    // ============================================================
    'blog-container-bg': { label: VARIABLE_LABELS['blog-container-bg'], fallback: 'background', category: 'blog-container' },
    'blog-container-text': { label: VARIABLE_LABELS['blog-container-text'], fallback: 'foreground', category: 'blog-container' },
    'blog-title-color': { label: VARIABLE_LABELS['blog-title-color'], fallback: 'foreground', category: 'blog-container' },

    // ============================================================
    // 博客文章卡片
    // ============================================================
    'blog-card-border': { label: VARIABLE_LABELS['blog-card-border'], fallback: 'border', category: 'blog-post' },
    'blog-post-title-color': { label: VARIABLE_LABELS['blog-post-title-color'], fallback: 'foreground', category: 'blog-post' },
    'blog-post-title-hover': { label: VARIABLE_LABELS['blog-post-title-hover'], fallback: 'primary', category: 'blog-post' },
    'blog-post-meta-color': { label: VARIABLE_LABELS['blog-post-meta-color'], fallback: 'muted-foreground', category: 'blog-post' },
    'blog-post-excerpt-color': { label: VARIABLE_LABELS['blog-post-excerpt-color'], fallback: 'muted-foreground', category: 'blog-post' },

    // ============================================================
    // 博客侧边栏
    // ============================================================
    'blog-sidebar-bg': { label: VARIABLE_LABELS['blog-sidebar-bg'], fallback: 'transparent', category: 'blog-sidebar' },
    'blog-sidebar-text': { label: VARIABLE_LABELS['blog-sidebar-text'], fallback: 'foreground', category: 'blog-sidebar' },
    'blog-sidebar-active-bg': { label: VARIABLE_LABELS['blog-sidebar-active-bg'], fallback: 'accent', category: 'blog-sidebar' },
    'blog-sidebar-active-text': { label: VARIABLE_LABELS['blog-sidebar-active-text'], fallback: 'accent-foreground', category: 'blog-sidebar' },
    'blog-sidebar-hover-bg': { label: VARIABLE_LABELS['blog-sidebar-hover-bg'], fallback: 'accent', category: 'blog-sidebar' },
    'blog-sidebar-hover-text': { label: VARIABLE_LABELS['blog-sidebar-hover-text'], fallback: 'accent-foreground', category: 'blog-sidebar' },

    // ============================================================
    // 博客分页
    // ============================================================
    'blog-pagination-bg': { label: VARIABLE_LABELS['blog-pagination-bg'], fallback: 'transparent', category: 'blog-pagination' },
    'blog-pagination-text': { label: VARIABLE_LABELS['blog-pagination-text'], fallback: 'foreground', category: 'blog-pagination' },
    'blog-pagination-border': { label: VARIABLE_LABELS['blog-pagination-border'], fallback: 'border', category: 'blog-pagination' },
    'blog-pagination-hover-bg': { label: VARIABLE_LABELS['blog-pagination-hover-bg'], fallback: 'accent', category: 'blog-pagination' },
    'blog-pagination-disabled-opacity': { label: VARIABLE_LABELS['blog-pagination-disabled-opacity'], fallback: '0.5', category: 'blog-pagination' },

    // ============================================================
    // 博客详情页 (BlogDetail)
    // ============================================================
    'blog-detail-bg': { label: VARIABLE_LABELS['blog-detail-bg'], fallback: 'background', category: 'blog-detail' },
    'blog-detail-text': { label: VARIABLE_LABELS['blog-detail-text'], fallback: 'foreground', category: 'blog-detail' },
    'blog-detail-title-color': { label: VARIABLE_LABELS['blog-detail-title-color'], fallback: 'foreground', category: 'blog-detail' },
    'blog-detail-meta-color': { label: VARIABLE_LABELS['blog-detail-meta-color'], fallback: 'muted-foreground', category: 'blog-detail' },
    'blog-detail-heading-color': { label: VARIABLE_LABELS['blog-detail-heading-color'], fallback: 'foreground', category: 'blog-detail' },
    'blog-detail-content-color': { label: VARIABLE_LABELS['blog-detail-content-color'], fallback: 'foreground', category: 'blog-detail' },
    'blog-detail-link-color': { label: VARIABLE_LABELS['blog-detail-link-color'], fallback: 'primary', category: 'blog-detail' },
    'blog-detail-tag-bg': { label: VARIABLE_LABELS['blog-detail-tag-bg'], fallback: 'muted', category: 'blog-detail' },
    'blog-detail-tag-text': { label: VARIABLE_LABELS['blog-detail-tag-text'], fallback: 'muted-foreground', category: 'blog-detail' },
    'blog-detail-video-radius': { label: VARIABLE_LABELS['blog-detail-video-radius'], fallback: 'radius', category: 'blog-detail' },

    // ============================================================
    // 博客图片
    // ============================================================
    'blog-image-radius': { label: VARIABLE_LABELS['blog-image-radius'], fallback: 'radius', category: 'blog-image' },
  },

  // ============================================================
  // 文档页面 (docs)
  // ============================================================
  docs: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 文档库 (DocumentLibraryBlock)
    // ============================================================
    'doc-library-bg': { label: VARIABLE_LABELS['doc-library-bg'], fallback: 'background', category: 'doc-library' },
    'doc-library-text': { label: VARIABLE_LABELS['doc-library-text'], fallback: 'foreground', category: 'doc-library' },
    'doc-library-title-color': { label: VARIABLE_LABELS['doc-library-title-color'], fallback: 'foreground', category: 'doc-library' },
    'doc-library-heading-color': { label: VARIABLE_LABELS['doc-library-heading-color'], fallback: 'foreground', category: 'doc-library' },
    'doc-library-content-color': { label: VARIABLE_LABELS['doc-library-content-color'], fallback: 'foreground', category: 'doc-library' },
    'doc-library-link-color': { label: VARIABLE_LABELS['doc-library-link-color'], fallback: 'primary', category: 'doc-library' },
    'doc-library-divider': { label: VARIABLE_LABELS['doc-library-divider'], fallback: 'border', category: 'doc-library' },
    'doc-library-loading-color': { label: VARIABLE_LABELS['doc-library-loading-color'], fallback: 'muted-foreground', category: 'doc-library' },

    // ============================================================
    // 文档树侧边栏 (DocumentTreeSidebar)
    // ============================================================
    'doc-sidebar-bg': { label: VARIABLE_LABELS['doc-sidebar-bg'], fallback: 'background', category: 'doc-sidebar' },
    'doc-sidebar-text': { label: VARIABLE_LABELS['doc-sidebar-text'], fallback: 'foreground', category: 'doc-sidebar' },
    'doc-sidebar-hover-bg': { label: VARIABLE_LABELS['doc-sidebar-hover-bg'], fallback: 'muted', category: 'doc-sidebar' },
    'doc-sidebar-hover-text': { label: VARIABLE_LABELS['doc-sidebar-hover-text'], fallback: 'primary', category: 'doc-sidebar' },
    'doc-sidebar-active-bg': { label: VARIABLE_LABELS['doc-sidebar-active-bg'], fallback: 'transparent', category: 'doc-sidebar' },
    'doc-sidebar-active-text': { label: VARIABLE_LABELS['doc-sidebar-active-text'], fallback: 'primary', category: 'doc-sidebar' },
    'doc-sidebar-active-border': { label: VARIABLE_LABELS['doc-sidebar-active-border'], fallback: 'primary', category: 'doc-sidebar' },
    'doc-sidebar-border': { label: VARIABLE_LABELS['doc-sidebar-border'], fallback: 'border', category: 'doc-sidebar' },
    'doc-sidebar-group-label-color': { label: VARIABLE_LABELS['doc-sidebar-group-label-color'], fallback: 'muted-foreground', category: 'doc-sidebar' },
    'doc-sidebar-badge-bg': { label: VARIABLE_LABELS['doc-sidebar-badge-bg'], fallback: 'primary', category: 'doc-sidebar' },
    'doc-sidebar-badge-text': { label: VARIABLE_LABELS['doc-sidebar-badge-text'], fallback: 'primary-foreground', category: 'doc-sidebar' },

    // ============================================================
    // 文档详情页 (DocDetail)
    // ============================================================
    'doc-detail-bg': { label: VARIABLE_LABELS['doc-detail-bg'], fallback: 'background', category: 'doc-detail' },
    'doc-detail-text': { label: VARIABLE_LABELS['doc-detail-text'], fallback: 'foreground', category: 'doc-detail' },
    'doc-detail-title-color': { label: VARIABLE_LABELS['doc-detail-title-color'], fallback: 'foreground', category: 'doc-detail' },
    'doc-detail-heading-color': { label: VARIABLE_LABELS['doc-detail-heading-color'], fallback: 'foreground', category: 'doc-detail' },
    'doc-detail-content-color': { label: VARIABLE_LABELS['doc-detail-content-color'], fallback: 'foreground', category: 'doc-detail' },
    'doc-detail-link-color': { label: VARIABLE_LABELS['doc-detail-link-color'], fallback: 'primary', category: 'doc-detail' },
    'doc-detail-loading-color': { label: VARIABLE_LABELS['doc-detail-loading-color'], fallback: 'muted-foreground', category: 'doc-detail' },
    'doc-detail-divider-color': { label: VARIABLE_LABELS['doc-detail-divider-color'], fallback: 'border', category: 'doc-detail' },
  },

  // ============================================================
  // 视频页面 (video)
  // ============================================================
  video: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 视频分类列表 (VideoCategoryBlock)
    // ============================================================
    'video-category-bg': { label: VARIABLE_LABELS['video-category-bg'], fallback: 'background', category: 'video-category' },
    'video-category-text': { label: VARIABLE_LABELS['video-category-text'], fallback: 'foreground', category: 'video-category' },
    'video-category-title-color': { label: VARIABLE_LABELS['video-category-title-color'], fallback: 'foreground', category: 'video-category' },
    'video-category-btn-bg': { label: VARIABLE_LABELS['video-category-btn-bg'], fallback: 'muted', category: 'video-category-buttons' },
    'video-category-btn-text': { label: VARIABLE_LABELS['video-category-btn-text'], fallback: 'muted-foreground', category: 'video-category-buttons' },
    'video-category-btn-hover-bg': { label: VARIABLE_LABELS['video-category-btn-hover-bg'], fallback: 'accent', category: 'video-category-buttons' },
    'video-category-btn-hover-text': { label: VARIABLE_LABELS['video-category-btn-hover-text'], fallback: 'accent-foreground', category: 'video-category-buttons' },
    'video-category-btn-active-bg': { label: VARIABLE_LABELS['video-category-btn-active-bg'], fallback: 'primary', category: 'video-category-buttons' },
    'video-category-btn-active-text': { label: VARIABLE_LABELS['video-category-btn-active-text'], fallback: 'primary-foreground', category: 'video-category-buttons' },
    'video-card-border': { label: VARIABLE_LABELS['video-card-border'], fallback: 'border', category: 'video-card' },
    'video-card-shadow': { label: VARIABLE_LABELS['video-card-shadow'], fallback: 'shadow-md', category: 'video-card' },
    'video-card-hover-shadow': { label: VARIABLE_LABELS['video-card-hover-shadow'], fallback: 'shadow-lg', category: 'video-card' },
    'video-card-radius': { label: VARIABLE_LABELS['video-card-radius'], fallback: 'radius', category: 'video-card' },
    'video-title-color': { label: VARIABLE_LABELS['video-title-color'], fallback: 'foreground', category: 'video-card' },
    'video-title-hover': { label: VARIABLE_LABELS['video-title-hover'], fallback: 'primary', category: 'video-card' },
    'video-meta-color': { label: VARIABLE_LABELS['video-meta-color'], fallback: 'muted-foreground', category: 'video-card' },
    'video-placeholder-bg': { label: VARIABLE_LABELS['video-placeholder-bg'], fallback: 'muted', category: 'video-card' },
    'video-placeholder-text': { label: VARIABLE_LABELS['video-placeholder-text'], fallback: 'muted-foreground', category: 'video-card' },
    'video-play-btn-bg': { label: VARIABLE_LABELS['video-play-btn-bg'], fallback: 'rgba(255,255,255,0.8)', category: 'video-card' },
    'video-play-btn-color': { label: VARIABLE_LABELS['video-play-btn-color'], fallback: 'primary', category: 'video-card' },
    'video-pagination-bg': { label: VARIABLE_LABELS['video-pagination-bg'], fallback: 'transparent', category: 'video-pagination' },
    'video-pagination-text': { label: VARIABLE_LABELS['video-pagination-text'], fallback: 'foreground', category: 'video-pagination' },
    'video-pagination-border': { label: VARIABLE_LABELS['video-pagination-border'], fallback: 'border', category: 'video-pagination' },
    'video-pagination-hover-bg': { label: VARIABLE_LABELS['video-pagination-hover-bg'], fallback: 'accent', category: 'video-pagination' },
    'video-pagination-disabled-opacity': { label: VARIABLE_LABELS['video-pagination-disabled-opacity'], fallback: '0.5', category: 'video-pagination' },
    'video-loading-color': { label: VARIABLE_LABELS['video-loading-color'], fallback: 'muted-foreground', category: 'video-category' },

    // ============================================================
    // 视频详情页 (VideoDetail)
    // ============================================================
    'video-detail-bg': { label: VARIABLE_LABELS['video-detail-bg'], fallback: 'background', category: 'video-detail' },
    'video-detail-text': { label: VARIABLE_LABELS['video-detail-text'], fallback: 'foreground', category: 'video-detail' },
    'video-detail-title-color': { label: VARIABLE_LABELS['video-detail-title-color'], fallback: 'foreground', category: 'video-detail' },
    'video-detail-meta-color': { label: VARIABLE_LABELS['video-detail-meta-color'], fallback: 'muted-foreground', category: 'video-detail' },
    'video-detail-divider': { label: VARIABLE_LABELS['video-detail-divider'], fallback: 'border', category: 'video-detail' },
    'video-detail-tag-bg': { label: VARIABLE_LABELS['video-detail-tag-bg'], fallback: 'muted', category: 'video-detail' },
    'video-detail-tag-text': { label: VARIABLE_LABELS['video-detail-tag-text'], fallback: 'muted-foreground', category: 'video-detail' },
    'video-detail-heading-color': { label: VARIABLE_LABELS['video-detail-heading-color'], fallback: 'foreground', category: 'video-detail' },
    'video-detail-content-color': { label: VARIABLE_LABELS['video-detail-content-color'], fallback: 'foreground', category: 'video-detail' },
    'video-detail-link-color': { label: VARIABLE_LABELS['video-detail-link-color'], fallback: 'primary', category: 'video-detail' },
    'video-detail-player-radius': { label: VARIABLE_LABELS['video-detail-player-radius'], fallback: 'radius', category: 'video-detail' },
  },

  // ============================================================
  // 询盘页面 (inquiry)
  // ============================================================
  inquiry: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 询盘表单
    // ============================================================
    'inquiry-bg': { label: VARIABLE_LABELS['inquiry-bg'], fallback: 'muted', category: 'inquiry' },
    'inquiry-text': { label: VARIABLE_LABELS['inquiry-text'], fallback: 'foreground', category: 'inquiry' },
    'inquiry-padding-top': { label: VARIABLE_LABELS['inquiry-padding-top'], fallback: '2.5rem', category: 'inquiry' },
    'inquiry-padding-bottom': { label: VARIABLE_LABELS['inquiry-padding-bottom'], fallback: '2.5rem', category: 'inquiry' },
  },

  // ============================================================
  // 普通页面 (custom)
  // ============================================================
  custom: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 页面内容
    // ============================================================
    'page-bg': { label: VARIABLE_LABELS['page-bg'], fallback: 'background', category: 'page' },
    'page-text': { label: VARIABLE_LABELS['page-text'], fallback: 'foreground', category: 'page' },
    'page-heading-color': { label: VARIABLE_LABELS['page-heading-color'], fallback: 'foreground', category: 'page' },
    'page-content-color': { label: VARIABLE_LABELS['page-content-color'], fallback: 'foreground', category: 'page' },
    'page-link-color': { label: VARIABLE_LABELS['page-link-color'], fallback: 'primary', category: 'page' },
  },

  // ============================================================
  // 搜索页面 (search)
  // ============================================================
  search: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ============================================================
    // 搜索页面内容
    // ============================================================
    'search-bg': { label: VARIABLE_LABELS['search-bg'], fallback: 'background', category: 'search' },
    'search-text': { label: VARIABLE_LABELS['search-text'], fallback: 'foreground', category: 'search' },
    'search-title-color': { label: VARIABLE_LABELS['search-title-color'], fallback: 'foreground', category: 'search' },
    'search-subtitle-color': { label: VARIABLE_LABELS['search-subtitle-color'], fallback: 'muted-foreground', category: 'search' },
    'search-description-color': { label: VARIABLE_LABELS['search-description-color'], fallback: 'muted-foreground', category: 'search' },

    // ---- 搜索输入框 ----
    'search-input-bg': { label: VARIABLE_LABELS['search-input-bg'], fallback: 'background', category: 'search-input' },
    'search-input-border': { label: VARIABLE_LABELS['search-input-border'], fallback: 'border', category: 'search-input' },
    'search-input-text': { label: VARIABLE_LABELS['search-input-text'], fallback: 'foreground', category: 'search-input' },
    'search-input-focus-ring': { label: VARIABLE_LABELS['search-input-focus-ring'], fallback: 'primary', category: 'search-input' },

    // ---- 搜索结果 ----
    'search-result-bg': { label: VARIABLE_LABELS['search-result-bg'], fallback: 'card', category: 'search-result' },
    'search-result-border': { label: VARIABLE_LABELS['search-result-border'], fallback: 'border', category: 'search-result' },
    'search-result-text': { label: VARIABLE_LABELS['search-result-text'], fallback: 'card-foreground', category: 'search-result' },
    'search-result-hover-bg': { label: VARIABLE_LABELS['search-result-hover-bg'], fallback: 'muted', category: 'search-result' },
    'search-result-title': { label: VARIABLE_LABELS['search-result-title'], fallback: 'foreground', category: 'search-result' },
    'search-result-title-hover': { label: VARIABLE_LABELS['search-result-title-hover'], fallback: 'primary', category: 'search-result' },
    'search-result-meta': { label: VARIABLE_LABELS['search-result-meta'], fallback: 'muted-foreground', category: 'search-result' },
    'search-result-excerpt': { label: VARIABLE_LABELS['search-result-excerpt'], fallback: 'foreground', category: 'search-result' },
    'search-count-color': { label: VARIABLE_LABELS['search-count-color'], fallback: 'muted-foreground', category: 'search-result' },
    'search-empty-text': { label: VARIABLE_LABELS['search-empty-text'], fallback: 'muted-foreground', category: 'search-empty' },
    'search-empty-hint': { label: VARIABLE_LABELS['search-empty-hint'], fallback: 'muted-foreground', category: 'search-empty' },
    'search-divider': { label: VARIABLE_LABELS['search-divider'], fallback: 'border', category: 'search' },

    // ---- 结果类型标签 ----
    'search-type-product': { label: VARIABLE_LABELS['search-type-product'], fallback: 'primary', category: 'search-types' },
    'search-type-document': { label: VARIABLE_LABELS['search-type-document'], fallback: 'accent', category: 'search-types' },
    'search-type-blog': { label: VARIABLE_LABELS['search-type-blog'], fallback: 'secondary-foreground', category: 'search-types' },
  },

  // ============================================================
  // 用户中心页面 (account)
  // ============================================================
  account: {
    // ---- 品牌颜色 ----
    primary: { label: VARIABLE_LABELS.primary, fallback: 'primary', category: 'brand' },
    secondary: { label: VARIABLE_LABELS.secondary, fallback: 'secondary', category: 'brand' },
    accent: { label: VARIABLE_LABELS.accent, fallback: 'accent', category: 'brand' },

    // ---- 页面背景 ----
    background: { label: VARIABLE_LABELS.background, fallback: 'background', category: 'background' },
    foreground: { label: VARIABLE_LABELS.foreground, fallback: 'foreground', category: 'background' },

    // ---- 导航栏 ----
    'navbar-bg': { label: VARIABLE_LABELS['navbar-bg'], fallback: 'background', category: 'navbar' },
    'navbar-text': { label: VARIABLE_LABELS['navbar-text'], fallback: 'foreground', category: 'navbar' },
    'navbar-hover-bg': { label: VARIABLE_LABELS['navbar-hover-bg'], fallback: 'secondary', category: 'navbar' },
    'navbar-hover-text': { label: VARIABLE_LABELS['navbar-hover-text'], fallback: 'secondary-foreground', category: 'navbar' },
    'navbar-active-text': { label: VARIABLE_LABELS['navbar-active-text'], fallback: 'primary', category: 'navbar' },
    'navbar-divider-color': { label: VARIABLE_LABELS['navbar-divider-color'], fallback: 'border', category: 'navbar' },

    // ---- 页脚 ----
    'footer-bg': { label: VARIABLE_LABELS['footer-bg'], fallback: 'background', category: 'footer' },
    'footer-text': { label: VARIABLE_LABELS['footer-text'], fallback: 'foreground', category: 'footer' },
    'footer-link': { label: VARIABLE_LABELS['footer-link'], fallback: 'primary', category: 'footer' },
    'footer-link-hover': { label: VARIABLE_LABELS['footer-link-hover'], fallback: 'accent', category: 'footer' },
    'footer-divider-color': { label: VARIABLE_LABELS['footer-divider-color'], fallback: 'border', category: 'footer' },

    // ---- 公告栏 ----
    'announcement-bg': { label: VARIABLE_LABELS['announcement-bg'], fallback: 'popover', category: 'announcement' },
    'announcement-text': { label: VARIABLE_LABELS['announcement-text'], fallback: 'popover-foreground', category: 'announcement' },

    // ---- 登录页 ----
    'account-login-bg': { label: VARIABLE_LABELS['account-login-bg'], fallback: '#f9fafb', category: 'account-login' },
    'account-login-card-bg': { label: VARIABLE_LABELS['account-login-card-bg'], fallback: '#ffffff', category: 'account-login' },
    'account-login-card-shadow': { label: VARIABLE_LABELS['account-login-card-shadow'], fallback: '0 10px 15px -3px rgb(0 0 0 / 0.1)', category: 'account-login' },
    'account-login-card-radius': { label: VARIABLE_LABELS['account-login-card-radius'], fallback: '0.5rem', category: 'account-login' },
    'account-login-title-color': { label: VARIABLE_LABELS['account-login-title-color'], fallback: '#111827', category: 'account-login' },
    'account-login-subtitle-color': { label: VARIABLE_LABELS['account-login-subtitle-color'], fallback: '#6b7280', category: 'account-login' },
    'account-login-input-bg': { label: VARIABLE_LABELS['account-login-input-bg'], fallback: '#ffffff', category: 'account-login' },
    'account-login-input-border': { label: VARIABLE_LABELS['account-login-input-border'], fallback: '#d1d5db', category: 'account-login' },
    'account-login-input-text': { label: VARIABLE_LABELS['account-login-input-text'], fallback: '#111827', category: 'account-login' },
    'account-login-input-focus-ring': { label: VARIABLE_LABELS['account-login-input-focus-ring'], fallback: '#2563eb', category: 'account-login' },
    'account-login-input-radius': { label: VARIABLE_LABELS['account-login-input-radius'], fallback: '0.375rem', category: 'account-login' },
    'account-login-primary-btn-bg': { label: VARIABLE_LABELS['account-login-primary-btn-bg'], fallback: '#2563eb', category: 'account-login' },
    'account-login-primary-btn-text': { label: VARIABLE_LABELS['account-login-primary-btn-text'], fallback: '#ffffff', category: 'account-login' },
    'account-login-primary-btn-hover': { label: VARIABLE_LABELS['account-login-primary-btn-hover'], fallback: '#1d4ed8', category: 'account-login' },
    'account-login-success-btn-bg': { label: VARIABLE_LABELS['account-login-success-btn-bg'], fallback: '#16a34a', category: 'account-login' },
    'account-login-success-btn-text': { label: VARIABLE_LABELS['account-login-success-btn-text'], fallback: '#ffffff', category: 'account-login' },
    'account-login-success-btn-hover': { label: VARIABLE_LABELS['account-login-success-btn-hover'], fallback: '#15803d', category: 'account-login' },
    'account-login-error-color': { label: VARIABLE_LABELS['account-login-error-color'], fallback: '#ef4444', category: 'account-login' },
    'account-login-link-color': { label: VARIABLE_LABELS['account-login-link-color'], fallback: '#2563eb', category: 'account-login' },
    'account-login-link-hover': { label: VARIABLE_LABELS['account-login-link-hover'], fallback: '#1d4ed8', category: 'account-login' },
    'account-login-terms-color': { label: VARIABLE_LABELS['account-login-terms-color'], fallback: '#9ca3af', category: 'account-login' },

    // ---- 账户布局 ----
    'account-sidebar-bg': { label: VARIABLE_LABELS['account-sidebar-bg'], fallback: '#ffffff', category: 'account-sidebar' },
    'account-sidebar-border': { label: VARIABLE_LABELS['account-sidebar-border'], fallback: '#e5e7eb', category: 'account-sidebar' },
    'account-sidebar-title-color': { label: VARIABLE_LABELS['account-sidebar-title-color'], fallback: '#374151', category: 'account-sidebar' },
    'account-menu-text': { label: VARIABLE_LABELS['account-menu-text'], fallback: '#4b5563', category: 'account-sidebar' },
    'account-menu-hover-bg': { label: VARIABLE_LABELS['account-menu-hover-bg'], fallback: '#f3f4f6', category: 'account-sidebar' },
    'account-menu-active-bg': { label: VARIABLE_LABELS['account-menu-active-bg'], fallback: '#eff6ff', category: 'account-sidebar' },
    'account-menu-active-text': { label: VARIABLE_LABELS['account-menu-active-text'], fallback: '#1d4ed8', category: 'account-sidebar' },
    'account-logout-color': { label: VARIABLE_LABELS['account-logout-color'], fallback: '#dc2626', category: 'account-sidebar' },
    'account-logout-hover-bg': { label: VARIABLE_LABELS['account-logout-hover-bg'], fallback: '#fef2f2', category: 'account-sidebar' },
    'account-content-bg': { label: VARIABLE_LABELS['account-content-bg'], fallback: '#ffffff', category: 'account-content' },
    'account-content-text': { label: VARIABLE_LABELS['account-content-text'], fallback: '#111827', category: 'account-content' },

    // ---- 账户主页 ----
    'account-card-bg': { label: VARIABLE_LABELS['account-card-bg'], fallback: '#ffffff', category: 'account-card' },
    'account-card-shadow': { label: VARIABLE_LABELS['account-card-shadow'], fallback: '0 1px 3px 0 rgb(0 0 0 / 0.1)', category: 'account-card' },
    'account-card-radius': { label: VARIABLE_LABELS['account-card-radius'], fallback: '0.5rem', category: 'account-card' },
    'account-label-color': { label: VARIABLE_LABELS['account-label-color'], fallback: '#6b7280', category: 'account-card' },
    'account-value-color': { label: VARIABLE_LABELS['account-value-color'], fallback: '#111827', category: 'account-card' },
    'account-link-color': { label: VARIABLE_LABELS['account-link-color'], fallback: '#2563eb', category: 'account-card' },
    'account-link-hover': { label: VARIABLE_LABELS['account-link-hover'], fallback: '#1d4ed8', category: 'account-card' },
    'account-address-card-bg': { label: VARIABLE_LABELS['account-address-card-bg'], fallback: '#ffffff', category: 'account-card' },
    'account-address-card-shadow': { label: VARIABLE_LABELS['account-address-card-shadow'], fallback: '0 1px 3px 0 rgb(0 0 0 / 0.1)', category: 'account-card' },
    'account-address-border': { label: VARIABLE_LABELS['account-address-border'], fallback: '#e5e7eb', category: 'account-card' },
    'account-address-radius': { label: VARIABLE_LABELS['account-address-radius'], fallback: '0.5rem', category: 'account-card' },
    'account-default-badge-bg': { label: VARIABLE_LABELS['account-default-badge-bg'], fallback: '#dcfce7', category: 'account-card' },
    'account-default-badge-text': { label: VARIABLE_LABELS['account-default-badge-text'], fallback: '#166534', category: 'account-card' },
    'account-primary-btn-bg': { label: VARIABLE_LABELS['account-primary-btn-bg'], fallback: '#2563eb', category: 'account-card' },
    'account-primary-btn-text': { label: VARIABLE_LABELS['account-primary-btn-text'], fallback: '#ffffff', category: 'account-card' },
    'account-primary-btn-hover': { label: VARIABLE_LABELS['account-primary-btn-hover'], fallback: '#1d4ed8', category: 'account-card' },
    'account-action-icon-color': { label: VARIABLE_LABELS['account-action-icon-color'], fallback: '#6b7280', category: 'account-card' },
    'account-danger-color': { label: VARIABLE_LABELS['account-danger-color'], fallback: '#dc2626', category: 'account-card' },
    'account-empty-text': { label: VARIABLE_LABELS['account-empty-text'], fallback: '#6b7280', category: 'account-card' },
    'account-divider': { label: VARIABLE_LABELS['account-divider'], fallback: '#e5e7eb', category: 'account-card' },
    'account-toggle-active-bg': { label: VARIABLE_LABELS['account-toggle-active-bg'], fallback: '#2563eb', category: 'account-card' },
    'account-toggle-inactive-bg': { label: VARIABLE_LABELS['account-toggle-inactive-bg'], fallback: '#d1d5db', category: 'account-card' },
    'account-toggle-thumb-color': { label: VARIABLE_LABELS['account-toggle-thumb-color'], fallback: '#ffffff', category: 'account-card' },
    'account-marketing-text': { label: VARIABLE_LABELS['account-marketing-text'], fallback: '#111827', category: 'account-card' },
    'account-marketing-desc': { label: VARIABLE_LABELS['account-marketing-desc'], fallback: '#6b7280', category: 'account-card' },

    // ---- 个人资料页 ----
    'account-profile-title-color': { label: VARIABLE_LABELS['account-profile-title-color'], fallback: '#111827', category: 'account-profile' },
    'account-profile-form-bg': { label: VARIABLE_LABELS['account-profile-form-bg'], fallback: '#ffffff', category: 'account-profile' },
    'account-profile-form-shadow': { label: VARIABLE_LABELS['account-profile-form-shadow'], fallback: '0 1px 3px 0 rgb(0 0 0 / 0.1)', category: 'account-profile' },
    'account-profile-form-radius': { label: VARIABLE_LABELS['account-profile-form-radius'], fallback: '0.5rem', category: 'account-profile' },
    'account-profile-input-border': { label: VARIABLE_LABELS['account-profile-input-border'], fallback: '#d1d5db', category: 'account-profile' },
    'account-profile-input-bg': { label: VARIABLE_LABELS['account-profile-input-bg'], fallback: '#ffffff', category: 'account-profile' },
    'account-profile-input-text': { label: VARIABLE_LABELS['account-profile-input-text'], fallback: '#111827', category: 'account-profile' },
    'account-profile-input-radius': { label: VARIABLE_LABELS['account-profile-input-radius'], fallback: '0.25rem', category: 'account-profile' },
    'account-profile-email-bg': { label: VARIABLE_LABELS['account-profile-email-bg'], fallback: '#f3f4f6', category: 'account-profile' },
    'account-profile-email-text': { label: VARIABLE_LABELS['account-profile-email-text'], fallback: '#374151', category: 'account-profile' },
    'account-profile-email-note': { label: VARIABLE_LABELS['account-profile-email-note'], fallback: '#6b7280', category: 'account-profile' },
    'account-profile-cancel-border': { label: VARIABLE_LABELS['account-profile-cancel-border'], fallback: '#d1d5db', category: 'account-profile' },
    'account-profile-cancel-hover': { label: VARIABLE_LABELS['account-profile-cancel-hover'], fallback: '#f9fafb', category: 'account-profile' },
    'account-profile-save-bg': { label: VARIABLE_LABELS['account-profile-save-bg'], fallback: '#2563eb', category: 'account-profile' },
    'account-profile-save-text': { label: VARIABLE_LABELS['account-profile-save-text'], fallback: '#ffffff', category: 'account-profile' },
    'account-profile-save-hover': { label: VARIABLE_LABELS['account-profile-save-hover'], fallback: '#1d4ed8', category: 'account-profile' },

    // ---- 询盘列表 ----
    'account-inquiry-title-color': { label: VARIABLE_LABELS['account-inquiry-title-color'], fallback: '#1f2937', category: 'account-inquiry' },
    'account-inquiry-list-bg': { label: VARIABLE_LABELS['account-inquiry-list-bg'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-list-border': { label: VARIABLE_LABELS['account-inquiry-list-border'], fallback: '#f3f4f6', category: 'account-inquiry' },
    'account-inquiry-list-radius': { label: VARIABLE_LABELS['account-inquiry-list-radius'], fallback: '0.75rem', category: 'account-inquiry' },
    'account-inquiry-item-bg': { label: VARIABLE_LABELS['account-inquiry-item-bg'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-item-hover': { label: VARIABLE_LABELS['account-inquiry-item-hover'], fallback: '#f9fafb', category: 'account-inquiry' },
    'account-inquiry-item-active-bg': { label: VARIABLE_LABELS['account-inquiry-item-active-bg'], fallback: '#eff6ff', category: 'account-inquiry' },
    'account-inquiry-item-active-border': { label: VARIABLE_LABELS['account-inquiry-item-active-border'], fallback: '#3b82f6', category: 'account-inquiry' },
    'account-inquiry-item-text': { label: VARIABLE_LABELS['account-inquiry-item-text'], fallback: '#374151', category: 'account-inquiry' },
    'account-inquiry-item-meta': { label: VARIABLE_LABELS['account-inquiry-item-meta'], fallback: '#9ca3af', category: 'account-inquiry' },
    'account-inquiry-detail-bg': { label: VARIABLE_LABELS['account-inquiry-detail-bg'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-detail-border': { label: VARIABLE_LABELS['account-inquiry-detail-border'], fallback: '#f3f4f6', category: 'account-inquiry' },
    'account-inquiry-detail-radius': { label: VARIABLE_LABELS['account-inquiry-detail-radius'], fallback: '0.75rem', category: 'account-inquiry' },
    'account-inquiry-header-bg': { label: VARIABLE_LABELS['account-inquiry-header-bg'], fallback: '#f9fafb', category: 'account-inquiry' },
    'account-inquiry-header-text': { label: VARIABLE_LABELS['account-inquiry-header-text'], fallback: '#1f2937', category: 'account-inquiry' },
    'account-inquiry-info-bg': { label: VARIABLE_LABELS['account-inquiry-info-bg'], fallback: '#f9fafb', category: 'account-inquiry' },
    'account-inquiry-info-text': { label: VARIABLE_LABELS['account-inquiry-info-text'], fallback: '#6b7280', category: 'account-inquiry' },
    'account-inquiry-reply-user-bg': { label: VARIABLE_LABELS['account-inquiry-reply-user-bg'], fallback: '#eff6ff', category: 'account-inquiry' },
    'account-inquiry-reply-user-text': { label: VARIABLE_LABELS['account-inquiry-reply-user-text'], fallback: '#1f2937', category: 'account-inquiry' },
    'account-inquiry-reply-admin-bg': { label: VARIABLE_LABELS['account-inquiry-reply-admin-bg'], fallback: '#f3f4f6', category: 'account-inquiry' },
    'account-inquiry-reply-admin-text': { label: VARIABLE_LABELS['account-inquiry-reply-admin-text'], fallback: '#1f2937', category: 'account-inquiry' },
    'account-inquiry-reply-system-bg': { label: VARIABLE_LABELS['account-inquiry-reply-system-bg'], fallback: '#e5e7eb', category: 'account-inquiry' },
    'account-inquiry-reply-system-text': { label: VARIABLE_LABELS['account-inquiry-reply-system-text'], fallback: '#374151', category: 'account-inquiry' },
    'account-inquiry-reply-input-bg': { label: VARIABLE_LABELS['account-inquiry-reply-input-bg'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-reply-input-border': { label: VARIABLE_LABELS['account-inquiry-reply-input-border'], fallback: '#d1d5db', category: 'account-inquiry' },
    'account-inquiry-reply-input-radius': { label: VARIABLE_LABELS['account-inquiry-reply-input-radius'], fallback: '0.5rem', category: 'account-inquiry' },
    'account-inquiry-send-btn-bg': { label: VARIABLE_LABELS['account-inquiry-send-btn-bg'], fallback: '#2563eb', category: 'account-inquiry' },
    'account-inquiry-send-btn-text': { label: VARIABLE_LABELS['account-inquiry-send-btn-text'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-send-btn-hover': { label: VARIABLE_LABELS['account-inquiry-send-btn-hover'], fallback: '#1d4ed8', category: 'account-inquiry' },
    'account-inquiry-create-btn-bg': { label: VARIABLE_LABELS['account-inquiry-create-btn-bg'], fallback: '#2563eb', category: 'account-inquiry' },
    'account-inquiry-create-btn-text': { label: VARIABLE_LABELS['account-inquiry-create-btn-text'], fallback: '#ffffff', category: 'account-inquiry' },
    'account-inquiry-create-btn-hover': { label: VARIABLE_LABELS['account-inquiry-create-btn-hover'], fallback: '#1d4ed8', category: 'account-inquiry' },
    'account-inquiry-empty-icon': { label: VARIABLE_LABELS['account-inquiry-empty-icon'], fallback: '#d1d5db', category: 'account-inquiry' },
    'account-inquiry-empty-text': { label: VARIABLE_LABELS['account-inquiry-empty-text'], fallback: '#9ca3af', category: 'account-inquiry' },
    'account-inquiry-status-pending': { label: VARIABLE_LABELS['account-inquiry-status-pending'], fallback: '#dc2626', category: 'account-inquiry' },
    'account-inquiry-status-pending-bg': { label: VARIABLE_LABELS['account-inquiry-status-pending-bg'], fallback: '#fee2e2', category: 'account-inquiry' },
    'account-inquiry-status-processing': { label: VARIABLE_LABELS['account-inquiry-status-processing'], fallback: '#ca8a04', category: 'account-inquiry' },
    'account-inquiry-status-processing-bg': { label: VARIABLE_LABELS['account-inquiry-status-processing-bg'], fallback: '#fef9c3', category: 'account-inquiry' },
    'account-inquiry-status-replied': { label: VARIABLE_LABELS['account-inquiry-status-replied'], fallback: '#16a34a', category: 'account-inquiry' },
    'account-inquiry-status-replied-bg': { label: VARIABLE_LABELS['account-inquiry-status-replied-bg'], fallback: '#dcfce7', category: 'account-inquiry' },
    'account-inquiry-status-closed': { label: VARIABLE_LABELS['account-inquiry-status-closed'], fallback: '#6b7280', category: 'account-inquiry' },
    'account-inquiry-status-closed-bg': { label: VARIABLE_LABELS['account-inquiry-status-closed-bg'], fallback: '#f3f4f6', category: 'account-inquiry' },
    'account-inquiry-link-color': { label: VARIABLE_LABELS['account-inquiry-link-color'], fallback: '#2563eb', category: 'account-inquiry' },

    // ---- 地址管理 ----
    'account-address-page-bg': { label: VARIABLE_LABELS['account-address-page-bg'], fallback: '#ffffff', category: 'account-address' },
    'account-address-page-text': { label: VARIABLE_LABELS['account-address-page-text'], fallback: '#111827', category: 'account-address' },
    'account-address-form-bg': { label: VARIABLE_LABELS['account-address-form-bg'], fallback: '#ffffff', category: 'account-address' },
    'account-address-form-shadow': { label: VARIABLE_LABELS['account-address-form-shadow'], fallback: '0 1px 3px 0 rgb(0 0 0 / 0.1)', category: 'account-address' },
    'account-address-form-radius': { label: VARIABLE_LABELS['account-address-form-radius'], fallback: '0.5rem', category: 'account-address' },
    'account-address-form-title': { label: VARIABLE_LABELS['account-address-form-title'], fallback: '#111827', category: 'account-address' },
    'account-address-form-label': { label: VARIABLE_LABELS['account-address-form-label'], fallback: '#374151', category: 'account-address' },
    'account-address-form-input-border': { label: VARIABLE_LABELS['account-address-form-input-border'], fallback: '#d1d5db', category: 'account-address' },
    'account-address-form-input-bg': { label: VARIABLE_LABELS['account-address-form-input-bg'], fallback: '#ffffff', category: 'account-address' },
    'account-address-form-input-text': { label: VARIABLE_LABELS['account-address-form-input-text'], fallback: '#111827', category: 'account-address' },
    'account-address-form-phone-prefix-bg': { label: VARIABLE_LABELS['account-address-form-phone-prefix-bg'], fallback: '#f9fafb', category: 'account-address' },
    'account-address-form-phone-prefix-text': { label: VARIABLE_LABELS['account-address-form-phone-prefix-text'], fallback: '#374151', category: 'account-address' },
    'account-address-form-cancel-border': { label: VARIABLE_LABELS['account-address-form-cancel-border'], fallback: '#d1d5db', category: 'account-address' },
    'account-address-form-cancel-hover': { label: VARIABLE_LABELS['account-address-form-cancel-hover'], fallback: '#f9fafb', category: 'account-address' },
    'account-address-form-save-bg': { label: VARIABLE_LABELS['account-address-form-save-bg'], fallback: '#2563eb', category: 'account-address' },
    'account-address-form-save-text': { label: VARIABLE_LABELS['account-address-form-save-text'], fallback: '#ffffff', category: 'account-address' },
    'account-address-form-save-hover': { label: VARIABLE_LABELS['account-address-form-save-hover'], fallback: '#1d4ed8', category: 'account-address' },
  },
};

/**
 * 页面分组标签映射（用于 UI 显示分组标题）
 */
export const PAGE_GROUP_LABELS: Record<string, string> = {
  // ---- 通用分组 ----
  brand: '品牌颜色',
  background: '页面背景',
  navbar: '导航栏',
  footer: '页脚',
  announcement: '公告栏',

  // ---- 产品页面分组 ----
  'product-card': '商品卡片',
  'category-tree': '分类树侧边栏',
  'product-line-header': '产品线标题区域',
  pagination: '分页组件',
  filter: '筛选栏',
  'empty-state': '空状态',

  // ---- 工业产品线分组 ----
  'industrial-header': '工业产品标题区域',
  'industrial-table': '工业产品表格',
  'industrial-pagination': '工业产品分页',
  'industrial-hover-image': '工业产品悬浮图片',

  // ---- 产品集合分组 ----
  'product-collections': '产品集合',
  'product-collections-filter': '集合筛选栏',
  'product-collections-pagination': '集合分页',

  // ---- 产品详情分组 ----
  'product-details': '产品详情页',
  'product-details-media': '详情媒体区域',
  'product-details-variant': '详情变体卡片',
  'product-details-params': '详情参数表格',
  'product-details-buttons': '详情按钮',
  'product-details-modal': '详情弹窗',

  // ---- 博客分组 ----
  'blog-container': '博客列表',
  'blog-post': '博客文章卡片',
  'blog-sidebar': '博客侧边栏',
  'blog-pagination': '博客分页',
  'blog-image': '博客图片',
  'blog-detail': '博客详情页',

  // ---- 文档分组 ----
  'doc-library': '文档库',
  'doc-detail': '文档详情页',
  'doc-sidebar': '文档侧边栏',

  // ---- 视频分组 ----
  'video-category': '视频列表',
  'video-category-buttons': '视频分类按钮',
  'video-card': '视频卡片',
  'video-pagination': '视频分页',
  'video-detail': '视频详情页',

  // ---- 询盘分组 ----
  inquiry: '询盘表单',

  // ---- 普通页面分组 ----
  page: '页面内容',

  // ---- 搜索分组 ----
  'search': '搜索页面',
  'search-input': '搜索输入框',
  'search-result': '搜索结果',
  'search-empty': '空状态',
  'search-types': '结果类型标签',

  // ---- 用户中心分组 ----
  'account-login': '登录页',
  'account-sidebar': '侧边栏',
  'account-content': '内容区域',
  'account-card': '卡片样式',
  'account-profile': '个人资料',
  'account-inquiry': '询盘列表',
  'account-address': '地址管理',
};

/**
 * 获取页面类型的变量配置（所有变量）
 */
export function getPageVariables(pageType: string): Record<string, PageVariableDefinition> {
  return PAGE_VARIABLES[pageType] || {};
}

/**
 * 获取页面变量的配置（单个变量）
 */
export function getPageVariableConfig(pageType: string, key: string): PageVariableDefinition | null {
  const config = PAGE_VARIABLES[pageType];
  if (!config) return null;
  return config[key] || null;
}

/**
 * 获取页面变量的分组信息
 * @returns { categoryId: [variableKey, variableKey, ...] }
 */
export function getPageVariableGroups(pageType: string): Record<string, string[]> {
  const config = PAGE_VARIABLES[pageType] || {};
  const groups: Record<string, string[]> = {};
  for (const [key, def] of Object.entries(config)) {
    const cat = def.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(key);
  }
  return groups;
}

/**
 * ============================================================
 * 页面分组 ID → 全局分组 ID 的映射
 * 用于在页面编辑器中显示「继承全局值：{全局分组名称}」
 * 如果映射的全局分组不存在，则回退为不显示"继承"提示
 * ============================================================
 */
export const PAGE_GROUP_TO_GLOBAL_GROUP: Record<string, string> = {
  // ---- 通用分组 ----
  brand: 'brand',
  background: 'background',
  footer: 'footer',

  // ---- 页头（导航栏 + 公告栏均映射到 header） ----
  navbar: 'header',
  announcement: 'header',

  // ---- 产品模块 ----
  'product-card': 'product-card',
  'category-tree': 'category-tree',
  'product-line-header': 'product-line-header',
  pagination: 'pagination',
  filter: 'filter',
  'empty-state': 'empty-state',

  // ---- 工业产品线 ----
  'industrial-header': 'industrial-header',
  'industrial-table': 'industrial-table',
  'industrial-pagination': 'industrial-pagination',
  'industrial-hover-image': 'industrial-hover-image',

  // ---- 产品集合 ----
  'product-collections': 'product-collections',
  'product-collections-filter': 'product-collections-filter',
  'product-collections-pagination': 'product-collections-pagination',

  // ---- 产品详情 ----
  'product-details': 'product-details',
  'product-details-media': 'product-details-media',
  'product-details-variant': 'product-details-variant',
  'product-details-params': 'product-details-params',
  'product-details-buttons': 'product-details-buttons',
  'product-details-modal': 'product-details-modal',

  // ---- 博客 ----
  'blog-container': 'blog-container',
  'blog-post': 'blog-post',
  'blog-sidebar': 'blog-sidebar',
  'blog-pagination': 'blog-pagination',
  'blog-image': 'blog-image',
  'blog-detail': 'blog-detail',

  // ---- 文档 ----
  'doc-library': 'doc-library',
  'doc-sidebar': 'doc-sidebar',
  'doc-detail': 'doc-detail',

  // ---- 视频 ----
  'video-category': 'video-category',
  'video-category-buttons': 'video-category-buttons',
  'video-card': 'video-card',
  'video-pagination': 'video-pagination',
  'video-detail': 'video-detail',

  // ---- 询盘 ----
  inquiry: 'inquiry',

  // ---- 普通页面 ----
  page: 'page',

  // ---- 搜索 ----
  search: 'search',
  'search-input': 'search-input',
  'search-result': 'search-result',
  'search-empty': 'search-empty',
  'search-types': 'search-types',

  // ---- 用户中心 ----
  'account-login': 'account-login',
  'account-sidebar': 'account-sidebar',
  'account-content': 'account-content',
  'account-card': 'account-card',
  'account-profile': 'account-profile',
  'account-inquiry': 'account-inquiry',
  'account-address': 'account-address',
};

/**
 * 获取全局分组名称（用于「继承全局值：xxx」提示）
 * @param pageGroupId 页面分组 ID
 * @param globalGroups 全局分组列表（来自 COLOR_GROUPS）
 * @returns 全局分组名称，如果全局分组不存在则返回 null
 */
export function getGlobalGroupName(
  pageGroupId: string,
  globalGroups: { id: string; name: string }[]
): string | null {
  const globalGroupId = PAGE_GROUP_TO_GLOBAL_GROUP[pageGroupId] || pageGroupId;
  const globalGroup = globalGroups.find((g) => g.id === globalGroupId);
  return globalGroup?.name || null;
}