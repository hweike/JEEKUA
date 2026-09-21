// lib/theme/get-base-defaults.ts
import fs from 'fs/promises';
import path from 'path';
import { cache } from 'react';

/**
 * 从 base.css 提取定义类变量的默认值
 *
 * - 服务端运行
 * - 使用 React.cache 缓存（同一次请求内只解析一次）
 * - ✅ 新增模块级缓存（跨请求共享，1 小时过期）
 * - 只提取白名单中的变量（排除颜色）
 */

// ============================================================
// ✅ 模块级缓存（跨请求共享）
// ============================================================
let cachedDefaults: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 小时

const EXTRACT_PREFIXES = [
  // 字体
  'font-sans',
  'font-serif',
  'font-mono',
  // 字号
  'font-size-',
  // 字重
  'font-weight-',
  // 行高
  'line-height-',
  // 字间距
  'letter-spacing-',
  // 间距
  'spacing',
  'container-padding',
  'section-gap',
  'grid-gap',
  'product-card-padding',
  // 圆角
  'radius',
  'product-card-radius',
  'btn-radius',
  'input-radius',
  // 阴影
  'shadow-',
  'product-card-shadow',
  'dropdown-shadow',
  'btn-shadow',
  // 动效
  'transition-',
];

function shouldExtract(key: string): boolean {
  return EXTRACT_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(prefix)
  );
}

/**
 * 解析 base.css 的 :root 块，返回定义类变量默认值
 */
async function parseBaseCss(): Promise<Record<string, string>> {
  // ✅ 模块级缓存检查
  if (cachedDefaults && Date.now() - cacheTimestamp < CACHE_TTL) {
    console.log('[getBaseCssDefaults] ✅ 使用模块级缓存');
    return cachedDefaults;
  }

  try {
    const baseCssPath = path.join(process.cwd(), 'app/styles/base.css');
    const content = await fs.readFile(baseCssPath, 'utf8');

    // 匹配 :root { ... }（非贪婪，匹配第一个 :root 块）
    const rootMatch = content.match(/:root\s*\{([\s\S]*?)\n\s*\}/);
    if (!rootMatch) {
      console.warn('[getBaseCssDefaults] 未找到 :root 块');
      return {};
    }

    const rootBlock = rootMatch[1];
    const defaults: Record<string, string> = {};

    // 匹配所有 --key: value;（支持多行值，但不支持嵌套）
    const varRegex = /--([\w-]+):\s*([^;]+);/g;
    let match;

    while ((match = varRegex.exec(rootBlock)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();

      // 只提取白名单中的变量
      if (shouldExtract(key)) {
        defaults[key] = value;
      }
    }

    console.log(
      `[getBaseCssDefaults] 解析完成，提取 ${Object.keys(defaults).length} 个变量`
    );

    // ✅ 填充模块级缓存
    cachedDefaults = defaults;
    cacheTimestamp = Date.now();

    return defaults;
  } catch (error) {
    console.error('[getBaseCssDefaults] 解析失败:', error);
    return {};
  }
}

/**
 * 获取 base.css 的默认值（带缓存）
 *
 * React.cache 保证同一次请求内只解析一次
 * ✅ 模块级缓存保证跨请求共享，1 小时内不再解析
 */
export const getBaseCssDefaults = cache(parseBaseCss);