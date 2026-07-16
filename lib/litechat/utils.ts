// lib/litechat/utils.ts

/**
 * 格式化时间（前台使用 - 无中文，适合多语言）
 * - 跨天：2026-07-14 23:30
 * - 当天：23:30
 */
export function formatChatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  const isToday = d.getFullYear() === now.getFullYear() &&
                  d.getMonth() === now.getMonth() &&
                  d.getDate() === now.getDate();
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  if (isToday) {
    return timeStr;
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} ${timeStr}`;
}

/**
 * 格式化时间（后台使用 - "X分钟前"）
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 172800) return '昨天';
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return formatChatTime(date);
}

/**
 * 检测文本中的 URL
 */
export function detectUrls(text: string): { text: string; url?: string }[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: { text: string; url?: string }[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, match.index) });
    }
    parts.push({ text: match[0], url: match[0] });
    lastIndex = urlRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex) });
  }
  
  return parts.length === 0 ? [{ text }] : parts;
}

/**
 * 检测是否为图片 URL
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)(\?.*)?$/i;
  return imageExtensions.test(url);
}

/**
 * ============================================================
 * 🆕 新增：可信任域名（这些域名不需要代理）
 * ============================================================
 */
const TRUSTED_DOMAINS = [
  'r2.dev',
  'cloudflare.com',
  'picsum.photos',
  'unsplash.com',
  'gravatar.com',
  'githubusercontent.com',
  'vercel.app',
];

/**
 * ============================================================
 * 🆕 新增：判断 URL 是否需要代理
 * ============================================================
 */
function shouldProxyUrl(url: string): boolean {
  try {
    // 1. 本地上传的图片，直接加载
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      return false;
    }

    // 2. 如果已经是代理 URL，直接返回（避免无限循环）
    if (url.startsWith('/api/proxy-image')) {
      return false;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname;

    // 3. 可信任域名，直接加载
    if (TRUSTED_DOMAINS.some(domain => hostname.includes(domain))) {
      return false;
    }

    // 4. 需要防盗链处理的域名，走代理
    const proxyDomains = [
      'taobao.com',
      'tmall.com',
      'jd.com',
      'yupoo.com',
      'hdslb.com',
      'bilibili.com',
      'sinaimg.cn',
      'qpic.cn',
      'gtimg.com',
      'myqcloud.com',
      'aliyuncs.com',
    ];
    if (proxyDomains.some(domain => hostname.includes(domain))) {
      return true;
    }

    // 5. 默认：HTTPS 图片直接加载，HTTP 走代理（混合内容问题）
    return parsed.protocol === 'http:';
  } catch {
    // 无法解析的 URL，走代理（保守策略）
    return true;
  }
}

/**
 * ============================================================
 * 🆕 升级版：获取代理后的图片 URL
 * - 不需要代理的直接返回原 URL
 * - 需要代理的包装为 /api/proxy-image?url=xxx
 * ============================================================
 */
export function getProxyImageUrl(url: string): string {
  if (!url) return '';

  // 如果已经是代理 URL，直接返回
  if (url.startsWith('/api/proxy-image')) {
    return url;
  }

  // 智能判断是否需要代理
  if (!shouldProxyUrl(url)) {
    return url;
  }

  // 包装为代理 URL
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

/**
 * ============================================================
 * 🆕 新增：解析消息内容中的文本和图片
 * ============================================================
 */
export function parseMessageContent(content: string, fileUrl?: string) {
  const result: { text: string; images: string[] } = { text: content, images: [] };

  if (fileUrl && isImageUrl(fileUrl)) {
    result.images.push(fileUrl);
  }

  const parts = detectUrls(content);
  for (const part of parts) {
    if (part.url && isImageUrl(part.url)) {
      result.images.push(part.url);
    }
  }

  return result;
}