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
  title: { zh: string; en: string; textId: string };
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link?: string;   // 新增
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  __runtime?: { texts: Record<string, string>; locale: string };
}

export interface ParagraphProps {
  text: { zh: string; en: string; textId: string };
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  link?: string;   // 新增
}

export interface ButtonProps {
  text: { zh: string; en: string; textId: string };
  buttonColor: string;          // 按钮背景色
  textColor: string;            // 文字颜色
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  buttonAlign: 'left' | 'center' | 'right';
  link: string;
  borderRadius: string;         // 例如 '0.375rem' 或 '9999px'
}

export interface ListItem {
  id: string;
  text: { zh: string; en: string; textId: string };
  textColor: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  link: string;
}

export interface ListProps {
  items: ListItem[];
  iconType: 'none' | 'dot' | 'number' | 'star';
}

export interface DividingLineProps {
  lineType: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness: number;
  color: string;
}

export interface TableProps {
  headers: string[];
  rows: string[][];
}

// ==================== 富文本组件 ====================
export interface RichtextProps {
  bannerType: 'standard' | 'fullwidth';
  title: { zh: string; en: string; textId: string };
  titleFontSize: number;
  titleColor: string;
  text: { zh: string; en: string; textId: string };
  textFontSize: number;
  textColor: string;
  button1Text: { zh: string; en: string; textId: string };
  button1Color: string;
  button1Link: string;
  button2Text: { zh: string; en: string; textId: string };
  button2Color: string;
  button2Link: string;
  backgroundColor: string;
  contentPosition: 'left' | 'center' | 'right';
  textAlign: 'left' | 'center' | 'right';  // ✅ 必须有
  containerPaddingTop: number;
  containerPaddingBottom: number;
}

// ==================== 视频组件 ====================
export interface VideoProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  title: { zh: string; en: string; textId: string };
  titleFontSize: number;
  titleColor: string;
  titleAlign: 'left' | 'center' | 'right';
  videoUrl: string;
  videoThumbnail: string;      // 用户自定义封面
  videoDuration?: number;  // 改为可选，运行时注入
  loop: boolean;
  paddingTop: number;
  paddingBottom: number;
  languageSwitcher?: any;  // 新增
}

// ==================== 带图片文本组件 ====================
export interface PicwithTextProps {
  // 通栏类型
  bannerType: 'standard' | 'fullwidth';
  // 通栏背景色
  backgroundColor: string;
  // 图片设置
  imageUrl: string;
  imageHeight: 'auto' | 'small' | 'medium' | 'large';
  imageWidth: 'small' | 'medium' | 'large';
  imagePosition: 'left' | 'right';
  animation: 'none' | 'ambient' | 'zoom';
  // 标题（多语言）
  title: { zh: string; en: string; textId: string };
  titleFontSize: number;
  titleColor: string;
  // 文本（多语言）
  text: { zh: string; en: string; textId: string };
  textFontSize: number;
  textColor: string;
  // 按钮
  buttonText: { zh: string; en: string; textId: string };
  buttonFontSize: number;
  buttonColor: string;
  buttonLink: string;
  // 内容位置（整体垂直对齐）
  contentVertical: 'top' | 'center' | 'bottom';
  // 文本区对齐（标题、文本、按钮的水平对齐）
  textAlign: 'left' | 'center' | 'right';
  // 文本区背景色
  textAreaBackgroundColor: string;
  // 填充
  paddingTop: number;
  paddingBottom: number;
}

// ==================== 图片横幅 ====================
export interface ImageBannerProps {
  bannerType: 'standard' | 'fullwidth';
  // 原有扁平字段（保留，兼容旧数据）
  image1Url?: string;
  image2Url?: string;
  overlayOpacity?: number;
  heightPreset?: 'auto' | 'small' | 'medium' | 'large';
  animation?: 'none' | 'parallax' | 'fixed' | 'scale';
  title?: { zh: string; en: string; textId: string };
  titleFontSize?: number;
  titleColor?: string;
  text?: { zh: string; en: string; textId: string };
  textFontSize?: number;
  textColor?: string;
  button1Text?: { zh: string; en: string; textId: string };
  button1Color?: string;
  button1Link?: string;
  button2Text?: { zh: string; en: string; textId: string };
  button2Color?: string;
  button2Link?: string;
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
    animation: 'none' | 'parallax' | 'fixed' | 'scale';
  };
  contentSettings?: {
    languageSwitcher?: any;
    title: { zh: string; en: string; textId: string };
    titleFontSize: number;
    titleColor: string;
    text: { zh: string; en: string; textId: string };
    textFontSize: number;
    textColor: string;
    button1Text: { zh: string; en: string; textId: string };
    button1Color: string;
    button1Link: string;
    button2Text: { zh: string; en: string; textId: string };
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

// ========== Multicolumn 组件类型 ==========
export interface MulticolumnItem {
  id: string;
  imageUrl: string;
  title: { zh: string; en: string; textId: string };
  description: { zh: string; en: string; textId: string };
  buttonLabel: { zh: string; en: string; textId: string };
  buttonLink: string;
}

export interface MulticolumnProps {
  languageSwitcher?: any; // ✅ 添加
  // 通栏
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  // 全局标题
  globalTitle: { zh: string; en: string; textId: string };
  globalTitleFontSize: number;
  globalTitleColor: string;
  // 图片全局设置
  imageWidth: 'full' | 'half' | 'third';
  imageShape: 'adapt' | 'portrait' | 'square' | 'circle';
  // 按钮全局设置
  buttonFontSize: number;
  buttonColor: string;
  // 布局
  columnsDesktop: number;      // 1-5
  columnsAlign: 'left' | 'center';
  columnsMobile: number;       // 1-2
  mobileCarousel: boolean;
  // 填充
  paddingTop: number;
  paddingBottom: number;
  // 列配色
  columnBgColor: string;
  columnTitleColor: string;
  columnDescColor: string;
  // 动态列数组
  items: MulticolumnItem[];
}

// ========== Multirow 多行组件类型 ==========
export interface MultirowItem {
  id: string;
  imageUrl: string;
  title: { zh: string; en: string; textId: string };
  description: { zh: string; en: string; textId: string };
  linkLabel: { zh: string; en: string; textId: string };
  linkUrl: string;
}

export interface MultirowProps {
  languageSwitcher?: any; // ✅ 添加
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  imageHeight: 'auto' | 'small' | 'medium' | 'large';
  imageWidth: 'small' | 'medium' | 'large';
  imagePlacement: 'alternate-left' | 'alternate-right' | 'left' | 'right';
  columnBgColor: string;
  columnTitleColor: string;
  columnTitleFontSize: number;
  columnDescColor: string;
  columnDescFontSize: number;
  contentVertical: 'top' | 'middle' | 'bottom';
  textAlign: 'left' | 'center' | 'right';
  mobileTextAlign: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom: number;
  items: MultirowItem[];
}

// ========== 可折叠组件类型 ==========
export interface CollapsibleItem {
  id: string;
  title: { zh: string; en: string; textId: string };
  icon: string;
  content: { zh: string; en: string; textId: string };
}

export interface CollapsibleProps {
  languageSwitcher?: any; // ✅ 添加
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  globalTitle: { zh: string; en: string; textId: string };
  globalTitleFontSize: number;
  globalTitleColor: string;
  globalTitleAlign: 'left' | 'center' | 'right';
  imageUrl: string;
  imageRatio: 'adapt' | 'small' | 'large';
  imagePlacement: 'left' | 'right';
  rowTitleColor: string;
  rowTitleFontSize: number;
  rowContentColor: string;
  rowContentFontSize: number;
  containerType: 'none' | 'row' | 'section';
  containerBgColor: string;
  paddingTop: number;
  paddingBottom: number;
  items: CollapsibleItem[];
}

// ========== 手风琴组件类型 ==========
export interface AccordionContentItem {
  id: string;
  imageUrl: string;
  title: { zh: string; en: string; textId: string };
  paragraph: { zh: string; en: string; textId: string };
  link: string;
}

export interface AccordionItem {
  id: string;
  title: { zh: string; en: string; textId: string };
  contents: AccordionContentItem[];
}

export interface AccordionProps {
  languageSwitcher?: any; // ✅ 添加
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  rowTitleColor: string;
  rowTitleFontSize: number;
  rowTitleAlign: 'left' | 'center' | 'right';
  rowHeaderBgColor: string;
  itemsPerRow: number;        // 2-4
  itemsGap: number;           // 10-50px
  contentTitleFontSize: number;
  contentTitleAlign: 'left' | 'center' | 'right';
  contentTextFontSize: number;
  contentTextAlign: 'left' | 'center' | 'right';
  paddingTop: number;
  paddingBottom: number;
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
export interface SlideItem {
  imageUrl: string;
   // 多语言文本字段存储为对象，包含 textId 和各语言文本
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

export interface FullwidthSliderProps {
  height: '550' | '650';
  autoplay: 'none' | '5s' | '10s';
  images: SlideItem[];
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
  Table: TableProps;
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
};