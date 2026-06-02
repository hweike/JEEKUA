import { NextRequest, NextResponse } from 'next/server';

// 允许代理的域名白名单（支持子域名通配）
const allowedDomains = [
  'alicdn.com',
  'taobao.com',
  'tmall.com',
  'jd.com',
  'yupoo.com',
  'weixin.qq.com',
  'qpic.cn',
  'gtimg.com',
  'myqcloud.com',
  'upyun.com',
  'aliyuncs.com',
  'amazonaws.com',
  'cloudfront.net',
  'hdslb.com',        // 添加 B 站图片域名
  'bilivideo.com',    // B 站视频/图片相关域名
  // 可根据需要添加更多
];

// 针对特定域名设置 Referer 策略
function getRefererForUrl(url: string): string {
  if (url.includes('hdslb.com') || url.includes('bilivideo.com')) {
    return 'https://www.bilibili.com/';
  }
  if (url.includes('sinaimg.cn')) {
    return 'https://weibo.com/';
  }
  // 默认使用 Google 作为来源
  return 'https://www.google.com/';
}

// 缓存时间（秒）
const CACHE_MAX_AGE = 60 * 60 * 24; // 24小时

function isAllowedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // 安全检查：只允许代理白名单域名
  if (!isAllowedDomain(url)) {
    console.warn(`Blocked proxy request to non-allowed domain: ${url}`);
    return new NextResponse('Forbidden domain', { status: 403 });
  }

  // 可选：限制图片大小（通过 HEAD 请求提前检查，或直接流式返回）
  // 这里直接 fetch，如果图片过大可能影响内存，可增加流式响应优化（下方实现）

  try {
    const referer = getRefererForUrl(url);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
      },
    });

    if (!response.ok) {
      console.error(`Image fetch failed: ${url} - ${response.status}`);
      // 尝试降级：无 Referer 重试一次（某些 CDN 反而需要无 Referer）
      if (response.status === 403 || response.status === 401) {
        const retryRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            // 不发送 Referer
          },
        });
        if (retryRes.ok) {
          const buffer = await retryRes.arrayBuffer();
          const contentType = retryRes.headers.get('content-type') || 'image/jpeg';
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
      return new NextResponse(`Failed to fetch image: ${response.status}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, immutable`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}