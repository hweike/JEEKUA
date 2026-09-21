// lib/files/hooks/useSaveWithTransfer.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/files/url';

// ============================================================
// 类型定义
// ============================================================

export interface TransferStats {
  total: number;
  transferred: number;
  failed: number;
}

export interface UseSaveWithTransferOptions {
  /** 并发数，默认 3 */
  concurrency?: number;
  /** 是否显示 Toast 提示，默认 true */
  showToast?: boolean;
  /** 成功提示文案 */
  successMessage?: (stats: TransferStats) => string;
  /** 失败提示文案 */
  failureMessage?: (stats: TransferStats) => string;
  /** 进度提示文案 */
  progressMessage?: (current: number, total: number) => string;
}

export interface UseSaveWithTransferResult {
  /**
   * 保存前处理：转存 HTML 中的远程图片到 R2
   * @param html 原始 HTML
   * @returns 处理后的 HTML（图片已转存）
   */
  prepareContent: (html: string) => Promise<string>;
  /** 是否正在转存 */
  transferring: boolean;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 判断是否为远程图片（需要转存）
 */
function isRemoteImage(src: string): boolean {
  if (!src) return false;

  // 1. 代理 URL：检查 url 参数
  if (src.startsWith('/api/proxy-image?url=')) {
    try {
      const originalUrl = decodeURIComponent(src.split('url=')[1]);
      // 代理的是 R2 图片 → 不转存
      if (originalUrl.includes('/uploads/')) return false;
      // 代理的是远程 URL → 转存
      return originalUrl.startsWith('http://') || originalUrl.startsWith('https://');
    } catch {
      return false;
    }
  }

  // 2. 本地相对路径（R2）→ 不转存
  if (src.startsWith('/uploads/')) return false;

  // 3. 完整 http/https URL → 转存
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return true;
  }

  return false;
}

/**
 * 从代理 URL 提取原始 URL
 */
function extractOriginalUrl(src: string): string | null {
  if (!src) return null;

  if (src.startsWith('/api/proxy-image?url=')) {
    try {
      return decodeURIComponent(src.split('url=')[1]);
    } catch {
      return null;
    }
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  return null;
}

/**
 * 判断 HTML 中是否包含远程图片
 */
function hasRemoteImages(html: string): boolean {
  if (!html || typeof window === 'undefined') return false;

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    return Array.from(images).some((img) => {
      const src = img.getAttribute('src');
      return src ? isRemoteImage(src) : false;
    });
  } catch {
    return false;
  }
}

/**
 * 转存单张远程图片到 R2
 * ✅ 复用 /api/images（支持 URL 下载模式）
 * ✅ 带 15 秒超时保护，避免单张图片卡死整个保存
 */
async function transferSingleImage(originalUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: originalUrl }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[transfer] 转存失败 (${res.status}):`, originalUrl);
      return null;
    }

    const data = await res.json();

    if (!data.url) {
      console.warn(`[transfer] 返回无 url:`, data);
      return null;
    }

    // ✅ 复用 getImageUrl
    const fullUrl = getImageUrl(data.url);
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;

    return proxiedUrl;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`[transfer] 转存超时 (15s):`, originalUrl);
    } else {
      console.error(`[transfer] 转存异常:`, originalUrl, err?.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 批量转存 HTML 中的远程图片
 */
async function transferRemoteImages(
  html: string,
  options?: {
    onProgress?: (current: number, total: number) => void;
    concurrency?: number;
  }
): Promise<{ html: string; stats: TransferStats }> {
  if (!html || typeof window === 'undefined') {
    return { html, stats: { total: 0, transferred: 0, failed: 0 } };
  }

  // 1. 解析 HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));

  // 2. 筛选需要转存的图片
  const imagesToTransfer = images
    .map((img) => {
      const src = img.getAttribute('src');
      if (!src || !isRemoteImage(src)) return null;
      const originalUrl = extractOriginalUrl(src);
      if (!originalUrl) return null;
      return { img, originalUrl };
    })
    .filter((item): item is { img: HTMLImageElement; originalUrl: string } => item !== null);

  const total = imagesToTransfer.length;

  if (total === 0) {
    return { html, stats: { total: 0, transferred: 0, failed: 0 } };
  }

  console.log(`[transfer] 发现 ${total} 张远程图片，开始转存`);

  // 3. 并发控制
  const concurrency = options?.concurrency || 3;
  let transferred = 0;
  let failed = 0;
  let completed = 0;

  for (let i = 0; i < imagesToTransfer.length; i += concurrency) {
    const batch = imagesToTransfer.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async ({ img, originalUrl }) => {
        const newSrc = await transferSingleImage(originalUrl);
        if (newSrc) {
          img.setAttribute('src', newSrc);
          img.removeAttribute('srcset');
          img.removeAttribute('data-src');
          img.removeAttribute('data-original');
          transferred++;
        } else {
          failed++;
        }
        completed++;
        options?.onProgress?.(completed, total);
      })
    );
  }

  console.log(`[transfer] 转存完成: 成功 ${transferred}, 失败 ${failed}, 总计 ${total}`);

  return {
    html: doc.body.innerHTML,
    stats: { total, transferred, failed },
  };
}

// ============================================================
// 导出工具函数
// ============================================================
export { hasRemoteImages };

// ============================================================
// Hook 实现
// ============================================================

/**
 * 保存前处理钩子
 *
 * 用途：在保存内容前，自动转存 HTML 中的远程图片到 R2
 *
 * @example
 * ```typescript
 * const { prepareContent, transferring } = useSaveWithTransfer();
 *
 * const handleSubmit = async () => {
 *   const finalContent = await prepareContent(content);
 *   await fetch('/api/save', { body: JSON.stringify({ content: finalContent }) });
 * };
 * ```
 */
export function useSaveWithTransfer(
  options?: UseSaveWithTransferOptions
): UseSaveWithTransferResult {
  const [transferring, setTransferring] = useState(false);

  const {
    concurrency = 3,
    showToast = true,
    successMessage = (stats: TransferStats) => `图片转存完成：共 ${stats.transferred} 张`,
    failureMessage = (stats: TransferStats) => `图片转存完成：成功 ${stats.transferred}，失败 ${stats.failed}`,
    progressMessage = (current: number, total: number) => `正在转存图片 ${current}/${total}...`,
  } = options || {};

  const prepareContent = useCallback(
    async (html: string): Promise<string> => {
      // 没有远程图片，直接返回
      if (!hasRemoteImages(html)) {
        return html;
      }

      setTransferring(true);

      if (showToast) {
        toast.info('正在转存远程图片，请稍候...', {
          id: 'transfer-progress',
          duration: Infinity,
        });
      }

      try {
        const { html: processedHtml, stats } = await transferRemoteImages(html, {
          concurrency,
          onProgress: showToast
            ? (current: number, total: number) => {
                toast.info(progressMessage(current, total), {
                  id: 'transfer-progress',
                  duration: Infinity,
                });
              }
            : undefined,
        });

        if (showToast) {
          if (stats.failed > 0) {
            toast.warning(failureMessage(stats), {
              id: 'transfer-progress',
              duration: 3000,
            });
          } else {
            toast.success(successMessage(stats), {
              id: 'transfer-progress',
              duration: 2000,
            });
          }
        }

        return processedHtml;
      } catch (err: any) {
        console.error('[useSaveWithTransfer] 转存失败:', err);

        if (showToast) {
          toast.error('图片转存失败，将使用原始图片地址', {
            id: 'transfer-progress',
            duration: 3000,
          });
        }

        // 失败时返回原始 HTML，不阻塞保存
        return html;
      } finally {
        setTransferring(false);
      }
    },
    [concurrency, showToast, successMessage, failureMessage, progressMessage]
  );

  return { prepareContent, transferring };
}

// ============================================================
// 默认导出
// ============================================================

export default useSaveWithTransfer;