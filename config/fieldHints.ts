/**
 * 全局字段提示/占位符配置
 * 支持两种配置格式：
 * 1. 简单字符串：仅作为 hint（tooltip 提示）
 * 2. 对象格式：可分别定义 hint 和 placeholder
 *
 * 使用方式：
 * import { getFieldHint, getFieldPlaceholder, HINT_PATHS } from '@/config/fieldHints';
 *或者
 * import {getFieldHint,getFieldPlaceholder,HINT_PATHS,InfoTooltip} from '@/config/fieldHints';
 * 
 * // 在输入框中使用 placeholder
 * <input placeholder={getFieldPlaceholder('product.basic.name')} />
 *
 * // 在帮助图标中使用 hint
 * <InfoTooltip hintKey="product.basic.name" />
 */


// ==================== 配置定义 ====================
export const fieldHints = {
  // ==================== 公共组件 ====================
  common: {
    seo: {
      slug: {
        hint: '建议 51-100 字符，使用小写字母、数字和连字符（-），避免下划线、空格或特殊字符。',
        placeholder: '默认自动生成,可编辑,例如:iphone-15-pro-max',
      },
      keywords:
      {
        hint: '建议选择1个核心关键词,每个词 1-3 个单词，如果有多个关键词用英文逗号分隔，最重要的关键词排前面。关键词需与页面主题高度相关，避免堆砌。可通过 Google 关键词规划师分析搜索量与竞争度。',
        placeholder: '建议1个核心关键词,多个用英文逗号分隔,例如:iPhone 15 Pro Max,智能手机',
      },

      title:
      {
        hint: '建议 30-60 字符，重要关键词前置。推荐结构：「主要核心关键词 - 次要关键词 | 品牌名」或「产品名称 | 品牌 | 核心卖点」。每个页面的标题应唯一且准确。',
        placeholder: '建议以主要核心关键词开头，例如:iPhone 15 Pro Max | Apple | 256GB 原色钛金属',
      },

        
      description:
      {
        hint: '建议 80-160 字符，用完整通顺的句子概括页面内容，自然包含 1-2 个核心关键词。撰写吸引点击的文案，可加入行动号召（如“立即购买”），不同页面描述应各不相同。',
        placeholder: '建议包括主要核心关键词, 例如:iPhone 15 Pro Max 是 Apple 最新发布的智能手机，配备 A17 Pro 芯片和 256GB 存储空间，提供卓越性能和出色的拍照体验。立即购买，享受前所未有的速度与功能！',
      },
        
    },
    imageUpload: '支持上传 jpg、png、webp 格式，建议尺寸 400x400 像素。',
  },


// ==================== 产品线管理 ====================
  productLine: {
    name: {
        hint: '产品线用于区分不同业务线，如“手机”、“电脑”、“配件”。',
        placeholder: '例如：手机',
    },
    templateId: {
        hint: '选择一个页面模板来定义产品线落地页的外观和功能, 请进入页面管理>网页模板中进行创建和管理页面模板。',
        placeholder: '请选择模板',
    },

    order: '决定产品线在导航栏中的排序顺序。',
  },

  // ==================== 产品分类模块 ====================
  productCategory: {
    basic: {
      name: {
        hint: '分类名称将显示在导航栏和面包屑中，请根据语言站点使用合适的语言（中文站点使用中文，英文站点使用英文）。',
        placeholder: '请根据语言站点使用合适的语言（中文站点使用中文，英文站点使用英文）',
      },
      description:{
        hint: '简单介绍该分类下的产品类型，显示在分类页面顶部，请根据语言站点使用合适的语言（中文站点使用中文，英文站点使用英文）。',
        placeholder: '请根据语言站点使用合适的语言（中文站点使用中文，英文站点使用英文）',
      },

      attributeTemplateId: 
      {
        hint: '可以为不同的产品分类选择不同的产品自定义属性模板，该分类下的所有产品将继承这些自定义属性。请进入产品目录>基本设置>自定义属性模板进行创建和管理属性模板。',
        placeholder: '请选择属性模板，或在基本设置中创建新的模板',
      },
  
      order:
      {
        hint: '数字越小，排序越靠前。',
        placeholder: '请选择数字',
      },
      
      image: {
        hint: '推荐使用1:1比例的图片, 支持透明背景。',
        placeholder: '支持上传本地图片或输入网络图片地址',
      },
      
      templateId: 
      {
        hint: '选择一个页面模板来定义该分类页的外观和功能, 请进入页面管理>网页模板中进行创建和管理页面模板。',
        placeholder: '请选择模板',
      },
      
    
      
    },
    series: {
      name: '二级分类属于一级分类下的子分类，用于细分产品类型。',
    },
  },

  

  // ==================== 产品发布模块 ====================
  product: {
    basic: {
      // 示例：使用对象格式同时定义 hint 和 placeholder
      name: {
        hint: '产品名称应包含品牌、型号和关键规格，便于用户搜索。',
        placeholder: '例如：iPhone 15 Pro Max 256GB 原色钛金属',
      },
      sku: {
        hint: '库存单位编码，必须唯一。',
        placeholder: 'P-10001',
      },
      price: '请输入数字，支持两位小数。', // 纯字符串，仅作为 hint
      stock: '当前库存数量，负数表示缺货。',
      description: '详细描述产品的功能、特点和使用场景。',
    },
    attributes: {
      custom: '您可以为产品添加自定义属性，如“颜色”、“尺寸”等。',
      template: '基于分类的属性模板，不可编辑，仅用于展示。',
    },
    media: {
      mainImage: '主图将显示在产品列表和详情页顶部，建议 800x800 像素。',
      gallery: '可上传多张产品图，建议使用相同比例。',
    },
    seo: {
      // 空对象，自动 fallback 到 common.seo
    },
  },

  // ==================== 博客文章模块 ====================
  blog: {
    basic: {
      title: '文章标题应简洁有力，包含核心关键词。',
      summary: '摘要会显示在博客列表页，建议 100-150 字。',
      content: '支持 Markdown 格式，可插入图片和视频。',
      category: '选择适合的文章分类，帮助读者快速定位。',
      tags: '多个标签用英文逗号分隔，便于关联内容。',
    },
    seo: {
      // 空对象，自动 fallback 到 common.seo
    },
    author: {
      name: '作者名称将显示在文章页底部。',
      bio: '作者简介，会显示在作者专栏中。',
    },
  },
} as const;

// ==================== 内部类型定义 ====================
type FieldValue = string | { hint?: string; placeholder?: string };
type NestedFieldHints = {
  [key: string]: FieldValue | NestedFieldHints;
};

// 递归提取所有叶子路径（指向 string 或 { hint, placeholder }）
type PathsToLeaf<T> = T extends FieldValue
  ? '' // 叶子节点
  : {
      [K in keyof T]: T[K] extends FieldValue
        ? `${K & string}`
        : T[K] extends object
        ? `${K & string}${PathsToLeaf<T[K]> extends '' ? '' : `.${PathsToLeaf<T[K]>}`}`
        : never;
    }[keyof T];

export type FieldHintPath = PathsToLeaf<typeof fieldHints>;

// ==================== 自动生成路径常量（替代手动维护） ====================
type PathsObject<T> = T extends FieldValue
  ? string
  : { [K in keyof T]: PathsObject<T[K]> };

function buildPaths(obj: any, prefix = ''): any {
  const result: any = {};
  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === 'string' || (typeof value === 'object' && (value.hint !== undefined || value.placeholder !== undefined))) {
      // 叶子节点
      result[key] = fullPath;
    } else if (value && typeof value === 'object') {
      result[key] = buildPaths(value, fullPath);
    }
  }
  return result;
}

export const HINT_PATHS = buildPaths(fieldHints) as PathsObject<typeof fieldHints>;

// ==================== 缓存构建（扁平化 Map + fallback） ====================
// 扁平化存储：路径 -> 原始值（string 或 { hint, placeholder }）
const rawCache = new Map<string, FieldValue>();

function collectRaw(obj: any, currentPath: string) {
  for (const key in obj) {
    const value = obj[key];
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    if (typeof value === 'string' || (typeof value === 'object' && (value.hint !== undefined || value.placeholder !== undefined))) {
      rawCache.set(newPath, value);
    } else if (value && typeof value === 'object') {
      collectRaw(value, newPath);
    }
  }
}
collectRaw(fieldHints, '');

// fallback 规则：将路径第一段替换为 'common'
function applyFallback(path: string): string {
  const parts = path.split('.');
  if (parts.length >= 2 && parts[0] !== 'common') {
    parts[0] = 'common';
    return parts.join('.');
  }
  return '';
}

// 为所有可能路径（基于 HINT_PATHS 收集）补充 fallback 值
const allPaths = new Set<string>();
function collectPaths(obj: any, prefix = '') {
  for (const key in obj) {
    const full = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    allPaths.add(full);
    if (val && typeof val === 'object' && !(typeof val === 'string' || (val.hint !== undefined || val.placeholder !== undefined))) {
      collectPaths(val, full);
    }
  }
}
collectPaths(fieldHints);

for (const path of allPaths) {
  if (!rawCache.has(path)) {
    const fallbackPath = applyFallback(path);
    const fallbackValue = rawCache.get(fallbackPath);
    if (fallbackValue) {
      rawCache.set(path, fallbackValue);
    }
  }
}

// ==================== 对外查询函数 ====================
function getRaw(path: FieldHintPath): FieldValue | undefined {
  const value = rawCache.get(path);
  if (value === undefined && process.env.NODE_ENV === 'development') {
    console.error(`[fieldHints] 路径未找到: ${path}`);
  }
  return value;
}

/**
 * 获取字段提示文案（tooltip 内容）
 */
export function getFieldHint(path: FieldHintPath): string | undefined {
  const value = getRaw(path);
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value?.hint;
  return undefined;
}

/**
 * 获取字段占位符（placeholder 内容）
 */
export function getFieldPlaceholder(path: FieldHintPath): string | undefined {
  const value = getRaw(path);
  if (typeof value === 'object') return value?.placeholder;
  return undefined;
}

export { default as InfoTooltip } from '@/components/common/InfoTooltip';

// ==================== 国际化预留 ====================
let currentLocale = 'zh';
export function setLocale(locale: string) {
  currentLocale = locale;
  // 未来可在此处重新加载语言包
  console.warn('[fieldHints] 国际化尚未完整实现，当前仅支持中文');
}
export function getLocale() {
  return currentLocale;
}