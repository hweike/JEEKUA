// lib/webbuilder/alt-suffix-config.ts

/**
 * Alt 后缀配置
 * 按语言分组，便于前端一次性加载当前语言的所有配置并缓存。
 * 至少配置中文（zh）和英文（en），其他语言按需添加。
 * 如果某语言未配置，getAltSuffix 会回退到英文（en），再回退到中文（zh）。
 *
 * 结构：语言 -> 实体类型 -> 后缀字符串
 */
export const ALT_SUFFIX_CONFIG: Record<string, Record<string, string>> = {
  // ===== 中文（必填） =====
  zh: {
    // ---- WebBuilder 组件 ----
    ImageBanner: '图片横幅',
    Video: '视频',
    Heading: '标题',
    Paragraph: '段落',
    Button: '按钮',
    List: '列表',
    DividingLine: '分割线',
    Table: '表格',
    PicwithText: '图文并排',
    Multicolumn: '多列',
    Multirow: '多行',
    Collapsible: '可折叠',
    Accordion: '手风琴',
    Richtext: '富文本',
    FullwidthSlider: '全屏幻灯片',
    WidthSlider: '宽度限定幻灯片',
    // ---- 页面实体 ----
    product: '产品图片',
    product_category: '产品分类封面',
    blog: '博客封面',
    blog_post: '博客文章封面',
    video: '视频封面',
    video_category: '视频分类封面',
    document: '文档封面',
    document_library: '文档库封面',
    product_line: '产品线封面',
  },

  // ===== 英文（必填，作为回退语言） =====
  en: {
    ImageBanner: 'Image Banner',
    Video: 'Video',
    Heading: 'Heading',
    Paragraph: 'Paragraph',
    Button: 'Button',
    List: 'List',
    DividingLine: 'Dividing Line',
    Table: 'Table',
    PicwithText: 'Image with Text',
    Multicolumn: 'Multiple Columns',
    Multirow: 'Multiple Rows',
    Collapsible: 'Collapsible',
    Accordion: 'Accordion',
    Richtext: 'Rich Text',
    FullwidthSlider: 'Fullwidth Slider',
    WidthSlider: 'Width-limited Slider',
    product: 'Product Image',
    product_category: 'Category Cover',
    blog: 'Blog Cover',
    blog_post: 'Blog Post Cover',
    video: 'Video Cover',
    video_category: 'Video Category Cover',
    document: 'Document Cover',
    document_library: 'Document Library Cover',
    product_line: 'Product Line Cover',
  },

  // ===== 其他语言（按需添加） =====
  es: {
    ImageBanner: 'Banner de imagen',
    Video: 'Video',
    Heading: 'Título',
    Paragraph: 'Párrafo',
    Button: 'Botón',
    List: 'Lista',
    DividingLine: 'Línea divisoria',
    Table: 'Tabla',
    PicwithText: 'Imagen con texto',
    Multicolumn: 'Múltiples columnas',
    Multirow: 'Múltiples filas',
    Collapsible: 'Plegable',
    Accordion: 'Acordeón',
    Richtext: 'Texto enriquecido',
    FullwidthSlider: 'Slider de ancho completo',
    WidthSlider: 'Slider de ancho limitado',
    product: 'Imagen del producto',
    product_category: 'Portada de categoría',
    blog: 'Portada del blog',
    blog_post: 'Portada del artículo',
    video: 'Portada del video',
    video_category: 'Portada de categoría de video',
    document: 'Portada del documento',
    document_library: 'Portada de la biblioteca de documentos',
    product_line: 'Portada de línea de productos',
  },
  fr: {
    ImageBanner: 'Bannière d\'image',
    Video: 'Vidéo',
    Heading: 'Titre',
    Paragraph: 'Paragraphe',
    Button: 'Bouton',
    List: 'Liste',
    DividingLine: 'Ligne de séparation',
    Table: 'Tableau',
    PicwithText: 'Image avec texte',
    Multicolumn: 'Colonnes multiples',
    Multirow: 'Lignes multiples',
    Collapsible: 'Pliable',
    Accordion: 'Accordéon',
    Richtext: 'Texte enrichi',
    FullwidthSlider: 'Slider pleine largeur',
    WidthSlider: 'Slider à largeur limitée',
    product: 'Image du produit',
    product_category: 'Couverture de catégorie',
    blog: 'Couverture du blog',
    blog_post: 'Couverture de l\'article',
    video: 'Couverture vidéo',
    video_category: 'Couverture de catégorie vidéo',
    document: 'Couverture du document',
    document_library: 'Couverture de la bibliothèque de documents',
    product_line: 'Couverture de la gamme de produits',
  },
  de: {
    ImageBanner: 'Bildbanner',
    Video: 'Video',
    Heading: 'Überschrift',
    Paragraph: 'Absatz',
    Button: 'Button',
    List: 'Liste',
    DividingLine: 'Trennlinie',
    Table: 'Tabelle',
    PicwithText: 'Bild mit Text',
    Multicolumn: 'Mehrere Spalten',
    Multirow: 'Mehrere Zeilen',
    Collapsible: 'Aufklappbar',
    Accordion: 'Akkordeon',
    Richtext: 'Rich Text',
    FullwidthSlider: 'Vollbreiten-Slider',
    WidthSlider: 'Breitenbegrenzter Slider',
    product: 'Produktbild',
    product_category: 'Kategorie-Cover',
    blog: 'Blog-Cover',
    blog_post: 'Blogbeitrag-Cover',
    video: 'Video-Cover',
    video_category: 'Video-Kategorie-Cover',
    document: 'Dokument-Cover',
    document_library: 'Dokumentenbibliothek-Cover',
    product_line: 'Produktlinien-Cover',
  },
  ja: {
    ImageBanner: '画像バナー',
    Video: 'ビデオ',
    Heading: '見出し',
    Paragraph: '段落',
    Button: 'ボタン',
    List: 'リスト',
    DividingLine: '区切り線',
    Table: 'テーブル',
    PicwithText: '画像とテキスト',
    Multicolumn: 'マルチカラム',
    Multirow: 'マルチロウ',
    Collapsible: '折りたたみ可能',
    Accordion: 'アコーディオン',
    Richtext: 'リッチテキスト',
    FullwidthSlider: 'フルワイドスライダー',
    WidthSlider: '幅制限スライダー',
    product: '製品画像',
    product_category: 'カテゴリーカバー',
    blog: 'ブログカバー',
    blog_post: 'ブログ記事カバー',
    video: 'ビデオカバー',
    video_category: 'ビデオカテゴリーカバー',
    document: 'ドキュメントカバー',
    document_library: 'ドキュメントライブラリカバー',
    product_line: '製品ラインカバー',
  },
};

/**
 * 获取指定实体类型和语言的 Alt 后缀
 * 回退策略：指定语言 > 英文（en） > 中文（zh） > 实体类型本身
 */
export function getAltSuffix(entityType: string, locale: string = 'zh'): string {
  // 1. 尝试指定语言
  const langMap = ALT_SUFFIX_CONFIG[locale];
  if (langMap && langMap[entityType]) {
    return langMap[entityType];
  }

  // 2. 回退到英文（en）
  const enMap = ALT_SUFFIX_CONFIG['en'];
  if (enMap && enMap[entityType]) {
    return enMap[entityType];
  }

  // 3. 回退到中文（zh）
  const zhMap = ALT_SUFFIX_CONFIG['zh'];
  if (zhMap && zhMap[entityType]) {
    return zhMap[entityType];
  }

  // 4. 最终回退：使用实体类型本身
  return entityType;
}