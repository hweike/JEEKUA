// app/admin/themes/customizer/config/variables.ts

/**
 * ============================================================
 * 变量定义（所有变量集中管理）
 * ============================================================
 */

/**
 * 全局变量列表（在全局主题编辑器中显示）
 */
export const GLOBAL_VARIABLES = {
  colors: [
    // ---- Shadcn 基础 ----
    'background',
    'foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
    'ring',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',

    // ---- 品牌扩展 ----
    'brand-primary',
    'brand-secondary',
    'brand-accent',
    'brand-neutral',

    // ---- 页面背景扩展 ----
    'page-bg',
    'page-bg-alt',

    // ---- 页头 & 页脚 ----
    'navbar-bg',
    'navbar-text',
    'navbar-hover-bg',
    'navbar-hover-text',
    'navbar-active-text',
    'navbar-divider-color',
    'announcement-bg',      // ✅ 全局公告栏背景色
    'announcement-text',    // ✅ 全局公告栏文字色
    'footer-bg',
    'footer-text',
    'footer-link',
    'footer-link-hover',
    'footer-divider-color',

    // ---- 组件扩展 ----
    'btn-primary-bg',
    'btn-primary-text',
    'btn-primary-hover',
    'btn-secondary-bg',
    'btn-secondary-text',
    'btn-secondary-hover',
    'input-border',
    'input-focus-ring',
    'label-color',
    'error-color',
    'card-shadow',
    'card-border-radius',
    'badge-sale-bg',
    'badge-sale-text',
    'badge-new-bg',
    'badge-new-text',
    'notification-success',
    'notification-error',
    'notification-warning',

    // ---- 布局 ----
    'header-bg',
    'header-text',

    // ============================================================
    // 业务模块：商品卡片
    // ============================================================
    'product-card-bg',
    'product-card-border',
    'product-card-title-color',
    'product-card-title-hover',
    'product-card-placeholder-bg',
    'product-image-aspect-ratio',
    'product-price-color',
    'product-description-font-size',

    // ============================================================
    // 业务模块：分类树侧边栏
    // ============================================================
    'category-tree-text',
    'category-tree-hover-text',
    'category-tree-hover-bg',
    'category-tree-active-text',
    'category-tree-active-bg',
    'category-tree-border',

    // ============================================================
    // 业务模块：产品线列表 (ProductLineBlock)
    // ============================================================
    'product-line-header-bg',
    'product-line-header-text',
    'product-line-description-text',
    'pagination-bg',
    'pagination-text',
    'pagination-active-bg',
    'pagination-active-text',
    'pagination-hover-bg',
    'pagination-border',

    // ============================================================
    // 业务模块：工业产品线表格 (IndustrialProductLineBlock)
    // ============================================================
    'industrial-header-bg',
    'industrial-header-text',
    'industrial-description-text',
    'industrial-table-bg',
    'industrial-table-header-bg',
    'industrial-table-border',
    'industrial-table-row-hover-bg',
    'industrial-table-child-row-bg',
    'industrial-table-text',
    'industrial-table-muted-text',
    'industrial-table-link-color',
    'industrial-pagination-bg',
    'industrial-pagination-text',
    'industrial-pagination-active-bg',
    'industrial-pagination-active-text',
    'industrial-pagination-hover-bg',
    'industrial-pagination-border',
    'industrial-hover-image-bg',
    'industrial-hover-image-border',

    // ============================================================
    // 业务模块：产品集合 (ProductCollectionsBlock)
    // ============================================================
    'product-collections-bg',
    'product-collections-text',
    'product-collections-title-color',
    'product-collections-description-text',
    'product-collections-filter-bg',
    'product-collections-filter-text',
    'product-collections-filter-border',
    'product-collections-filter-muted-text',
    'product-collections-filter-input-bg',
    'product-collections-filter-input-text',
    'product-collections-pagination-bg',
    'product-collections-pagination-text',
    'product-collections-pagination-hover-bg',
    'product-collections-pagination-border',

    // ============================================================
    // 业务模块：产品详情页 (ProductDetailsBlock)
    // ============================================================
    'product-details-bg',
    'product-details-text',
    'product-details-media-border',
    'product-details-media-bg',
    'product-details-thumbnail-border',
    'product-details-thumbnail-active-border',
    'product-details-title-color',
    'product-details-brand-color',
    'product-details-price-color',
    'product-details-price-range-color',
    'product-details-variant-border',
    'product-details-variant-bg',
    'product-details-variant-text',
    'product-details-params-border',
    'product-details-params-label-color',
    'product-details-params-value-color',
    'product-details-description-text',
    'product-details-spec-text',
    'product-details-stock-text',
    'product-details-inquiry-bg',
    'product-details-inquiry-text',
    'product-details-inquiry-hover-bg',
    'product-details-chat-bg',
    'product-details-chat-text',
    'product-details-chat-hover-bg',
    'product-details-store-border',
    'product-details-store-text',
    'product-details-store-hover-bg',
    'product-details-modal-overlay',
    'product-details-modal-bg',
    'product-details-modal-close-color',

    // ============================================================
    // 业务模块：博客 (BlogBlock / BlogCollectionBlock)
    // ============================================================
    'blog-container-bg',
    'blog-container-text',
    'blog-title-color',
    'blog-card-border',
    'blog-post-title-color',
    'blog-post-title-hover',
    'blog-post-meta-color',
    'blog-post-excerpt-color',
    'blog-sidebar-bg',
    'blog-sidebar-text',
    'blog-sidebar-active-bg',
    'blog-sidebar-active-text',
    'blog-sidebar-hover-bg',
    'blog-sidebar-hover-text',
    'blog-pagination-bg',
    'blog-pagination-text',
    'blog-pagination-border',
    'blog-pagination-hover-bg',
    'blog-pagination-disabled-opacity',

    // ============================================================
    // 业务模块：博客详情页 (BlogDetail)
    // ============================================================
    'blog-detail-bg',
    'blog-detail-text',
    'blog-detail-title-color',
    'blog-detail-meta-color',
    'blog-detail-heading-color',
    'blog-detail-content-color',
    'blog-detail-link-color',
    'blog-detail-tag-bg',
    'blog-detail-tag-text',

    // ============================================================
    // 业务模块：文档库 (DocumentLibrary)
    // ============================================================
    'doc-library-bg',
    'doc-library-text',
    'doc-library-title-color',
    'doc-library-heading-color',
    'doc-library-content-color',
    'doc-library-link-color',
    'doc-library-divider',
    'doc-library-loading-color',

    // ============================================================
    // 业务模块：文档树 (DocsTree)
    // ============================================================
    'doc-sidebar-bg',
    'doc-sidebar-text',
    'doc-sidebar-hover-bg',
    'doc-sidebar-hover-text',
    'doc-sidebar-active-bg',
    'doc-sidebar-active-text',
    'doc-sidebar-active-border',
    'doc-sidebar-border',
    'doc-sidebar-group-label-color',
    'doc-sidebar-badge-bg',
    'doc-sidebar-badge-text',

    // ============================================================
    // 业务模块：文档详情页 (DocDetail)
    // ============================================================
    'doc-detail-bg',
    'doc-detail-text',
    'doc-detail-title-color',
    'doc-detail-heading-color',
    'doc-detail-content-color',
    'doc-detail-link-color',
    'doc-detail-loading-color',
    'doc-detail-divider-color',

    // ============================================================
    // 业务模块：视频分类列表 (VideoCategoryBlock)
    // ============================================================
    'video-category-bg',
    'video-category-text',
    'video-category-title-color',
    'video-category-btn-bg',
    'video-category-btn-text',
    'video-category-btn-hover-bg',
    'video-category-btn-hover-text',
    'video-category-btn-active-bg',
    'video-category-btn-active-text',
    'video-card-border',
    'video-title-color',
    'video-title-hover',
    'video-meta-color',
    'video-placeholder-bg',
    'video-placeholder-text',
    'video-play-btn-bg',
    'video-play-btn-color',
    'video-pagination-bg',
    'video-pagination-text',
    'video-pagination-border',
    'video-pagination-hover-bg',
    'video-pagination-disabled-opacity',
    'video-loading-color',

    // ============================================================
    // 业务模块：视频详情页 (VideoDetail)
    // ============================================================
    'video-detail-bg',
    'video-detail-text',
    'video-detail-title-color',
    'video-detail-meta-color',
    'video-detail-divider',
    'video-detail-tag-bg',
    'video-detail-tag-text',
    'video-detail-heading-color',
    'video-detail-content-color',
    'video-detail-link-color',

    // ============================================================
    // 业务模块：询盘表单 (InquiryBlock)
    // ============================================================
    'inquiry-bg',
    'inquiry-text',
    'inquiry-padding-top',
    'inquiry-padding-bottom',

    // ============================================================
    // 业务模块：普通页面 (Custom Page)
    // ============================================================
    'page-text',
    'page-heading-color',
    'page-content-color',
    'page-link-color',

    // ============================================================
    // 业务模块：搜索页面 (Search)
    // ============================================================
    'search-bg',
    'search-text',
    'search-title-color',
    'search-subtitle-color',
    'search-description-color',
    'search-input-bg',
    'search-input-border',
    'search-input-text',
    'search-input-focus-ring',
    'search-result-bg',
    'search-result-border',
    'search-result-text',
    'search-result-hover-bg',
    'search-result-title',
    'search-result-title-hover',
    'search-result-meta',
    'search-result-excerpt',
    'search-count-color',
    'search-empty-text',
    'search-empty-hint',
    'search-divider',
    'search-type-product',
    'search-type-document',
    'search-type-blog',

    // ============================================================
    // 业务模块：用户中心 (Account)
    // ============================================================
    // ---- 登录页 ----
    'account-login-bg',
    'account-login-card-bg',
    'account-login-card-shadow',
    'account-login-card-radius',
    'account-login-title-color',
    'account-login-subtitle-color',
    'account-login-input-bg',
    'account-login-input-border',
    'account-login-input-text',
    'account-login-input-focus-ring',
    'account-login-input-radius',
    'account-login-primary-btn-bg',
    'account-login-primary-btn-text',
    'account-login-primary-btn-hover',
    'account-login-success-btn-bg',
    'account-login-success-btn-text',
    'account-login-success-btn-hover',
    'account-login-error-color',
    'account-login-link-color',
    'account-login-link-hover',
    'account-login-terms-color',

    // ---- 账户布局 ----
    'account-sidebar-bg',
    'account-sidebar-border',
    'account-sidebar-title-color',
    'account-menu-text',
    'account-menu-hover-bg',
    'account-menu-active-bg',
    'account-menu-active-text',
    'account-logout-color',
    'account-logout-hover-bg',
    'account-content-bg',
    'account-content-text',

    // ---- 账户主页 ----
    'account-card-bg',
    'account-card-shadow',
    'account-card-radius',
    'account-label-color',
    'account-value-color',
    'account-link-color',
    'account-link-hover',
    'account-address-card-bg',
    'account-address-card-shadow',
    'account-address-border',
    'account-address-radius',
    'account-default-badge-bg',
    'account-default-badge-text',
    'account-primary-btn-bg',
    'account-primary-btn-text',
    'account-primary-btn-hover',
    'account-action-icon-color',
    'account-danger-color',
    'account-empty-text',
    'account-divider',
    'account-toggle-active-bg',
    'account-toggle-inactive-bg',
    'account-toggle-thumb-color',
    'account-marketing-text',
    'account-marketing-desc',

    // ---- 个人资料页 ----
    'account-profile-title-color',
    'account-profile-form-bg',
    'account-profile-form-shadow',
    'account-profile-form-radius',
    'account-profile-input-border',
    'account-profile-input-bg',
    'account-profile-input-text',
    'account-profile-input-radius',
    'account-profile-email-bg',
    'account-profile-email-text',
    'account-profile-email-note',
    'account-profile-cancel-border',
    'account-profile-cancel-hover',
    'account-profile-save-bg',
    'account-profile-save-text',
    'account-profile-save-hover',

    // ---- 询盘列表 ----
    'account-inquiry-title-color',
    'account-inquiry-list-bg',
    'account-inquiry-list-border',
    'account-inquiry-list-radius',
    'account-inquiry-item-bg',
    'account-inquiry-item-hover',
    'account-inquiry-item-active-bg',
    'account-inquiry-item-active-border',
    'account-inquiry-item-text',
    'account-inquiry-item-meta',
    'account-inquiry-detail-bg',
    'account-inquiry-detail-border',
    'account-inquiry-detail-radius',
    'account-inquiry-header-bg',
    'account-inquiry-header-text',
    'account-inquiry-info-bg',
    'account-inquiry-info-text',
    'account-inquiry-reply-user-bg',
    'account-inquiry-reply-user-text',
    'account-inquiry-reply-admin-bg',
    'account-inquiry-reply-admin-text',
    'account-inquiry-reply-system-bg',
    'account-inquiry-reply-system-text',
    'account-inquiry-reply-input-bg',
    'account-inquiry-reply-input-border',
    'account-inquiry-reply-input-radius',
    'account-inquiry-send-btn-bg',
    'account-inquiry-send-btn-text',
    'account-inquiry-send-btn-hover',
    'account-inquiry-create-btn-bg',
    'account-inquiry-create-btn-text',
    'account-inquiry-create-btn-hover',
    'account-inquiry-empty-icon',
    'account-inquiry-empty-text',
    'account-inquiry-status-pending',
    'account-inquiry-status-pending-bg',
    'account-inquiry-status-processing',
    'account-inquiry-status-processing-bg',
    'account-inquiry-status-replied',
    'account-inquiry-status-replied-bg',
    'account-inquiry-status-closed',
    'account-inquiry-status-closed-bg',
    'account-inquiry-link-color',

    // ---- 地址管理 ----
    'account-address-page-bg',
    'account-address-page-text',
    'account-address-form-bg',
    'account-address-form-shadow',
    'account-address-form-radius',
    'account-address-form-title',
    'account-address-form-label',
    'account-address-form-input-border',
    'account-address-form-input-bg',
    'account-address-form-input-text',
    'account-address-form-phone-prefix-bg',
    'account-address-form-phone-prefix-text',
    'account-address-form-cancel-border',
    'account-address-form-cancel-hover',
    'account-address-form-save-bg',
    'account-address-form-save-text',
    'account-address-form-save-hover',

    // ---- 现有其他模块 ----
    'cart-item-border',
    'cart-total-bg',
    'checkout-btn-bg',
    'account-order-status-color',

    // ---- 图表 ----
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',

    // ---- 侧边栏 ----
    'sidebar',
    'sidebar-foreground',
    'sidebar-primary',
    'sidebar-primary-foreground',
    'sidebar-accent',
    'sidebar-accent-foreground',
    'sidebar-border',
    'sidebar-ring',

    // ---- 页面专用（旧版文档变量，如不再使用可删除） ----
    'docs-sidebar-bg',
    'docs-sidebar-text',
    'docs-table-bg',
    'docs-code-bg',
    'video-player-bg',
    'video-title',
    'video-controls-bg',
    'video-controls-color',
    'inquiry-form-bg',
    'inquiry-input-border',
    'inquiry-input-focus',
    'inquiry-submit-bg',
    'inquiry-submit-text',
    'account-avatar-bg',
    'account-username',
  ],

  typography: [
    // ✅ 统一 font-* 命名
    'font-sans',
    'font-heading',        // ✅ 新增：标题字体
    'font-serif',
    'font-mono',
    'font-size-base',
    'font-size-sm',
    'font-size-lg',
    'font-size-xl',
    'font-size-2xl',
    'font-size-3xl',
    'font-size-4xl',
    'font-size-xs',
    'font-weight-normal',
    'font-weight-medium',
    'font-weight-semibold',
    'font-weight-bold',
    'line-height-tight',
    'line-height-normal',
    'line-height-relaxed',
    'letter-spacing-tight',
    'letter-spacing-normal',
    'letter-spacing-wide',
    'text-color-body',
    'text-color-heading',
    'text-color-muted',
  ],

  spacing: [
    'spacing-unit',
    'spacing-1',
    'spacing-2',
    'spacing-3',
    'spacing-4',
    'spacing-5',
    'spacing-6',
    'spacing-8',
    'spacing-10',
    'spacing-12',
    'container-padding',
    'section-gap',
    'grid-gap',
    'product-card-padding',
  ],

  borderRadius: [
    'radius',
    'radius-sm',
    'radius-md',
    'radius-lg',
    'radius-xl',
    'radius-2xl',
    'radius-full',
    'product-card-radius',
    'blog-image-radius',
    'blog-detail-video-radius',
    'video-card-radius',
    'video-detail-player-radius',
    'btn-radius',
    'input-radius',
  ],

  shadows: [
    'shadow-xs',
    'shadow-sm',
    'shadow-md',
    'shadow-lg',
    'shadow-xl',
    'shadow-2xl',
    'product-card-shadow',
    'product-card-hover-shadow',
    'video-card-shadow',
    'video-card-hover-shadow',
    'dropdown-shadow',
    'btn-shadow',
  ],

  animation: [
    'transition-duration-75',
    'transition-duration-100',
    'transition-duration-150',
    'transition-duration-200',
    'transition-duration-300',
    'transition-duration-500',
    'transition-timing-ease',
    'transition-timing-linear',
    'transition-timing-in',
    'transition-timing-out',
  ],
};

export const USED_VARIABLES = GLOBAL_VARIABLES;

export const VARIABLE_LABELS: Record<string, string> = {
  // ---- Shadcn 基础 ----
  background: '页面背景色',
  foreground: '页面文字色',
  primary: '主色调',
  'primary-foreground': '主色调文字色',
  secondary: '次要色',
  'secondary-foreground': '次要色文字色',
  muted: '柔和背景色',
  'muted-foreground': '柔和文字色',
  accent: '强调色',
  'accent-foreground': '强调色文字色',
  destructive: '警示色',
  'destructive-foreground': '警示色文字色',
  border: '边框色',
  input: '输入框边框色',
  ring: '聚焦环颜色',
  card: '卡片背景色',
  'card-foreground': '卡片文字色',
  popover: '弹窗背景色',
  'popover-foreground': '弹窗文字色',

  // ---- 品牌扩展 ----
  'brand-primary': '品牌主色',
  'brand-secondary': '品牌辅助色',
  'brand-accent': '品牌强调色',
  'brand-neutral': '品牌中性色',

  // ---- 页面背景扩展 ----
  'page-bg': '页面背景色',
  'page-bg-alt': '页面背景色（交替）',

  // ---- 页头（导航栏 + 公告栏） ----
  'navbar-bg': '导航栏背景色',
  'navbar-text': '导航栏文字色',
  'navbar-hover-bg': '导航栏悬浮背景',
  'navbar-hover-text': '导航栏悬浮文字',
  'navbar-active-text': '导航栏激活文字色',
  'navbar-divider-color': '导航栏分割线色',
  'announcement-bg': '公告栏背景色',
  'announcement-text': '公告栏文字色',

  // ---- 页脚 ----
  'footer-bg': '页脚背景色',
  'footer-text': '页脚文字色',
  'footer-link': '页脚链接色',
  'footer-link-hover': '页脚链接悬浮色',
  'footer-divider-color': '页脚分割线色',

  // ---- 组件 ----
  'btn-primary-bg': '主按钮背景色',
  'btn-primary-text': '主按钮文字色',
  'btn-primary-hover': '主按钮悬浮色',
  'btn-secondary-bg': '次按钮背景色',
  'btn-secondary-text': '次按钮文字色',
  'btn-secondary-hover': '次按钮悬浮色',
  'input-border': '输入框边框色',
  'input-focus-ring': '输入框聚焦环色',
  'label-color': '标签文字色',
  'error-color': '错误提示色',
  'card-shadow': '卡片阴影',
  'card-border-radius': '卡片圆角',
  'badge-sale-bg': '促销标签背景色',
  'badge-sale-text': '促销标签文字色',
  'badge-new-bg': '新品标签背景色',
  'badge-new-text': '新品标签文字色',
  'notification-success': '成功通知背景色',
  'notification-error': '错误通知背景色',
  'notification-warning': '警告通知背景色',

  // ---- 布局 ----
  'header-bg': '页眉背景色',
  'header-text': '页眉文字色',

  // ---- 商品卡片 ----
  'product-card-bg': '商品卡片背景色',
  'product-card-border': '商品卡片边框色',
  'product-card-title-color': '商品卡片标题颜色',
  'product-card-title-hover': '商品卡片标题悬浮色',
  'product-card-placeholder-bg': '商品卡片占位背景',
  'product-image-aspect-ratio': '商品图片宽高比',
  'product-price-color': '商品价格颜色',
  'product-description-font-size': '商品描述字号',
  'product-card-radius': '商品卡片圆角',

  // ---- 分类树侧边栏 ----
  'category-tree-text': '分类树文字色',
  'category-tree-hover-text': '分类树悬停文字色',
  'category-tree-hover-bg': '分类树悬停背景色',
  'category-tree-active-text': '分类树激活文字色',
  'category-tree-active-bg': '分类树激活背景色',
  'category-tree-border': '分类树分割线色',

  // ---- 产品线列表 ----
  'product-line-header-bg': '产品线标题背景色',
  'product-line-header-text': '产品线标题文字色',
  'product-line-description-text': '产品线描述文字色',
  'pagination-bg': '分页背景色',
  'pagination-text': '分页文字色',
  'pagination-active-bg': '分页激活背景色',
  'pagination-active-text': '分页激活文字色',
  'pagination-hover-bg': '分页悬停背景色',
  'pagination-border': '分页边框色',

  // ---- 工业产品线表格 ----
  'industrial-header-bg': '工业产品标题背景色',
  'industrial-header-text': '工业产品标题文字色',
  'industrial-description-text': '工业产品描述文字色',
  'industrial-table-bg': '工业产品表格背景色',
  'industrial-table-header-bg': '工业产品表头背景色',
  'industrial-table-border': '工业产品表格边框色',
  'industrial-table-row-hover-bg': '工业产品行悬浮背景色',
  'industrial-table-child-row-bg': '工业产品子行背景色',
  'industrial-table-text': '工业产品表格文字色',
  'industrial-table-muted-text': '工业产品表格辅助文字色',
  'industrial-table-link-color': '工业产品表格链接色',
  'industrial-pagination-bg': '工业产品分页背景色',
  'industrial-pagination-text': '工业产品分页文字色',
  'industrial-pagination-active-bg': '工业产品分页激活背景色',
  'industrial-pagination-active-text': '工业产品分页激活文字色',
  'industrial-pagination-hover-bg': '工业产品分页悬停背景色',
  'industrial-pagination-border': '工业产品分页边框色',
  'industrial-hover-image-bg': '工业产品悬浮图片背景色',
  'industrial-hover-image-border': '工业产品悬浮图片边框色',

  // ---- 产品集合 ----
  'product-collections-bg': '集合页面背景色',
  'product-collections-text': '集合页面文字色',
  'product-collections-title-color': '集合标题颜色',
  'product-collections-description-text': '集合描述文字色',
  'product-collections-filter-bg': '筛选栏背景色',
  'product-collections-filter-text': '筛选栏文字色',
  'product-collections-filter-border': '筛选栏边框色',
  'product-collections-filter-muted-text': '筛选栏辅助文字色',
  'product-collections-filter-input-bg': '筛选输入框背景色',
  'product-collections-filter-input-text': '筛选输入框文字色',
  'product-collections-pagination-bg': '集合分页背景色',
  'product-collections-pagination-text': '集合分页文字色',
  'product-collections-pagination-hover-bg': '集合分页悬停背景色',
  'product-collections-pagination-border': '集合分页边框色',

  // ---- 产品详情页 ----
  'product-details-bg': '详情页背景色',
  'product-details-text': '详情页文字色',
  'product-details-media-border': '媒体区域边框色',
  'product-details-media-bg': '媒体区域背景色',
  'product-details-thumbnail-border': '缩略图边框色',
  'product-details-thumbnail-active-border': '缩略图激活边框色',
  'product-details-title-color': '产品标题颜色',
  'product-details-brand-color': '品牌文字色',
  'product-details-price-color': '价格颜色',
  'product-details-price-range-color': '价格范围文字色',
  'product-details-variant-border': '变体卡片边框色',
  'product-details-variant-bg': '变体卡片背景色',
  'product-details-variant-text': '变体卡片文字色',
  'product-details-params-border': '参数分割线色',
  'product-details-params-label-color': '参数标签颜色',
  'product-details-params-value-color': '参数值颜色',
  'product-details-description-text': '描述文字色',
  'product-details-spec-text': '规格文字色',
  'product-details-stock-text': '库存文字色',
  'product-details-inquiry-bg': '询盘按钮背景色',
  'product-details-inquiry-text': '询盘按钮文字色',
  'product-details-inquiry-hover-bg': '询盘按钮悬停背景色',
  'product-details-chat-bg': '聊天按钮背景色',
  'product-details-chat-text': '聊天按钮文字色',
  'product-details-chat-hover-bg': '聊天按钮悬停背景色',
  'product-details-store-border': '商店链接按钮边框色',
  'product-details-store-text': '商店链接按钮文字色',
  'product-details-store-hover-bg': '商店链接按钮悬停背景色',
  'product-details-modal-overlay': '弹窗遮罩颜色',
  'product-details-modal-bg': '弹窗背景色',
  'product-details-modal-close-color': '弹窗关闭按钮颜色',

  // ---- 博客 ----
  'blog-container-bg': '博客列表背景色',
  'blog-container-text': '博客列表文字色',
  'blog-title-color': '博客标题颜色',
  'blog-card-border': '博客卡片分割线色',
  'blog-post-title-color': '文章标题颜色',
  'blog-post-title-hover': '文章标题悬浮色',
  'blog-post-meta-color': '文章元数据颜色',
  'blog-post-excerpt-color': '文章摘要颜色',
  'blog-sidebar-bg': '侧边栏背景色',
  'blog-sidebar-text': '侧边栏文字色',
  'blog-sidebar-active-bg': '侧边栏激活背景色',
  'blog-sidebar-active-text': '侧边栏激活文字色',
  'blog-sidebar-hover-bg': '侧边栏悬停背景色',
  'blog-sidebar-hover-text': '侧边栏悬停文字色',
  'blog-pagination-bg': '博客分页背景色',
  'blog-pagination-text': '博客分页文字色',
  'blog-pagination-border': '博客分页边框色',
  'blog-pagination-hover-bg': '博客分页悬停背景色',
  'blog-pagination-disabled-opacity': '博客分页禁用透明度',
  'blog-image-radius': '博客图片圆角',

  // ---- 博客详情页 ----
  'blog-detail-bg': '博客详情背景色',
  'blog-detail-text': '博客详情文字色',
  'blog-detail-title-color': '博客详情标题颜色',
  'blog-detail-meta-color': '博客详情元数据颜色',
  'blog-detail-heading-color': '博客详情内容标题颜色',
  'blog-detail-content-color': '博客详情内容正文颜色',
  'blog-detail-link-color': '博客详情链接颜色',
  'blog-detail-tag-bg': '博客详情标签背景色',
  'blog-detail-tag-text': '博客详情标签文字色',
  'blog-detail-video-radius': '博客详情视频圆角',

  // ---- 文档库 ----
  'doc-library-bg': '文档库背景色',
  'doc-library-text': '文档库文字色',
  'doc-library-title-color': '文档库标题颜色',
  'doc-library-heading-color': '文档库内容标题颜色',
  'doc-library-content-color': '文档库内容正文颜色',
  'doc-library-link-color': '文档库链接颜色',
  'doc-library-divider': '文档库分割线色',
  'doc-library-loading-color': '文档库加载文字色',

  // ---- 文档树 ----
  'doc-sidebar-bg': '文档侧边栏背景色',
  'doc-sidebar-text': '文档侧边栏文字色',
  'doc-sidebar-hover-bg': '文档侧边栏悬停背景色',
  'doc-sidebar-hover-text': '文档侧边栏悬停文字色',
  'doc-sidebar-active-bg': '文档侧边栏激活背景色',
  'doc-sidebar-active-text': '文档侧边栏激活文字色',
  'doc-sidebar-active-border': '文档侧边栏激活竖条颜色',
  'doc-sidebar-border': '文档侧边栏分割线色',
  'doc-sidebar-group-label-color': '文档侧边栏分组标题颜色',
  'doc-sidebar-badge-bg': '文档侧边栏徽章背景色',
  'doc-sidebar-badge-text': '文档侧边栏徽章文字色',

  // ---- 文档详情页 ----
  'doc-detail-bg': '文档详情背景色',
  'doc-detail-text': '文档详情文字色',
  'doc-detail-title-color': '文档详情标题颜色',
  'doc-detail-heading-color': '文档详情内容标题颜色',
  'doc-detail-content-color': '文档详情内容正文颜色',
  'doc-detail-link-color': '文档详情链接颜色',
  'doc-detail-loading-color': '文档详情加载文字色',
  'doc-detail-divider-color': '文档详情分割线色',

  // ---- 视频分类列表 ----
  'video-category-bg': '视频列表背景色',
  'video-category-text': '视频列表文字色',
  'video-category-title-color': '视频列表标题颜色',
  'video-category-btn-bg': '分类按钮背景色',
  'video-category-btn-text': '分类按钮文字色',
  'video-category-btn-hover-bg': '分类按钮悬停背景色',
  'video-category-btn-hover-text': '分类按钮悬停文字色',
  'video-category-btn-active-bg': '分类按钮激活背景色',
  'video-category-btn-active-text': '分类按钮激活文字色',
  'video-card-border': '视频卡片边框色',
  'video-card-shadow': '视频卡片阴影',
  'video-card-hover-shadow': '视频卡片悬浮阴影',
  'video-card-radius': '视频卡片圆角',
  'video-title-color': '视频标题颜色',
  'video-title-hover': '视频标题悬浮色',
  'video-meta-color': '视频元数据颜色',
  'video-placeholder-bg': '视频占位背景色',
  'video-placeholder-text': '视频占位文字色',
  'video-play-btn-bg': '播放按钮背景色',
  'video-play-btn-color': '播放按钮颜色',
  'video-pagination-bg': '视频分页背景色',
  'video-pagination-text': '视频分页文字色',
  'video-pagination-border': '视频分页边框色',
  'video-pagination-hover-bg': '视频分页悬停背景色',
  'video-pagination-disabled-opacity': '视频分页禁用透明度',
  'video-loading-color': '视频加载文字色',

  // ---- 视频详情页 ----
  'video-detail-bg': '视频详情背景色',
  'video-detail-text': '视频详情文字色',
  'video-detail-title-color': '视频详情标题颜色',
  'video-detail-meta-color': '视频详情元数据颜色',
  'video-detail-divider': '视频详情分割线色',
  'video-detail-tag-bg': '视频详情标签背景色',
  'video-detail-tag-text': '视频详情标签文字色',
  'video-detail-heading-color': '视频详情内容标题颜色',
  'video-detail-content-color': '视频详情内容正文颜色',
  'video-detail-link-color': '视频详情链接颜色',
  'video-detail-player-radius': '视频播放器圆角',

  // ---- 询盘表单 ----
  'inquiry-bg': '询盘表单背景色',
  'inquiry-text': '询盘表单文字色',
  'inquiry-padding-top': '询盘表单顶部内边距',
  'inquiry-padding-bottom': '询盘表单底部内边距',

  // ---- 普通页面 ----
  'page-text': '页面文字色',
  'page-heading-color': '页面标题颜色',
  'page-content-color': '页面内容颜色',
  'page-link-color': '页面链接颜色',

  // ---- 搜索页面 ----
  'search-bg': '搜索页面背景色',
  'search-text': '搜索页面文字色',
  'search-title-color': '搜索标题颜色',
  'search-subtitle-color': '搜索副标题颜色',
  'search-description-color': '搜索描述文字色',
  'search-input-bg': '搜索输入框背景色',
  'search-input-border': '搜索输入框边框色',
  'search-input-text': '搜索输入框文字色',
  'search-input-focus-ring': '搜索输入框聚焦环色',
  'search-result-bg': '搜索结果卡片背景色',
  'search-result-border': '搜索结果卡片边框色',
  'search-result-text': '搜索结果卡片文字色',
  'search-result-hover-bg': '搜索结果卡片悬停背景色',
  'search-result-title': '搜索结果标题颜色',
  'search-result-title-hover': '搜索结果标题悬浮色',
  'search-result-meta': '搜索结果元数据颜色',
  'search-result-excerpt': '搜索结果摘要颜色',
  'search-count-color': '搜索结果计数颜色',
  'search-empty-text': '空状态文字色',
  'search-empty-hint': '空状态提示文字色',
  'search-divider': '搜索分割线色',
  'search-type-product': '产品类型标签色',
  'search-type-document': '文档类型标签色',
  'search-type-blog': '文章类型标签色',

  // ---- 用户中心 ----
  // 登录页
  'account-login-bg': '登录页背景色',
  'account-login-card-bg': '登录卡片背景色',
  'account-login-card-shadow': '登录卡片阴影',
  'account-login-card-radius': '登录卡片圆角',
  'account-login-title-color': '登录标题颜色',
  'account-login-subtitle-color': '登录副标题颜色',
  'account-login-input-bg': '登录输入框背景色',
  'account-login-input-border': '登录输入框边框色',
  'account-login-input-text': '登录输入框文字色',
  'account-login-input-focus-ring': '登录输入框聚焦环色',
  'account-login-input-radius': '登录输入框圆角',
  'account-login-primary-btn-bg': '登录主按钮背景色',
  'account-login-primary-btn-text': '登录主按钮文字色',
  'account-login-primary-btn-hover': '登录主按钮悬停色',
  'account-login-success-btn-bg': '登录验证按钮背景色',
  'account-login-success-btn-text': '登录验证按钮文字色',
  'account-login-success-btn-hover': '登录验证按钮悬停色',
  'account-login-error-color': '登录错误提示色',
  'account-login-link-color': '登录链接颜色',
  'account-login-link-hover': '登录链接悬停色',
  'account-login-terms-color': '登录条款文字色',

  // 账户布局
  'account-sidebar-bg': '用户中心侧边栏背景色',
  'account-sidebar-border': '侧边栏边框色',
  'account-sidebar-title-color': '侧边栏标题颜色',
  'account-menu-text': '菜单项文字色',
  'account-menu-hover-bg': '菜单项悬停背景色',
  'account-menu-active-bg': '菜单项激活背景色',
  'account-menu-active-text': '菜单项激活文字色',
  'account-logout-color': '注销按钮颜色',
  'account-logout-hover-bg': '注销按钮悬停背景色',
  'account-content-bg': '主内容区背景色',
  'account-content-text': '主内容区文字色',

  // 账户主页
  'account-card-bg': '用户卡片背景',
  'account-card-shadow': '卡片阴影',
  'account-card-radius': '卡片圆角',
  'account-label-color': '标签文字色',
  'account-value-color': '值文字色',
  'account-link-color': '链接颜色',
  'account-link-hover': '链接悬停色',
  'account-address-card-bg': '地址卡片背景色',
  'account-address-card-shadow': '地址卡片阴影',
  'account-address-border': '地址卡片边框色',
  'account-address-radius': '地址卡片圆角',
  'account-default-badge-bg': '默认标签背景色',
  'account-default-badge-text': '默认标签文字色',
  'account-primary-btn-bg': '主按钮背景色',
  'account-primary-btn-text': '主按钮文字色',
  'account-primary-btn-hover': '主按钮悬停色',
  'account-action-icon-color': '操作图标颜色',
  'account-danger-color': '危险操作颜色',
  'account-empty-text': '空状态文字色',
  'account-divider': '分割线色',
  'account-toggle-active-bg': '开关激活背景色',
  'account-toggle-inactive-bg': '开关非激活背景色',
  'account-toggle-thumb-color': '开关滑块颜色',
  'account-marketing-text': '营销偏好文字色',
  'account-marketing-desc': '营销偏好描述色',

  // 个人资料页
  'account-profile-title-color': '个人资料标题颜色',
  'account-profile-form-bg': '个人资料表单背景色',
  'account-profile-form-shadow': '个人资料表单阴影',
  'account-profile-form-radius': '个人资料表单圆角',
  'account-profile-input-border': '个人资料输入框边框色',
  'account-profile-input-bg': '个人资料输入框背景色',
  'account-profile-input-text': '个人资料输入框文字色',
  'account-profile-input-radius': '个人资料输入框圆角',
  'account-profile-email-bg': '邮箱只读背景色',
  'account-profile-email-text': '邮箱只读文字色',
  'account-profile-email-note': '邮箱提示文字色',
  'account-profile-cancel-border': '取消按钮边框色',
  'account-profile-cancel-hover': '取消按钮悬停背景色',
  'account-profile-save-bg': '保存按钮背景色',
  'account-profile-save-text': '保存按钮文字色',
  'account-profile-save-hover': '保存按钮悬停色',

  // 询盘列表
  'account-inquiry-title-color': '询盘标题颜色',
  'account-inquiry-list-bg': '询盘列表背景色',
  'account-inquiry-list-border': '询盘列表边框色',
  'account-inquiry-list-radius': '询盘列表圆角',
  'account-inquiry-item-bg': '询盘项背景色',
  'account-inquiry-item-hover': '询盘项悬停背景色',
  'account-inquiry-item-active-bg': '询盘项激活背景色',
  'account-inquiry-item-active-border': '询盘项激活边框色',
  'account-inquiry-item-text': '询盘项文字色',
  'account-inquiry-item-meta': '询盘项元数据色',
  'account-inquiry-detail-bg': '询盘详情背景色',
  'account-inquiry-detail-border': '询盘详情边框色',
  'account-inquiry-detail-radius': '询盘详情圆角',
  'account-inquiry-header-bg': '询盘头部背景色',
  'account-inquiry-header-text': '询盘头部文字色',
  'account-inquiry-info-bg': '询盘信息背景色',
  'account-inquiry-info-text': '询盘信息文字色',
  'account-inquiry-reply-user-bg': '用户回复背景色',
  'account-inquiry-reply-user-text': '用户回复文字色',
  'account-inquiry-reply-admin-bg': '管理员回复背景色',
  'account-inquiry-reply-admin-text': '管理员回复文字色',
  'account-inquiry-reply-system-bg': '系统回复背景色',
  'account-inquiry-reply-system-text': '系统回复文字色',
  'account-inquiry-reply-input-bg': '回复输入框背景色',
  'account-inquiry-reply-input-border': '回复输入框边框色',
  'account-inquiry-reply-input-radius': '回复输入框圆角',
  'account-inquiry-send-btn-bg': '发送按钮背景色',
  'account-inquiry-send-btn-text': '发送按钮文字色',
  'account-inquiry-send-btn-hover': '发送按钮悬停色',
  'account-inquiry-create-btn-bg': '新建询盘按钮背景色',
  'account-inquiry-create-btn-text': '新建询盘按钮文字色',
  'account-inquiry-create-btn-hover': '新建询盘按钮悬停色',
  'account-inquiry-empty-icon': '空状态图标颜色',
  'account-inquiry-empty-text': '空状态文字色',
  'account-inquiry-status-pending': '待处理状态色',
  'account-inquiry-status-pending-bg': '待处理状态背景色',
  'account-inquiry-status-processing': '处理中状态色',
  'account-inquiry-status-processing-bg': '处理中状态背景色',
  'account-inquiry-status-replied': '已回复状态色',
  'account-inquiry-status-replied-bg': '已回复状态背景色',
  'account-inquiry-status-closed': '已关闭状态色',
  'account-inquiry-status-closed-bg': '已关闭状态背景色',
  'account-inquiry-link-color': '询盘链接颜色',

  // 地址管理
  'account-address-page-bg': '地址页背景色',
  'account-address-page-text': '地址页文字色',
  'account-address-form-bg': '地址表单背景色',
  'account-address-form-shadow': '地址表单阴影',
  'account-address-form-radius': '地址表单圆角',
  'account-address-form-title': '地址表单标题颜色',
  'account-address-form-label': '地址表单标签色',
  'account-address-form-input-border': '地址表单输入框边框色',
  'account-address-form-input-bg': '地址表单输入框背景色',
  'account-address-form-input-text': '地址表单输入框文字色',
  'account-address-form-phone-prefix-bg': '电话区号背景色',
  'account-address-form-phone-prefix-text': '电话区号文字色',
  'account-address-form-cancel-border': '取消按钮边框色',
  'account-address-form-cancel-hover': '取消按钮悬停背景色',
  'account-address-form-save-bg': '保存按钮背景色',
  'account-address-form-save-text': '保存按钮文字色',
  'account-address-form-save-hover': '保存按钮悬停色',

  // ---- 购物车、账户 ----
  'cart-item-border': '购物车项边框色',
  'cart-total-bg': '购物车总计背景色',
  'checkout-btn-bg': '结算按钮背景色',
  'account-order-status-color': '订单状态颜色',

  // ---- 图表 ----
  'chart-1': '图表颜色 1',
  'chart-2': '图表颜色 2',
  'chart-3': '图表颜色 3',
  'chart-4': '图表颜色 4',
  'chart-5': '图表颜色 5',

  // ---- 侧边栏 ----
  sidebar: '侧边栏背景色',
  'sidebar-foreground': '侧边栏文字色',
  'sidebar-primary': '侧边栏主色',
  'sidebar-primary-foreground': '侧边栏主色文字',
  'sidebar-accent': '侧边栏强调色',
  'sidebar-accent-foreground': '侧边栏强调色文字',
  'sidebar-border': '侧边栏边框色',
  'sidebar-ring': '侧边栏聚焦环',

  // ---- 页面专用 ----
  'docs-sidebar-bg': '文档侧边栏背景',
  'docs-sidebar-text': '文档侧边栏文字',
  'docs-table-bg': '文档表格背景',
  'docs-code-bg': '文档代码块背景',
  'video-player-bg': '视频播放器背景',
  'video-title': '视频标题颜色',
  'video-controls-bg': '视频控制栏背景',
  'video-controls-color': '视频控制按钮颜色',
  'inquiry-form-bg': '询盘表单背景',
  'inquiry-input-border': '询盘输入框边框',
  'inquiry-input-focus': '询盘输入框聚焦边框',
  'inquiry-submit-bg': '询盘提交按钮背景',
  'inquiry-submit-text': '询盘提交按钮文字',
  'account-avatar-bg': '用户头像背景',
  'account-username': '用户名颜色',

  // ---- 文字 ----
  // ✅ 统一 font-* 命名
  'font-sans': '网站默认字体',
  'font-heading': '标题字体',        // ✅ 新增
  'font-serif': '装饰性字体',
  'font-mono': '代码/数字字体',
  'font-size-base': '正文字号',
  'font-size-sm': '小字号',
  'font-size-lg': '大字号',
  'font-size-xl': '超大字号',
  'font-size-2xl': '标题字号',
  'font-size-3xl': '大标题字号',
  'font-size-4xl': '超大标题字号',
  'font-size-xs': '极小字号',
  'font-weight-normal': '正常字重',
  'font-weight-medium': '中等字重',
  'font-weight-semibold': '半粗字重',
  'font-weight-bold': '加粗字重',
  'line-height-tight': '紧凑行高',
  'line-height-normal': '正常行高',
  'line-height-relaxed': '宽松行高',
  'letter-spacing-tight': '紧凑字间距',
  'letter-spacing-normal': '正常字间距',
  'letter-spacing-wide': '宽松字间距',
  'text-color-body': '正文颜色',
  'text-color-heading': '标题颜色',
  'text-color-muted': '辅助文字颜色',

  // ---- 间距 ----
  'spacing-unit': '基础间距单位',
  'spacing-1': '间距 1',
  'spacing-2': '间距 2',
  'spacing-3': '间距 3',
  'spacing-4': '间距 4',
  'spacing-5': '间距 5',
  'spacing-6': '间距 6',
  'spacing-8': '间距 8',
  'spacing-10': '间距 10',
  'spacing-12': '间距 12',
  'container-padding': '容器内边距',
  'section-gap': '区块间距',
  'grid-gap': '网格间距',
  'product-card-padding': '商品卡片内边距',

  // ---- 圆角 ----
  radius: '默认圆角',
  'radius-sm': '小圆角',
  'radius-md': '中圆角',
  'radius-lg': '大圆角',
  'radius-xl': '超大圆角',
  'radius-2xl': '特大圆角',
  'radius-full': '完全圆形',
  'btn-radius': '按钮圆角',
  'input-radius': '输入框圆角',

  // ---- 阴影 ----
  'shadow-xs': '极轻微阴影',
  'shadow-sm': '轻微阴影',
  'shadow-md': '中等阴影',
  'shadow-lg': '明显阴影',
  'shadow-xl': '重度阴影',
  'shadow-2xl': '极重阴影',
  'product-card-shadow': '商品卡片阴影',
  'product-card-hover-shadow': '商品卡片悬浮阴影',
  'dropdown-shadow': '下拉菜单阴影',
  'btn-shadow': '按钮阴影',

  // ---- 动效 ----
  'transition-duration-75': '极快动画 (75ms)',
  'transition-duration-100': '更快动画 (100ms)',
  'transition-duration-150': '快速动画 (150ms)',
  'transition-duration-200': '正常动画 (200ms)',
  'transition-duration-300': '慢速动画 (300ms)',
  'transition-duration-500': '极慢动画 (500ms)',
  'transition-timing-ease': '缓动曲线 (ease)',
  'transition-timing-linear': '线性曲线 (linear)',
  'transition-timing-in': '缓入曲线 (ease-in)',
  'transition-timing-out': '缓出曲线 (ease-out)',
};





// ============================================================
// ✅ 变量 → 组件映射（用于分组卡片底部的「变量与组件对照表」）
//
// 只覆盖：文字、间距、圆角、阴影、动效
// 不含颜色（颜色可通过页面主题设置，用户可定位）
//
// 组件名逐步完善，初期先标注常见组件
// ============================================================
export const VARIABLE_COMPONENT_MAP: Record<string, string> = {
  // ============================================================
  // 字体
  // ============================================================
  'font-sans': '全站默认字体（html/body）',
  'font-heading': '全站标题（h1~h6）',
  'font-serif': '引用块（blockquote）',
  'font-mono': '代码块（code/pre/kbd/samp）',

  // ============================================================
  // 字号
  // ============================================================
  'font-size-xs': '小标签、辅助文字、徽章文字（Badge）、登录页条款（LoginPage）',

  'font-size-sm': '公告栏（AnnouncementBar）、语言切换器（LanguageSwitcher）、超级菜单描述（MegaMenu）、菜单项返回按钮（MenuItems）、右侧工具头像（RightTools）、简单页脚版权文字（SimpleFooter）、登录页副标题/标签/链接（LoginPage）、搜索页计数/空状态提示（SearchPage）、页脚（Footer）、商品描述（ProductCard）、博客元数据（BlogCard）、分页文字（Pagination）、博客列表侧边栏项/文章元数据/分页文字（BlogBlock）、文档树二级节点（DocsTree）',

  'font-size-base': '导航栏（Navbar）、下拉菜单（DropdownMenu）、语言切换器（LanguageSwitcher）、菜单项（MenuItems）、搜索输入框（SearchButton）、经典导航搜索框（ClassicNavbar）、页脚横向菜单（FooterHorizontalMenu）、正文段落、表单标签、按钮文字（Button）、文档树一级节点（DocsTree）',

  'font-size-lg': '商品卡片标题（ProductCard）、博客卡片标题（BlogCard）、侧边栏标题、页脚横向菜单按钮（FooterHorizontalMenu）、搜索页空状态文字（SearchPage）、视频详情简介标题（VideoDetailPage）、博客列表侧边栏标题（BlogBlock）',
  'font-size-xl': 'Logo 文字兜底（Logo）、页脚品牌项文字兜底（BrandItem）、页面小标题、区块标题（Section）',

  'font-size-2xl': '页面主标题、博客详情标题（BlogDetail）、登录页标题（LoginPage）、产品详情空状态标题（ProductDetailPage）、产品线空状态标题（ProductLinePage）、产品分类空状态标题（CategoryPage）、视频列表空状态标题（VideoPage）、博客列表文章标题（BlogBlock）',
  'font-size-3xl': '页面大标题、产品详情标题（ProductDetails）、搜索页标题（SearchPage）、博客列表主标题（BlogBlock）',
  'font-size-4xl': '首页 Hero 大标题（Hero）、产品详情空状态图标（ProductDetailPage）、产品线空状态图标（ProductLinePage）、产品分类空状态图标（CategoryPage）、视频列表空状态图标（VideoPage）、404 页面标题（NotFound）',

  // ============================================================
  // 字重
  // ============================================================
  'font-weight-normal': '正文段落、描述文字、博客正文（BlogDetail）、超级菜单三级项（MegaMenu）、文档树叶子节点（DocsTree）',

  'font-weight-medium': '导航菜单（Navbar）、下拉菜单（DropdownMenu）、公告栏（AnnouncementBar）、菜单项返回按钮（MenuItems）、按钮文字（Button）、标签（Tag）、文档树二级节点（DocsTree）',

  'font-weight-semibold': 'Logo 文字兜底（Logo）、页脚品牌项文字兜底（BrandItem）、超级菜单标题/二级项（MegaMenu）、右侧工具头像（RightTools）、商品卡片标题（ProductCard）、博客卡片标题（BlogCard）、区块标题（Section）、文档树一级节点/选中态（DocsTree）',

  'font-weight-bold': '主标题、价格（ProductCard）、强调文字、Hero 大标题（Hero）、登录页标题（LoginPage）、邮件订阅主标题（NewsletterSection）、博客列表主标题（BlogBlock）',

  // ============================================================
  // 行高
  // ============================================================
  'line-height-tight': '标题、卡片标题、Hero 大标题（Hero）',
  'line-height-normal': '正文段落、按钮文字（Button）、导航菜单（Navbar）、文档树节点（DocsTree）',
  'line-height-relaxed': '博客正文（BlogDetail）、文档正文（DocDetail）、长文本内容',

  // ============================================================
  // 字间距
  // ============================================================
  'letter-spacing-tight': '大标题、Hero 大标题（Hero）',
  'letter-spacing-normal': '正文、导航菜单（Navbar）、文档树节点（DocsTree）',
  'letter-spacing-wide': '按钮文字（Button）、公告栏（AnnouncementBar）、标签（Tag）、面包屑',

  // ============================================================
  // 间距
  // ============================================================
  'spacing-unit': '基础间距单位（内部计算使用）',

  'spacing-1': '下拉菜单箭头与文字间距（DropdownMenu）、语言切换器图标间距（LanguageSwitcher）、超级菜单图标间距（MegaMenu）、右侧工具用户入口间距（RightTools）、页脚横向菜单图标间距/面板内边距（FooterHorizontalMenu）、登录页输入框上边距（LoginPage）、博客列表侧边栏列表项间距（BlogBlock）、徽章内边距（Badge）',

  'spacing-2': '下拉菜单项内边距（DropdownMenu）、语言切换器内边距（LanguageSwitcher）、超级菜单列表项间距（MegaMenu）、菜单项返回按钮图标间距（MenuItems）、移动端汉堡按钮内边距（MobileNav）、右侧工具容器间距（RightTools）、搜索按钮内边距（SearchButton）、简单导航中部中心行间距（SimpleNavbar）、默认导航中部中心行间距（DefaultNavbar）、经典导航各区块上下内边距（ClassicNavbar）、页脚横向菜单项内边距（FooterHorizontalMenu）、404 页面标题下边距（NotFound）、标签内边距（Tag）、按钮内边距（Button 小号）、文档树分组间距（DocsTree）',

  'spacing-3': '语言切换器按钮左右内边距（LanguageSwitcher）、超级菜单标题上方间距（MegaMenu）、菜单项上下内边距（MenuItems）、卡片内部小间距、表单项间距（Form）、登录页错误提示/次级文字上边距（LoginPage）、视频详情主标题下边距/标签左右内边距/简介标题下边距（VideoDetailPage）、博客列表侧边栏项左右内边距（BlogBlock）',

  'spacing-4': '公告栏内边距（AnnouncementBar）、下拉菜单项左右内边距（DropdownMenu）、语言切换器下拉项内边距（LanguageSwitcher）、超级菜单二级前占位（MegaMenu）、菜单项左右内边距（MenuItems）、移动端抽屉内边距（MobileNav）、搜索输入框内边距（SearchButton）、简单导航顶部中心菜单上边距（SimpleNavbar）、简单导航右侧工具间距（SimpleNavbar）、默认导航顶部中心菜单上边距（DefaultNavbar）、默认导航右侧工具间距（DefaultNavbar）、经典导航搜索框内边距/右侧工具间距（ClassicNavbar）、简单页脚社交区域上下内边距/版权区域 gap（SimpleFooter）、页脚横向菜单项左右内边距（FooterHorizontalMenu）、登录页标题下边距/表单字段间距/条款上边距（LoginPage）、博客列表侧边栏内边距/侧边栏标题下边距/容器左右内边距/分页间距（BlogBlock）、商品卡片内边距（ProductCard）、区块间距（Section）、页面左右内边距（Container）、文档树一级缩进（DocsTree）',

  'spacing-5': '中等间距、卡片区块间距、登录页副标题下边距（LoginPage）',
  'spacing-6': '下拉菜单主容器间距（DropdownMenu）、超级菜单面板内边距/列间距（MegaMenu）、简单导航中部中心列间距（SimpleNavbar）、默认导航中部中心列间距（DefaultNavbar）、简单页脚版权区域上下内边距（SimpleFooter）、登录页卡片内边距（LoginPage）、视频详情元数据下边距/标签区下边距（VideoDetailPage）、博客列表文章卡片图片与内容间距（BlogBlock）、区块大间距（Section）、区块上下内边距',
  'spacing-8': '页面区域间距、Hero 上下内边距（Hero）、简单导航中部中心右内边距（SimpleNavbar）、默认导航中部中心右内边距（DefaultNavbar）、简单页脚内容区域上下内边距/列间距（SimpleFooter）、页脚横向菜单主容器列间距（FooterHorizontalMenu）、视频详情容器上下内边距/主布局间距/播放器下边距/简介区下边距（VideoDetailPage）、博客列表容器上下内边距/主布局间距/主标题下边距/文章列表间距/分页上边距（BlogBlock）、文档树二级缩进（DocsTree）',
  'spacing-10': '大区块间距、简单导航中部左菜单与 Logo 间距（SimpleNavbar）、轻奢导航桌面菜单与 Logo 间距（LuxuryNavbar）、默认导航中部左菜单与 Logo 间距（DefaultNavbar）、搜索页结果区上边距/空状态上边距（SearchPage）',
  'spacing-12': '页面级大间距、Hero 大区块间距（Hero）、简单导航中部中心三列间距（SimpleNavbar）、默认导航中部中心三列间距（DefaultNavbar）、产品详情空状态上下内边距（ProductDetailPage）、产品线空状态上下内边距（ProductLinePage）、产品分类空状态上下内边距（CategoryPage）、搜索页容器上下内边距/空状态上下内边距（SearchPage）、视频列表空状态上下内边距（VideoPage）',
  'container-padding': '页面左右内边距（Container）',
  'section-gap': '页面区块之间的间距（Section）,前台页面自定义组件与页脚之间的间距（Footer）',
  'grid-gap': '网格布局的间距（ProductGrid、BlogGrid）',
  'product-card-padding': '商品卡片内边距（ProductCard）',

  // ============================================================
  // 圆角
  // ============================================================
  'radius': '通用圆角（按钮、卡片、输入框）',
  'radius-sm': '小圆角（标签 Tag、徽章 Badge、小按钮 Button）',
  'radius-md': '中圆角（表单 Form、下拉菜单 Dropdown、移动端汉堡按钮 MobileNav、搜索按钮 SearchButton、页脚横向菜单面板 FooterHorizontalMenu、登录页按钮 LoginPage、博客列表侧边栏项/分页按钮 BlogBlock）',

  'radius-lg': '大圆角（下拉菜单面板 DropdownMenu、语言切换器面板 LanguageSwitcher、超级菜单图片 MegaMenu、商品卡片 ProductCard、博客卡片 BlogCard、弹窗 Modal、博客列表侧边栏容器 BlogBlock）',

  'radius-xl': '超大圆角（Hero 卡片）',
  'radius-2xl': '特大圆角（大型容器）',
  'radius-full': '圆形（头像 Avatar、圆形按钮、圆形图标）',
  'product-card-radius': '商品卡片圆角（ProductCard）',
  'btn-radius': '按钮圆角（Button）',
  'input-radius': '输入框圆角（Input、Textarea、Select）',

  // ============================================================
  // 阴影
  // ============================================================
  'shadow-xs': '极轻微阴影（卡片微悬浮）',
  'shadow-sm': '输入框聚焦阴影（Input、Textarea）、小卡片阴影',

  'shadow-md': '商品卡片阴影（ProductCard）、博客卡片阴影（BlogCard）、超级菜单轮播按钮（MegaMenu）、简单导航滚动阴影（SimpleNavbar）、轻奢导航滚动阴影（LuxuryNavbar）、弹窗阴影（Modal）',

  'shadow-lg': '悬浮卡片阴影（ProductCard hover）、下拉菜单阴影（Dropdown）、搜索面板阴影（SearchButton）、页脚横向菜单面板（FooterHorizontalMenu）',
  'shadow-xl': '浮层阴影（Popover、Tooltip）',
  'shadow-2xl': '模态框阴影（Dialog、Modal）',
  'product-card-shadow': '商品卡片阴影（ProductCard）',
  'product-card-hover-shadow': '商品卡片悬浮阴影（ProductCard hover）',

  'dropdown-shadow': '下拉菜单阴影（DropdownMenu、LanguageSwitcher、Navbar 超级菜单）',
  'btn-shadow': '按钮阴影（Button）',

  // ============================================================
  // 动效
  // ============================================================
  'transition-duration-75': '极快交互（图标切换）',
  'transition-duration-100': '快速交互（按钮点击 Button）',

  'transition-duration-150': '下拉菜单文字颜色过渡（DropdownMenu）、语言切换器过渡（LanguageSwitcher）、超级菜单过渡（MegaMenu）、菜单项过渡（MenuItems）、移动端汉堡按钮 hover（MobileNav）、右侧工具过渡（RightTools）、搜索按钮过渡（SearchButton）、经典导航搜索框聚焦（ClassicNavbar）、简单页脚链接过渡（SimpleFooter）、页脚横向菜单过渡（FooterHorizontalMenu）、登录页过渡（LoginPage）、博客列表过渡（BlogBlock）、按钮 hover（Button）、导航菜单 hover（Navbar）、文档树展开箭头过渡（DocsTree）',

  'transition-duration-200': '公告栏链接 hover（AnnouncementBar）、下拉菜单展开/收起（DropdownMenu）、卡片 hover（ProductCard、BlogCard）、链接 hover',
  'transition-duration-300': '弹窗出现（Modal）、下拉菜单展开（Dropdown）、简单导航滑动（SimpleNavbar）、轻奢导航过渡（LuxuryNavbar）',
  'transition-duration-500': '慢速过渡（Hero 图片、背景切换）',

  'transition-timing-ease': '标准缓动曲线（DropdownMenu、LanguageSwitcher、MegaMenu、MenuItems、MobileNav、RightTools、SearchButton、SimpleNavbar、LuxuryNavbar、DefaultNavbar、ClassicNavbar、SimpleFooter、FooterHorizontalMenu、LoginPage、BlogBlock、DocsTree、AnnouncementBar、通用）',

  'transition-timing-linear': '线性缓动曲线（进度条、加载动画）',
  'transition-timing-in': '缓入曲线（元素进入）',
  'transition-timing-out': '缓出曲线（元素离开）',
};
