// app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// 配置
// ============================================================
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const FETCH_TIMEOUT = 5000;
const CACHE_TTL = 60 * 60 * 24 * 30;
const PROXY_CACHE_TTL = 60 * 5;

// ✅ 特殊站点 Referer（仅列出"源站 origin 会失败"的少数站点）
const SPECIAL_REFERER_DOMAINS: Record<string, string> = {
    'hdslb.com': 'https://www.bilibili.com/',
  'bilivideo.com': 'https://www.bilibili.com/',
  'sinaimg.cn': 'https://weibo.com/',
  'taobao.com': 'https://www.taobao.com/',
  'tmall.com': 'https://www.taobao.com/',
  'jd.com': 'https://www.jd.com/',
  'douban.com': 'https://www.douban.com/',
  'zhimg.com': 'https://www.zhihu.com/',
};

// 白名单：直接 302 重定向（无需代理）
const DIRECT_REDIRECT_DOMAINS = [
  'r2.dev',
  'cloudflare.com',
  'picsum.photos',
  'unsplash.com',
  'githubusercontent.com',
  'imgur.com',
];

// ============================================================
// 辅助函数
// ============================================================

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (url.length > 2048) return false;
    const hostname = parsed.hostname;
    if (/^(127\.0\.0\.1|localhost|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * ✅ 获取 Referer 候选列表（多级降级）
 */
function getRefererCandidates(url: string): (string | null)[] {
  const candidates: (string | null)[] = [];
  
  try {
    const hostname = new URL(url).hostname;
    
    // 1. 特殊站点 Referer（优先）
    for (const [domain, referer] of Object.entries(SPECIAL_REFERER_DOMAINS)) {
      if (hostname.includes(domain)) {
        candidates.push(referer);
        break;
      }
    }
    
    // 2. 源站 origin（覆盖大多数场景）
    candidates.push(new URL(url).origin + '/');
    
    // 3. 无 Referer
    candidates.push(null);
    
    // 4. Google Referer（模拟搜索引擎）
    candidates.push('https://www.google.com/');
    
    return candidates;
  } catch {
    return [null];
  }
}

function canDirectRedirect(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return DIRECT_REDIRECT_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

function getCacheControl(url: string, isR2: boolean): string {
  if (isR2 || canDirectRedirect(url)) {
    return `public, max-age=${CACHE_TTL}, immutable`;
  }
  return `public, max-age=${PROXY_CACHE_TTL}, stale-while-revalidate=${PROXY_CACHE_TTL * 2}`;
}

// ============================================================
// 内存缓存
// ============================================================
interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  expires: number;
  size: number;
}

const MAX_CACHE_ENTRIES = 50;
const memoryCache = new Map<string, CacheEntry>();

function setCache(key: string, buffer: Buffer, contentType: string, ttl: number): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, {
    buffer,
    contentType,
    expires: Date.now() + ttl * 1000,
    size: buffer.length,
  });
}

function getCache(key: string): CacheEntry | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry;
}

// ============================================================
// 核心：多级 Referer 尝试
// ============================================================

async function fetchImageWithFallback(url: string): Promise<Response> {
  const referers = getRefererCandidates(url);
  
  for (let i = 0; i < referers.length; i++) {
    const referer = referers[i];
    
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      };
      
      if (referer) {
        headers['Referer'] = referer;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[proxy-image] ✅ 尝试 ${i + 1}/${referers.length} 成功 (Referer: ${referer || '无'}): ${url}`);
        return response;
      }
      
      console.log(`[proxy-image] 尝试 ${i + 1}/${referers.length} 失败 (${response.status}, Referer: ${referer || '无'}): ${url}`);
    } catch (err: any) {
      console.log(`[proxy-image] 尝试 ${i + 1}/${referers.length} 异常 (Referer: ${referer || '无'}): ${err.message}`);
    }
  }
  
  throw new Error('所有 Referer 策略都失败');
}

// ============================================================
// 核心逻辑
// ============================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  if (!isValidImageUrl(url)) {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // R2 图片：302 重定向
  if (url.startsWith('uploads/')) {
    if (!R2_PUBLIC_URL) {
      return new NextResponse('Image service misconfigured', { status: 500 });
    }
    const cleanUrl = url.replace(/^\/+/, '');
    const fullUrl = R2_PUBLIC_URL.replace(/\/+$/, '') + '/' + cleanUrl;
    return new NextResponse(null, {
      status: 302,
      headers: {
        'Location': fullUrl,
        'Cache-Control': `public, max-age=${CACHE_TTL}, immutable`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 白名单：302 重定向
  if (canDirectRedirect(url)) {
    return new NextResponse(null, {
      status: 302,
      headers: {
        'Location': url,
        'Cache-Control': `public, max-age=${CACHE_TTL}, immutable`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 检查内存缓存
  const cacheKey = `proxy:${url}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': `public, max-age=${PROXY_CACHE_TTL}, stale-while-revalidate=${PROXY_CACHE_TTL * 2}`,
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Content-Length': cached.size.toString(),
      },
    });
  }

  // ✅ 多级降级下载
  try {
    const response = await fetchImageWithFallback(url);
    return await handleSuccessfulResponse(response, url, startTime);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return new NextResponse('Request timeout', { status: 504 });
    }
    console.error(`[proxy-image] 所有策略失败: ${url}`, error.message);
    return new NextResponse('Failed to fetch image', { status: 502 });
  }
}

// ============================================================
// 响应处理
// ============================================================

async function handleSuccessfulResponse(
  response: Response,
  url: string,
  startTime: number
): Promise<NextResponse> {
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  if (!contentType.startsWith('image/')) {
    return new NextResponse('Not an image', { status: 415 });
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > MAX_IMAGE_SIZE) {
    return new NextResponse('Image too large', { status: 413 });
  }

  if (buffer.length === 0) {
    return new NextResponse('Empty image', { status: 502 });
  }

  const isR2 = url.startsWith('uploads/');
  if (!isR2 && !canDirectRedirect(url)) {
    setCache(`proxy:${url}`, buffer, contentType, PROXY_CACHE_TTL);
  }

  const cacheControl = getCacheControl(url, isR2);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Length': buffer.length.toString(),
      'X-Proxy-Time': `${Date.now() - startTime}ms`,
    },
  });
}

// ============================================================
// OPTIONS
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}