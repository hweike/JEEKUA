// lib/utils/clientSlug.ts
// 客户端专用 slug 工具（不依赖任何 Node 模块）
//
// 职责：slug 唯一性检查
// - 生成逻辑由 SeoFields 组件内部的 generateSlugFromText 负责（支持中文转拼音）
// - 本文件只负责判断 slug 是否已存在，以及生成唯一的替代值

/**
 * 同步版本：确保 slug 唯一（添加数字后缀）
 *
 * @param baseSlug 基础 slug（如 "about-us"）
 * @param existingSlugs 当前语言下已存在的 slug 列表
 * @returns 唯一的 slug（如 "about-us-1"）
 *
 * 示例：
 *   ensureUniqueSlug("about-us", ["about-us", "contact"])
 *   → "about-us-1"
 *
 *   ensureUniqueSlug("about-us", ["about-us", "about-us-1"])
 *   → "about-us-2"
 *
 *   ensureUniqueSlug("about-us", ["contact"])
 *   → "about-us"（不冲突，返回原值）
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

/**
 * 异步版本：确保 slug 唯一（自动从 API 获取已存在列表）
 *
 * @param baseSlug 基础 slug（如 "about-us"）
 * @param locale 当前语言（如 "zh"、"en"）
 * @param excludePageId 排除的页面 ID（编辑模式下排除自身，避免自己和自己冲突）
 * @returns 唯一的 slug
 *
 * 示例：
 *   const uniqueSlug = await ensureUniqueSlugAsync('about-us', 'zh');
 *   // 如果 about-us 已存在，返回 about-us-1
 *   // 如果 about-us-1 也存在，返回 about-us-2
 *
 *   // 编辑模式：排除自身
 *   const uniqueSlug = await ensureUniqueSlugAsync('about-us', 'zh', '69687106');
 *   // 如果 about-us 是当前页面自己的 slug，返回 about-us（不冲突）
 *
 * 失败降级：
 *   API 请求失败时，返回原始 slug，不阻塞用户操作
 */
export async function ensureUniqueSlugAsync(
  baseSlug: string,
  locale: string,
  excludePageId?: string
): Promise<string> {
  if (!baseSlug || !baseSlug.trim()) {
    return '';
  }

  try {
    // 1. 从 API 获取当前语言下所有已存在的 slug
    const res = await fetch(
      `/api/admin/pages/slugs?locale=${encodeURIComponent(locale)}`
    );

    if (!res.ok) {
      console.warn(
        `[ensureUniqueSlugAsync] 获取 slug 列表失败 (HTTP ${res.status})，使用原始 slug`
      );
      return baseSlug;
    }

    const data = await res.json();
    let existingSlugs: string[] = [];

    // 2. 优先使用 pages（带 id），可以排除自身
    if (Array.isArray(data.pages)) {
      existingSlugs = data.pages
        .filter((p: any) => !excludePageId || p.id !== excludePageId)
        .map((p: any) => p.slug)
        .filter(Boolean);
    } else if (Array.isArray(data.slugs)) {
      // 3. 回退：旧 API，无法排除自身
      existingSlugs = data.slugs;
      if (excludePageId) {
        console.warn(
          '[ensureUniqueSlugAsync] API 未返回 pageId，无法排除自身，可能误判为占用'
        );
      }
    }

    // 4. 调用同步版本判断唯一性
    const uniqueSlug = ensureUniqueSlug(baseSlug, existingSlugs);
    return uniqueSlug;
  } catch (err) {
    console.warn('[ensureUniqueSlugAsync] 异常，使用原始 slug:', err);
    return baseSlug;
  }
}

// ============================================================
// 默认导出（兼容旧代码）
// ============================================================
// 如果旧代码中有 `import clientSlug from '@/lib/utils/clientSlug'`，
// 保留以下默认导出。如果没有旧代码引用，可以删除。
export default {
  ensureUniqueSlug,
  ensureUniqueSlugAsync,
};