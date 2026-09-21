// lib/webbuilder/types.ts
/**
 * 模板分类枚举（与下拉选项一致）
 * 新增 product_line 分类用于产品线落地页模板
 */
export const TemplateCategories = [
  { value: 'page', label: '页面' },
  { value: 'product', label: '产品' },
  { value: 'product_category', label: '产品分类' },
  { value: 'product_line', label: '产品线' },      // 新增
  { value: 'doc', label: '文档' },
  { value: 'blog', label: '博客' },
  { value: 'blog_post', label: '博客文章' },
  { value: 'video_category', label: '视频分类' },
  { value: 'video', label: '视频' },
] as const;

export type TemplateCategory = (typeof TemplateCategories)[number]['value'];

/**
 * 模板数据接口（用于存储和 API 交互）
 */
export interface TemplateData {
  id: string;                         // 模板 ID，例如 "template_aB3x9L2q"
  version: 'draft' | 'published';     // 版本：草稿或已发布
  title: string;                      // 模板名称
  category: TemplateCategory;         // 模板分类
  data: any;                          // Puck 页面数据（JSON）
  createdAt: string;                  // 创建时间 ISO 字符串
  updatedAt: string;                  // 更新时间 ISO 字符串
}

// ==================== 基础组件 Props ====================

export interface BlankBlockProps {
  // 控制子项的垂直间距（单位：px）
  gap?: 0 | 4 | 8 | 12 | 16 | 20 | 24;
  padding?: 0 | 4 | 8 | 12 | 16 | 20 | 24 | 32;
  content: any; // 接收 Puck 的 slot 内容
}

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link?: string;
  color?: string;   
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  spacingGroup: {
    mobileScaleFactor: number;
  };
  // 编辑模式标记（由 Puck 注入）
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

export interface ParagraphProps {
  // ✅ 富文本 HTML
  content?: string;

  // 全局样式
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';

  spacingGroup: {
    mobileScaleFactor: number;
  };

  // ✅ 兼容旧数据（渲染时回退）
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  link?: string;

  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

export interface ButtonProps {
  text: string;
  buttonColor: string;
  textColor: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  buttonAlign: 'left' | 'center' | 'right';
  link?: string;
  borderRadius: string;
  paddingX: number;
  paddingY: number;
  spacingGroup: {
    mobileScaleFactor: number;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

// ==================== List 组件类型（单语言） ====================
export interface ListItem {
  id: string;
  icon: string;            // Lucide 图标名称
  text: string;
  textColor: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: string;
}

export interface ListProps {
  spacingGroup: {
    mobileScaleFactor: number;
  };
  items: ListItem[];
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

// ==================== 分割线组件类型 ====================
export interface DividingLineProps {
  lineType: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness: number;
  color: string;
  widthType: 'full' | '90' | '80' | '50';
  align: 'left' | 'center' | 'right';
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

// ==================== 富文本组件 ====================
export interface RichtextProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  titleGroup: {
    title: string;
    titleFontSize: number;
    titleColor: string;
  };
  textGroup: {
    text: string;
    textFontSize: number;
    textColor: string;
  };
  button1Group: {
    button1Text: string;
    button1FontSize: number;
    button1Color: string;
    button1Link: string;
  };
  button2Group: {
    button2Text: string;
    button2FontSize: number;
    button2Color: string;
    button2Link: string;
  };
  buttonStyleGroup: {
    buttonPaddingX: number;
    buttonPaddingY: number;
    buttonBorderRadius: number;
  };
  layoutGroup: {
    contentPosition: 'left' | 'center' | 'right';
    textAlign: 'left' | 'center' | 'right';
  };
  paddingGroup: {
    containerPaddingTop: number;
    containerPaddingBottom: number;
  };
  spacingGroup: {
    titleMarginBottom: number;
    textMarginBottom: number;
    buttonGap: number;
    mobileScaleFactor: number;
  };
}

// ==================== 视频组件 ====================
export interface VideoProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  title: string;
  titleFontSize: number;
  titleColor: string;
  titleAlign: 'left' | 'center' | 'right';
  videoUrl: string;
  videoThumbnail: string;
  videoDuration?: number;
  loop: boolean;
  paddingTop: number;
  paddingBottom: number;
  // 用于 UI 分组，不存储
  _divider1?: any;
  _divider2?: any;
  _divider3?: any;
}

// ==================== 带图片文本组件 ====================
export interface PicwithTextProps {
  // 顶层字段
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  // 分组字段（配置文件使用）
  imageGroup?: {
    imageUrl: string;
    imageHeight: 'auto' | 'small' | 'medium' | 'large';
    imageWidth: 'small' | 'medium' | 'large';
    imagePosition: 'left' | 'right';
    animation: 'none' | 'ambient' | 'zoom';
  };
  titleGroup?: {
    title: string;
    titleFontSize: number;
    titleColor: string;
  };
  textGroup?: {
    text: string;
    textFontSize: number;
    textColor: string;
  };
  buttonGroup?: {
    buttonText: string;
    buttonFontSize: number;
    buttonColor: string;
    buttonLink: string;
    buttonPaddingX: number;
    buttonPaddingY: number;
    buttonBorderRadius: number;
  };
  layoutGroup?: {
    contentVertical: 'top' | 'center' | 'bottom';
    textAlign: 'left' | 'center' | 'right';
    textAreaBackgroundColor: string;
  };
  paddingGroup?: {
    paddingTop: number;
    paddingBottom: number;
  };

  // 以下为旧扁平字段（兼容旧数据，新数据不会使用）
  imageUrl?: string;
  imageHeight?: 'auto' | 'small' | 'medium' | 'large';
  imageWidth?: 'small' | 'medium' | 'large';
  imagePosition?: 'left' | 'right';
  animation?: 'none' | 'ambient' | 'zoom';
  title?: string;
  titleFontSize?: number;
  titleColor?: string;
  text?: string;
  textFontSize?: number;
  textColor?: string;
  buttonText?: string;
  buttonFontSize?: number;
  buttonColor?: string;
  buttonLink?: string;
  buttonPaddingX?: number;
  buttonPaddingY?: number;
  buttonBorderRadius?: number;
  contentVertical?: 'top' | 'center' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  textAreaBackgroundColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
}

// ==================== 图片横幅 ====================
export interface ImageBannerProps {
  bannerType: 'standard' | 'fullwidth';
  // 原有扁平字段（保留，兼容旧数据）
  image1Url?: string;
  image2Url?: string;
  overlayOpacity?: number;
  heightPreset?: 'auto' | 'small' | 'medium' | 'large';
  title?: string;
  titleFontSize?: number;
  titleColor?: string;
  text?: string;
  textFontSize?: number;
  textColor?: string;
  button1Text?: string;
  button1Color?: string;
  button1Link?: string;
  button2Text?: string;
  button2Color?: string;
  button2Link?: string;
  buttonPaddingX?: number;
  buttonPaddingY?: number;
  buttonBorderRadius?: number;
  contentPosition?: string;
  textAlign?: 'left' | 'center' | 'right';
  containerEnabled?: boolean;
  containerBgColor?: string;
  containerBorderRadius?: number;
  containerPadding?: number;

  // 新增：支持嵌套分组（配置文件使用）
  imageSettings?: {
    image1Url: string;
    image2Url: string;
    overlayOpacity: number;
    heightPreset: 'auto' | 'small' | 'medium' | 'large';
  };
  contentSettings?: {
    title: string;
    titleFontSize: number;
    titleColor: string;
    text: string;
    textFontSize: number;
    textColor: string;
    button1Text: string;
    button1Color: string;
    button1Link: string;
    button2Text: string;
    button2Color: string;
    button2Link: string;
    contentPosition: string;
    textAlign: 'left' | 'center' | 'right';
    containerEnabled: boolean;
    containerBgColor: string;
    containerBorderRadius: number;
    containerPadding: number;
  };
}

// ========== Multicolumn 组件类型（单语言，嵌套分组） ==========
export interface MulticolumnItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonLink: string;
}

export interface MulticolumnProps {
  bannerGroup: {
    bannerType: 'standard' | 'fullwidth';
    backgroundColor: string;
  };

  globalGroup: {
    globalTitle: string;
    globalTitleFontSize: number;
    globalTitleColor: string;
  };

  imageGroup: {
    imageWidth: 'full' | 'half' | 'third';
    imageShape: 'adapt' | 'portrait' | 'square' | 'circle';
  };

  buttonGroup: {
    buttonText: string;
    buttonFontSize: number;
    buttonColor: string;
    buttonLink: string;
    buttonPaddingX: number;
    buttonPaddingY: number;
    buttonBorderRadius: number;
  };

  layoutGroup: {
    columnsDesktop: number;       // 1-5
    columnsAlign: 'left' | 'center';
    columnsMobile: number;        // 1-2
    mobileCarousel: boolean;
  };

  styleGroup: {
    columnBgColor: string;
    columnTitleColor: string;
    columnDescColor: string;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  spacingGroup: {
    mobileScaleFactor: number;
  };

  items: MulticolumnItem[];
}

// ========== Multirow 多行组件类型 ==========
export interface MultirowItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  linkLabel: string;
  linkUrl: string;
}

export interface MultirowProps {
  bannerGroup: {
    bannerType: 'standard' | 'fullwidth';
    backgroundColor: string;
  };

  imageGroup: {
    imageHeight: 'auto' | 'small' | 'medium' | 'large';
    imageWidth: 'small' | 'medium' | 'large';
    imagePlacement: 'alternate-left' | 'alternate-right' | 'left' | 'right';
  };

  contentGroup: {
    columnBgColor: string;
    columnTitleColor: string;
    columnTitleFontSize: number;
    columnDescColor: string;
    columnDescFontSize: number;
    contentVertical: 'top' | 'middle' | 'bottom';
    textAlign: 'left' | 'center' | 'right';
    mobileTextAlign: 'left' | 'center' | 'right';
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  spacingGroup: {
    mobileScaleFactor: number;
  };

  items: MultirowItem[];
}

// ========== 可折叠组件类型（嵌套分组） ==========
export interface CollapsibleItem {
  id: string;
  title: string;
  icon: string;
  content: string;
}

export interface CollapsibleProps {
  bannerGroup: {
    bannerType: 'standard' | 'fullwidth';
    backgroundColor: string;
  };

  titleGroup: {
    globalTitle: string;
    globalTitleFontSize: number;
    globalTitleColor: string;
    globalTitleAlign: 'left' | 'center' | 'right';
    rowBackgroundColor: string;
  };

  imageGroup: {
    imageUrl: string;
    imageRatio: 'adapt' | 'small' | 'large';
    imagePlacement: 'left' | 'right';
  };

  contentGroup: {
    rowTitleFontSize: number;
    rowTitleColor: string;
    rowContentFontSize: number;
    rowContentColor: string;
  };

  containerGroup: {
    containerType: 'none' | 'row' | 'section';
    containerBgColor: string;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  spacingGroup: {
    mobileScaleFactor: number;
  };

  items: CollapsibleItem[];
}

// ========== 手风琴组件类型 ==========
export interface AccordionContentItem {
  id: string;
  imageUrl: string;
  title: string;
  paragraph: string;
  link: string;
}

export interface AccordionItem {
  id: string;
  title: string;
  contents: AccordionContentItem[];
}

export interface AccordionProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  rowGroup: {
    rowTitleColor: string;
    rowTitleFontSize: number;
    rowTitleAlign: 'left' | 'center' | 'right';
    rowHeaderBgColor: string;
    itemsPerRow: number;
    itemsGap: number;
  };
  contentGroup: {
    contentTitleFontSize: number;
    contentTitleAlign: 'left' | 'center' | 'right';
    contentTextFontSize: number;
    contentTextAlign: 'left' | 'center' | 'right';
  };
  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };
  spacingGroup: {
    mobileScaleFactor: number;
  };
  items: AccordionItem[];
}

// ==================== Section 组件（分组属性） ====================
export interface SectionProps {
  sizeGroup?: {
    containerWidth: 'full' | 'auto' | 'custom';
    customContainerWidth?: number;
    containerHeight: 'full' | 'auto' | 'custom';
    customContainerHeight?: number;
  };
  layoutGroup?: {
    contentWidth: 'fill' | 'custom';
    customContentWidth?: number;
    direction: 'column' | 'row' | 'row-wrap';
    gap: number;
    justifyContent: 'flex-start' | 'center' | 'flex-end';
    alignItems: 'flex-start' | 'center' | 'flex-end';
  };
  spacingGroup?: {
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
  };
  backgroundGroup?: {
    backgroundColor?: string;
    backgroundImage?: string;
  };
  borderGroup?: {
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'none';
    borderTopLeftRadius: number;
    borderTopRightRadius: number;
    borderBottomRightRadius: number;
    borderBottomLeftRadius: number;
  };
  content: any[];
}

// ==================== 产品线专用组件 ====================
export interface ProductLineBlockProps {
  showSidebar?: boolean;
  productsPerRow?: 1 | 2 | 3 | 4;
  __runtime?: {
    productLine: any;
    categoryTree: any[];
    products: any[];
    urlPattern: string;
    locale: string;
    currentSlug?: string;
    currentSeriesId?: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ===== 工业产品线组件（折叠表格） =====
export interface IndustrialProductLineBlockProps {
  showSidebar?: boolean;
  __runtime?: {
    productLine: {
      id: string;
      name: string;
      slug: string;
      seoTitle?: string;
    };
    categories: CategoryNode[];
    products: Product[];
    currentSlug?: string;
    locale: string;
    urlPattern: string;
  };
}

// ==================== 产品分类专用组件 ====================
export interface ProductCollectionsBlockProps {
  productsPerRow?: 1 | 2 | 3 | 4;
  __runtime?: {
    entityType: 'collection';
    collection: any;
    products: any[];
    urlPattern: string;
    locale: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 产品详情页专用组件 ====================
export interface ProductDetailsBlockProps {
  layout?: 'left-right' | 'top-bottom';
  imageSize?: 'small' | 'medium' | 'large';
  __runtime?: {
    product: any;
    locale: string;
    urlPattern: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 产品展示组件 ====================
export interface ShowcaseProduct {
  productId: string;
  productName: string;
  sku: string;
  mainImage: string;
  price?: number;
}

export interface ProductShowcaseBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };

  layoutGroup: {
    columns: 2 | 3 | 4;
    gap: number;
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
  };

  nameGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
  };

  skuGroup: {
    skuColor: string;
    skuFontSize: number;
    skuVisible: boolean;
  };

  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };

  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  // ✅ 用对象一次性保存 ids + locale
  productSelection: {
    ids: string[];
    locale: string;
  };

  linkPattern: string;
  openInNewTab: boolean;
  // ✅ 运行时字段（由 TemplateRenderer 注入）
  locale?: string;
  __runtime?: { locale?: string };
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

// ==================== 产品轮播组件 ====================
export interface ProductCarouselBlockProps {
  // ✅ 复用 Showcase 的数据结构
  productSelection: {
    ids: string[];
    locale: string;
  };

  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  // 标题
  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };

  // 轮播配置
  carouselGroup: {
    slidesPerView: 1 | 2 | 3 | 4;
    slidesPerViewMobile: 1 | 2;
    gap: number;
    loop: boolean;
    autoplay: boolean;
    autoplayInterval: number;
    pauseOnHover: boolean;
    showArrows: boolean;
    arrowColor: string;
    arrowBgColor: string;
    arrowPosition: 'inside' | 'outside' | 'overlay';
    showDots: boolean;
    dotColor: string;
    dotActiveColor: string;
    draggable: boolean;
  };

  // 卡片样式
  layoutGroup: {
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
  };

  nameGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
  };

  skuGroup: {
    skuColor: string;
    skuFontSize: number;
    skuVisible: boolean;
  };

  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };

  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  // 运行时字段
  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

// ==================== 产品榜单组件 ====================
export interface ProductRankingBlockProps {
  productSelection: {
    ids: string[];
    locale: string;
  };

  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };

  rankingGroup: {
    columns: 1 | 2;
    gap: number;
    showRanking: boolean;
    rankingStyle: 'number' | 'medal' | 'both';
    rankingNumberColor: string;
    rankingNumberBgColor: string;
    rankingNumberSize: number;
    medalGoldColor: string;
    medalSilverColor: string;
    medalBronzeColor: string;
    cardLayout: 'horizontal' | 'vertical';
    imageWidth: number;
    imageAspectRatio: '1:1' | '4:3' | '16:9';
    linkPattern: string;
  };

  layoutGroup: {
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
  };

  nameGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
  };

  skuGroup: {
    skuColor: string;
    skuFontSize: number;
    skuVisible: boolean;
  };

  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };

  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };
  linkPattern: string;
  openInNewTab?: boolean; 

  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

// ==================== 产品分类组件 ====================
export interface ProductCategoriesBlockProps {
  categorySelection: {
    ids: string[];
    locale: string;
  };

  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };

  layoutGroup: {
    columns: 2 | 3 | 4;
    gap: number;
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
  };

  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };

  textGroup: {
    nameColor: string;
    nameFontSize: number;
    nameAlign: 'left' | 'center';
    descColor: string;
    descFontSize: number;
    descVisible: boolean;
    showArrow: boolean;
    arrowColor: string;
  };

  linkPattern: string;

  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

// ==================== 文档库专用组件 ====================
export interface DocumentLibraryBlockProps {
  showTree?: boolean;
  __runtime?: {
    tree: any[];
    initialDoc: any;
    locale: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 博客组件 ====================
export interface BlogBlockProps {
  showSidebar?: boolean;
  postsPerRow?: 1 | 2 | 3;
  __runtime?: {
    entityType: 'blog';
    categories: { slug: string; name: string }[];
    posts: any[];
    currentCategorySlug: string | null;
    locale: string;
    basePath: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 博客合集组件 ====================
export interface BlogCollectionBlockProps {
  showSidebar?: boolean;
  postsPerRow?: 1 | 2 | 3;
  __runtime?: {
    entityType: 'blogCollection';
    category: { id: string; slug: string; name: string };
    posts: any[];
    locale: string;
    basePath: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 博客文章组件 ====================
export interface ShowcaseBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  author: string;
  updatedAt: string;
}

export interface BlogPostsBlockProps {
  // ✅ 文章选择
  blogSelection: {
    ids: string[];
    locale: string;
  };

  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  // 标题
  titleGroup: {
    title: string;
    subtitle: string;
    titleColor: string;
    titleFontSize: number;
    subtitleColor: string;
    subtitleFontSize: number;
    titleAlign: 'left' | 'center' | 'right';
  };

  // 布局
  layoutGroup: {
    columns: 2 | 3 | 4;
    gap: number;
    cardRadius: number;
    cardBgColor: string;
    cardBorderColor: string;
    cardHoverShadow: boolean;
    cardHoverLift: boolean;
    cardLayout: 'vertical' | 'horizontal';   // 竖排/横排
    imageWidth: number;                       // 横排时图片宽度
  };

  // 图片
  imageGroup: {
    aspectRatio: '1:1' | '4:3' | '16:9';
    objectFit: 'cover' | 'contain';
    hoverZoom: boolean;
  };

  // 文本
  textGroup: {
    titleColor: string;
    titleFontSize: number;
    excerptColor: string;
    excerptFontSize: number;
    dateColor: string;
    dateFontSize: number;
    excerptLines: 1 | 2 | 3;                 // 摘要行数
    dateVisible: boolean;
    dateFormat: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'relative';
  };

  // 跳转
  linkPattern: string;
  openInNewTab: boolean;

  // 动画
  animationGroup: {
    enabled: boolean;
    duration: number;
    delayStep: number;
  };

  // 填充
  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  // 运行时
  locale?: string;
  __runtime?: { locale?: string };
  puck?: any;
}

// ==================== 视频分类组件 ====================
export interface VideoCategoryBlockProps {
  showSidebar?: boolean;
  videosPerRow?: 1 | 2 | 3 | 4;
  __runtime?: {
    entityType: 'video';
    categories: { key: string; name: string }[];
    videos: any[];
    currentCategoryKey: string | null;
    locale: string;
    basePath: string;
  };
}

// ==================== 询盘组件 ====================
export interface InquiryBlockProps {
  __runtime?: any;
  puck?: any;
}

// ==================== 全屏通栏幻灯片组件 ====================
export interface FullwidthSlideItem {
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  contentPosition:
    | 'top-left' | 'top-center' | 'top-right'
    | 'center-left' | 'center-center' | 'center-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';
  desktopAlign: 'left' | 'center' | 'right';
  mobileAlign: 'left' | 'center' | 'right';
  titleFontSize: number;
  titleColor: string;
  subtitleFontSize: number;
  subtitleColor: string;
}

export interface FullwidthSliderProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
  height: number;
  autoplay: 'none' | '5s' | '10s';
  images: FullwidthSlideItem[];
}

// 保留原有 SlideItem 用于 WidthSlider（多语言）
export interface SlideItem {
  imageUrl: string;
  title: { zh: string; en: string; textId: string };
  subtitle: { zh: string; en: string; textId: string };
  buttonText: { zh: string; en: string; textId: string };
  buttonLink: string;
  contentPosition:
    | 'top-left' | 'top-center' | 'top-right'
    | 'center-left' | 'center-center' | 'center-right'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';
  desktopAlign: 'left' | 'center' | 'right';
  mobileAlign: 'left' | 'center' | 'right';
  titleFontSize: number;
  titleColor: string;
  subtitleFontSize: number;
  subtitleColor: string;
}

// ✅ 只保留一处 WidthSliderProps 定义
export interface WidthSliderProps {
  height: '550' | '650';
  autoplay: 'none' | '5s' | '10s';
  images: SlideItem[];
}

// ==================== 卡片价格组件 ====================
export interface PricingCard {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  rightsTitle: string;
  rights: string[];
  price: string;
  priceFontSize: number;
  priceColor: string;
  buttonText: string;
  buttonLink: string;
  buttonVisible: boolean;
  buttonColor: string;
  isRecommended: boolean;
  contactText: string;
  contactLink: string;
}

export interface PricingBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardHoverBorderColor: string;
  recommendedBorderColor: string;
  recommendedBgColor: string;
  titleColor: string;
  titleFontSize: number;
  descColor: string;
  descFontSize: number;
  rightsTitleColor: string;
  rightsTitleFontSize: number;
  rightsTextColor: string;
  rightsTextFontSize: number;
  checkIconColor: string;
  columns: 2 | 3 | 4;
  cardGap: number;
  headerImageUrl: string;
  headerImageHeight: number;
  headerOverlayColor: string;
  headerTitle: string;
  headerTitleColor: string;
  headerTitleFontSize: number;
  headerSubtitle: string;
  headerSubtitleColor: string;
  headerSubtitleFontSize: number;
  paddingTop: number;
  paddingBottom: number;
  cards: PricingCard[];
}

// ==================== 详细对比表格组件 ====================
export interface ComparisonRow {
  id: string;
  label: string;
  values: string[];
}

export interface ComparisonGroup {
  id: string;
  title: string;
  rows: ComparisonRow[];
}

export interface ComparisonTableBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  columns: 2 | 3 | 4;
  columnTitles: string[];
  groups: ComparisonGroup[];
  headerBgColor: string;
  headerTextColor: string;
  groupBgColor: string;
  groupTextColor: string;
  rowBgColor: string;
  rowAltBgColor: string;
  rowTextColor: string;
  borderColor: string;
  checkIconColor: string;
  crossIconColor: string;
  cellFontSize: number;
  labelFontSize: number;
  labelColumnWidth: number;
  tableTitle: string;
  tableTitleColor: string;
  tableTitleFontSize: number;
  tableTitleAlign: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom: number;
}

// ==================== 标签图文切换组件 ====================
export interface TabContentItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
}

export interface TabItem {
  id: string;
  label: string;
  items: TabContentItem[];
  primaryButtonText: string;
  primaryButtonLink: string;
  outlineButtonText: string;
  outlineButtonLink: string;
  imageUrl: string;
  floatingIcons: any[];
}

export interface TabbedContentBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;

  tabGroup: {
    tabTextColor: string;
    tabActiveColor: string;
    tabActiveBorderColor: string;
    tabFontSize: number;
    tabAlign: 'left' | 'center' | 'right';
    tabBgColor: string;
    tabActiveBgColor: string;
    tabBorderRadius: number;
    tabPaddingX: number;
    tabPaddingY: number;
    tabBorderColor: string;
    tabActiveBorderColorValue: string;
    tabShowBorder: boolean;
  };

  contentGroup: {
    itemTitleColor: string;
    itemTitleFontSize: number;
    itemDescColor: string;
    itemDescFontSize: number;
    itemGap: number;
  };

  buttonGroup: {
    primaryButtonColor: string;
    primaryButtonTextColor: string;
    outlineButtonColor: string;
    buttonFontSize: number;
    buttonPaddingX: number;
    buttonPaddingY: number;
    buttonBorderRadius: number;
  };

  imageGroup: {
    imageWidth: 'small' | 'medium' | 'large';
    imageRadius: number;
    showFloatingIcons: boolean;
    floatingIconWidth: number;
    imageHoverZoom: boolean;
  };

  layoutGroup: {
    contentPosition: 'left' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
  };

  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  spacingGroup: {
    mobileScaleFactor: number;
  };

  tabs: TabItem[];
}

// ==================== 所有组件联合类型 ====================
export type Components = {
  Heading: HeadingProps;
  Paragraph: ParagraphProps;

  BlankBlock: BlankBlockProps;
  Section: SectionProps;
  ProductLineBlock: ProductLineBlockProps;
  IndustrialProductLineBlock: IndustrialProductLineBlockProps;
  ProductCollectionsBlock: ProductCollectionsBlockProps;
  ProductDetailsBlock: ProductDetailsBlockProps;
  DocumentLibraryBlock: DocumentLibraryBlockProps;
  BlogBlock: BlogBlockProps;
  BlogCollectionBlock: BlogCollectionBlockProps;
  VideoCategoryBlock: VideoCategoryBlockProps;
  FullwidthSlider: FullwidthSliderProps;
  WidthSlider: WidthSliderProps;
  Button: ButtonProps;
  List: ListProps;
  DividingLine: DividingLineProps;
  ImageBanner: ImageBannerProps;
  Richtext: RichtextProps;
  Video: VideoProps;
  Multicolumn: MulticolumnProps;
  Accordion: AccordionProps;
  PicwithText: PicwithTextProps;
  Collapsible: CollapsibleProps;
  Multirow: MultirowProps;
  InquiryBlock: InquiryBlockProps;
  PricingBlock: PricingBlockProps;
  ComparisonTableBlock: ComparisonTableBlockProps;
  TabbedContentBlock: TabbedContentBlockProps;
  ProductShowcaseBlock: ProductShowcaseBlockProps;
  ProductRankingBlock: ProductRankingBlockProps;
  ProductCategoriesBlock: ProductCategoriesBlockProps;
  BlogPostsBlock: BlogPostsBlockProps;
};