// lib/utils/clientSlug.ts
// 客户端专用 slug 工具（不依赖任何 Node 模块）
//
// 职责：slug 唯一性检查
// - 生成逻辑由 SeoFields 组件内部的 generateSlugFromText 负责（支持中文转拼音）
// - 本文件只负责判断 slug 是否已存在，以及生成唯一的替代值

// ============================================================
// 类型定义
// ============================================================

export interface EnsureUniqueSlugOptions {
  /** API 端点（默认 '/api/admin/pages/slugs'） */
  endpoint?: string;
  /** 排除的 ID（编辑模式下排除自身） */
  excludeId?: string;
  /** 响应数据字段名（默认 'pages'） */
  dataKey?: string;
  /** 数据项中 ID 字段名（默认 'id'） */
  idKey?: string;
  /** ✅ 数据项中 slug 字段名（默认 'slug'） */
  slugKey?: string;
}

// ============================================================
// 同步版本：确保 slug 唯一（添加数字后缀）
// ============================================================

/**
 * 同步版本：确保 slug 唯一（添加数字后缀）
 *
 * @param baseSlug 基础 slug（如 "about-us"）
 * @param existingSlugs 当前语言下已存在的 slug 列表
 * @returns 唯一的 slug（如 "about-us-1"）
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!baseSlug) return '';
  if (!existingSlugs || existingSlugs.length === 0) return baseSlug;

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let slug = baseSlug;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// ============================================================
// 异步版本：确保 slug 唯一（自动从 API 获取已存在列表）
// ============================================================

/**
 * 异步版本：确保 slug 唯一（自动从 API 获取已存在列表）
 *
 * ✅ 兼容两种调用方式：
 *
 *   1. 旧调用（字符串）：
 *      ensureUniqueSlugAsync('about-us', 'zh', 'page-id-123')
 *      → 等价于 { excludeId: 'page-id-123' }
 *
 *   2. 新调用（对象）：
 *      ensureUniqueSlugAsync('about-us', 'zh', {
 *        endpoint: '/api/admin/products/slugs',
 *        excludeId: 'product-id-456',
 *        idKey: 'productId',
 *        slugKey: 'slug',
 *      })
 *
 * @param baseSlug 基础 slug
 * @param locale 当前语言（如 'zh'、'en'）
 * @param optionsOrExcludeId 配置对象或（兼容旧版）排除的 ID
 * @returns 唯一的 slug
 *
 * 失败降级：
 *   API 请求失败时，返回原始 slug，不阻塞用户操作
 */
export async function ensureUniqueSlugAsync(
  baseSlug: string,
  locale: string,
  optionsOrExcludeId?: string | EnsureUniqueSlugOptions
): Promise<string> {
  if (!baseSlug || !baseSlug.trim()) {
    return '';
  }

  // ✅ 兼容旧调用：字符串 → { excludeId: 字符串 }
  const options: EnsureUniqueSlugOptions =
    typeof optionsOrExcludeId === 'string'
      ? { excludeId: optionsOrExcludeId }
      : optionsOrExcludeId || {};

  const {
    endpoint = '/api/admin/pages/slugs',
    excludeId,
    dataKey = 'pages',
    idKey = 'id',
    slugKey = 'slug', // ✅ 新增
  } = options;

  try {
    // ✅ 不传 excludeId 到 URL（后端不支持，纯前端 filter）
    const url = `${endpoint}?locale=${encodeURIComponent(locale)}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.warn(
        `[ensureUniqueSlugAsync] 获取 slug 列表失败 (HTTP ${res.status})，使用原始 slug`
      );
      return baseSlug;
    }

    const data = await res.json();
    let existingSlugs: string[] = [];

    // ✅ 优先使用完整数据（带 id），可以排除自身
    if (Array.isArray(data[dataKey])) {
      existingSlugs = data[dataKey]
        .filter((item: any) => {
          // 字符串项无法排除自身，直接保留
          if (typeof item === 'string') return true;
          return !excludeId || item[idKey] !== excludeId;
        })
        .map((item: any) => {
          // ✅ 兼容字符串项和对象项
          if (typeof item === 'string') return item;
          return item[slugKey];
        })
        .filter(Boolean);
    } else if (Array.isArray(data.slugs)) {
      // 回退：只有 slug 数组，无法排除自身
      existingSlugs = data.slugs;
      if (excludeId) {
        console.warn(
          '[ensureUniqueSlugAsync] API 未返回完整数据，无法排除自身，可能误判为占用'
        );
      }
    } else {
      // ✅ 新增：静默失败保护
      console.warn(
        `[ensureUniqueSlugAsync] 响应中未找到数组字段 "${dataKey}" 或 "slugs"，按无冲突处理`
      );
    }

    // 调用同步版本判断唯一性
    return ensureUniqueSlug(baseSlug, existingSlugs);
  } catch (err) {
    console.warn('[ensureUniqueSlugAsync] 异常，使用原始 slug:', err);
    return baseSlug;
  }
}

// ============================================================
// 兼容旧代码：generateClientSlug（生成基础 slug）
// ============================================================

/**
 * 生成客户端 slug（兼容旧代码）
 *
 * 注意：
 *   本函数不做中文转拼音，调用方应先通过 toPinyin 转换。
 *   SeoFields 组件内部有自己的 generateSlugFromText（支持中文转拼音）。
 *
 * @param title 要转换的文本
 * @returns URL 友好的 slug
 */
export function generateClientSlug(title: string): string {
  if (!title) return 'page';
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
}

// ============================================================
// 默认导出（兼容旧代码）
// ============================================================
export default {
  ensureUniqueSlug,
  ensureUniqueSlugAsync,
  generateClientSlug,
};