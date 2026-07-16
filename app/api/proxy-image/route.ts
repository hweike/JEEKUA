// app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// 配置区域
// ============================================================
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB（防止超大图片）
const HEAD_TIMEOUT = 4000; // 4秒（HEAD 超时）
const FETCH_TIMEOUT = 10000; // 10秒（代理下载超时）

// 可信任的直接访问域名（这些域名跳过 HEAD 检测，直接走代理或直接加载）
const DIRECT_ACCESS_DOMAINS = [
  'r2.dev',
  'cloudflare.com',
  'picsum.photos',
  'unsplash.com',
];

// 针对特定域名设置 Referer（代理时使用）
function getRefererForUrl(url: string): string {
  if (url.includes('hdslb.com') || url.includes('bilivideo.com')) return 'https://www.bilibili.com/';
  if (url.includes('sinaimg.cn')) return 'https://weibo.com/';
  if (url.includes('taobao.com') || url.includes('tmall.com')) return 'https://www.taobao.com/';
  if (url.includes('jd.com')) return 'https://www.jd.com/';
  return 'https://www.google.com/';
}

// ============================================================
// 辅助函数
// ============================================================
function normalizeUrl(base: string, path: string): string {
  const baseClean = base.replace(/\/+$/, '');
  const pathClean = path.replace(/^\/+/, '');
  return `${baseClean}/${pathClean}`;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // 只允许 http/https 协议
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // 基本长度限制
    if (url.length > 2048) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function shouldProxyDirect(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return DIRECT_ACCESS_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

// ============================================================
// 主逻辑
// ============================================================
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // 1. URL 合法性验证
  if (!isValidImageUrl(url)) {
    console.warn(`Invalid URL: ${url}`);
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // 2. 处理本地上传图片（R2）
  if (url.startsWith('uploads/')) {
    if (!R2_PUBLIC_URL) {
      console.error('R2_PUBLIC_URL not configured');
      return new NextResponse('Image service misconfigured', { status: 500 });
    }
    const fullUrl = normalizeUrl(R2_PUBLIC_URL, url);
    try {
      const response = await fetch(fullUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!response.ok) {
        console.error(`R2 fetch failed: ${fullUrl}, status: ${response.status}`);
        return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status });
      }
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
          'Access-Control-Allow-Origin': '*',
          'Content-Length': buffer.byteLength.toString(),
        },
      });
    } catch (error) {
      console.error('R2 fetch error:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  // 3. 智能检测：如果是可信任域名，直接走代理（跳过 HEAD）
  //    因为 HEAD 检测可能误判（如淘宝图片 HEAD 200 但 GET 需要 Referer）
  const skipHeadCheck = shouldProxyDirect(url);

  // 4. 智能检测：HEAD 判断图片是否可直接访问（仅对非信任域名）
  if (!skipHeadCheck) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT);

      const headRes = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (headRes.ok) {
        const contentType = headRes.headers.get('content-type') || '';
        const contentLength = parseInt(headRes.headers.get('content-length') || '0', 10);

        // 仅对图片类型且大小合理的资源进行 302 重定向
        if (contentType.startsWith('image/') && contentLength <= MAX_IMAGE_SIZE) {
          return new NextResponse(null, {
            status: 302,
            headers: {
              'Location': url,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        // 非图片或超大图片，继续走代理
      }
    } catch (error) {
      // HEAD 请求失败，继续走代理
      console.debug(`HEAD check failed for ${url}, falling back to proxy`);
    }
  }

  // 5. Fallback：代理模式
  try {
    const referer = getRefererForUrl(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 降级重试（无 Referer）
      if (response.status === 403 || response.status === 401) {
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), FETCH_TIMEOUT);
        const retryRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
          signal: retryController.signal,
        });
        clearTimeout(retryTimeoutId);
        if (retryRes.ok) {
          const buffer = await retryRes.arrayBuffer();
          if (buffer.byteLength > MAX_IMAGE_SIZE) {
            return new NextResponse('Image too large', { status: 413 });
          }
          const contentType = retryRes.headers.get('content-type') || 'image/jpeg';
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400, immutable',
              'Access-Control-Allow-Origin': '*',
              'Content-Length': buffer.byteLength.toString(),
            },
          });
        }
      }
      return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status });
    }

    // 读取响应体，限制大小
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return new NextResponse('Image too large', { status: 413 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}