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
  level: 1 | 2 | 3;
  title: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link?: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  spacingGroup: {
    mobileScaleFactor: number;
  };
  // 编辑模式标记（由 Puck 注入）
  puck?: { dragRef: (el: HTMLElement | null) => void; isEditing?: boolean };
}

export interface ParagraphProps {
  text: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  link?: string;
  spacingGroup: {
    mobileScaleFactor: number;
  };
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
   paddingX: number;   // 新增
  paddingY: number;   // 新增
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
  // ❌ animation 字段已移除（组件不再支持 fixed/scale 动效）
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
    // ❌ animation 字段已移除
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
    buttonPaddingX: number;      // ✅ 新增
    buttonPaddingY: number;      // ✅ 新增
    buttonBorderRadius: number;  // ✅ 新增
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
  // 通栏设置
  bannerGroup: {
    bannerType: 'standard' | 'fullwidth';
    backgroundColor: string;
  };

  // 折叠栏设置
  titleGroup: {
    globalTitle: string;
    globalTitleFontSize: number;
    globalTitleColor: string;
    globalTitleAlign: 'left' | 'center' | 'right';
    rowBackgroundColor: string;  // ✅ 新增
  };

  // 图片设置
  imageGroup: {
    imageUrl: string;
    imageRatio: 'adapt' | 'small' | 'large';
    imagePlacement: 'left' | 'right';
  };

  // 内容列表设置
  contentGroup: {
    rowTitleFontSize: number;
    rowTitleColor: string;
    rowContentFontSize: number;
    rowContentColor: string;
  };

  // 内容容器
  containerGroup: {
    containerType: 'none' | 'row' | 'section';
    containerBgColor: string;
  };

  // 填充设置
  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };

  // 间距（内部使用，不暴露）
  spacingGroup: {
    mobileScaleFactor: number;
  };

  // 动态项
  items: CollapsibleItem[];
}

// ========== 手风琴组件类型 ==========
export interface AccordionContentItem {
  id: string;
  imageUrl: string;
  title: string;          // 单语言
  paragraph: string;      // 单语言
  link: string;
}

export interface AccordionItem {
  id: string;
  title: string;          // 单语言
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
  // 设计者可配置的 UI 选项
  showSidebar?: boolean;
  productsPerRow?: 1 | 2 | 3 | 4;
  // 运行时注入的数据（设计者不可见，不会保存到模板）
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

// ==================== 产品分类专用组件 ====================
export interface ProductCollectionsBlockProps {
  // 设计者可配置的属性（可选，如每行产品数）
  productsPerRow?: 1 | 2 | 3 | 4;
  // 运行时注入的数据（由服务端填充）
  __runtime?: {
    entityType: 'collection';
    collection: any;        // 分类对象（包含 id, name, description, slug 等）
    products: any[];
    urlPattern: string;
    locale: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 产品详情页专用组件 ====================
export interface ProductDetailsBlockProps {
  // 设计者可配置的属性（如布局方向、图片比例等，可扩展）
  layout?: 'left-right' | 'top-bottom';    // 布局方向，默认左右
  imageSize?: 'small' | 'medium' | 'large'; // 图片尺寸
  // 运行时注入的数据（由服务端填充）
  __runtime?: {
    product: any;        // 完整的产品数据（包含所有字段）
    locale: string;
    urlPattern: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 文档库专用组件 ====================
export interface DocumentLibraryBlockProps {
  // 设计者可配置的属性（可扩展，如默认显示宽度等）
  showTree?: boolean;          // 是否显示文档树（默认 true）
  __runtime?: {
    tree: any[];               // 文档树结构（包含 id, title, slug, children）
    initialDoc: any;           // 初始文档（根据 URL 匹配，若无则取第一个）
    locale: string;
  };
  puck?: { dragRef: (el: HTMLElement | null) => void };
}

// ==================== 博客组件 ====================
export interface BlogBlockProps {
  // 设计者可配置属性
  showSidebar?: boolean;
  postsPerRow?: 1 | 2 | 3;
  // 运行时注入数据（由服务端填充）
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

// ==================== 全屏通栏幻灯片组件 ====================
// 专用于 FullwidthSlider 的幻灯片项（单语言）
export interface FullwidthSlideItem {
  imageUrl: string;
  title: string;                     // 单语言
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
  bannerType: 'standard' | 'fullwidth';   // 新增
  backgroundColor?: string;      // 新增
  paddingTop?: number;           // 新增
  paddingBottom?: number;        // 新增
  height: number;                         // 改为 number
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

export interface WidthSliderProps {
  height: '550' | '650';
  autoplay: 'none' | '5s' | '10s';
  images: SlideItem[];   // 保持原有多语言 SlideItem
}

// ==================== 非全屏幻灯片组件 ====================
export interface WidthSliderProps {
  height: '550' | '650';
  autoplay: 'none' | '5s' | '10s';
  images: SlideItem[];  // SlideItem 已在 FullwidthSlider 中定义，复用
}

// ==================== 所有组件联合类型 ====================
export type Components = {
  Heading: HeadingProps;
  Paragraph: ParagraphProps;

  BlankBlock: BlankBlockProps;
  Section: SectionProps;
  ProductLineBlock: ProductLineBlockProps;   // 新增
  ProductCollectionsBlock: ProductCollectionsBlockProps;   // 新增
  ProductDetailsBlock: ProductDetailsBlockProps;   // 新增
  DocumentLibraryBlock: DocumentLibraryBlockProps;   // 新增
  BlogBlock: BlogBlockProps;   // 新增
  BlogCollectionBlock: BlogCollectionBlockProps;   // 新增
  VideoCategoryBlock: VideoCategoryBlockProps;   // 新增
  FullwidthSlider: FullwidthSliderProps;   // 新增
  WidthSlider: WidthSliderProps;   // 新增
  Button: ButtonProps;   // 新增
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
};