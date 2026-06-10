// lib/crawler/link-collector.ts
import { chromium } from 'playwright';

const USE_PROXY = process.env.USE_PROXY === 'true';
const PROXY_SERVER = process.env.PROXY_SERVER || '';

function detectPlatform(url: string): string {
  if (url.includes('alibaba.com')) return 'alibaba';
  if (url.includes('1688.com')) return '1688';
  return 'unknown';
}

function parseCookieString(cookieStr: string): Array<{ name: string; value: string }> {
  return cookieStr.split(';').map(pair => {
    const [name, value] = pair.trim().split('=');
    return { name, value: value || '' };
  }).filter(c => c.name);
}

// 阿里国际站数据提取函数
function extractAlibaba() {
  const titleSelectors = ['.product-title', '.product-name', '.ma-title', '[data-testid="product-title"]', 'h1'];
  let title = '';
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      title = el.innerText?.trim() || '';
      if (title) break;
    }
  }

  const priceSelectors = ['.price span', '.price-value', '[data-price]', '.price'];
  let price = '';
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      price = el.innerText?.trim() || '';
      if (price) break;
    }
  }

  const images = Array.from(document.querySelectorAll('.gallery img, .swiper-slide img, .product-image img'))
    .map(img => (img as HTMLImageElement).src)
    .filter(src => src && !src.includes('blank'));

  return { title, price, images };
}

// 1688 数据提取函数（增强版）
function extract1688() {
  // 1. 标题提取
  const titleSelectors = ['.offer-title', '.d-title', '.product-title'];
  let title = '';
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el?.innerText) {
      title = el.innerText.trim();
      if (title) break;
    }
  }
  if (!title) title = document.title?.replace(/-.*$/, '').trim();

  // 2. 价格提取（增强逻辑：覆盖阶梯价、区间价、起批量价）
  let price = '';
  // 优先查找包含价格的主要容器
  const priceContainers = [
    '.price', '.price-wrap', '.sku-price', '.offer-price-range',
    '.price-list', '.price-range', '[class*="price"]'
  ];
  for (const containerSel of priceContainers) {
    const container = document.querySelector(containerSel);
    if (container) {
      // 尝试提取文本，并清理
      let rawPrice = container.innerText.trim();
      if (rawPrice) {
        // 匹配数字、小数点、货币符号（¥、$）和中文“起”
        const match = rawPrice.match(/[\d\.,]+/);
        if (match) {
          price = match[0].replace(/,/g, '');
          // 如果价格是区间，取最小值
          if (rawPrice.includes('-')) {
            const parts = rawPrice.split('-');
            if (parts[0]) price = parts[0].replace(/[^\d\.]/g, '');
          }
          // 添加货币符号
          if (rawPrice.includes('¥')) price = '¥' + price;
          break;
        }
      }
    }
  }
  // 备选：查找页面中任何包含价格字符的元素（用于非常规布局）
  if (!price) {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.innerText?.trim();
      if (text && /¥\s*\d+(\.\d+)?/.test(text)) {
        const match = text.match(/¥\s*(\d+(\.\d+)?)/);
        if (match) {
          price = '¥' + match[1];
          break;
        }
      }
    }
  }

  // 3. 图片提取
  let images: string[] = [];
  const imageSelectors = [
    '.offer-image', '.product-image img', '.swiper-slide img',
    '[class*="detail-gallery"] img', 'img[data-original]', 'img[src*=".jpg"]'
  ];
  for (const sel of imageSelectors) {
    const elements = document.querySelectorAll(sel);
    if (elements.length > 0) {
      images = Array.from(elements)
        .map(img => (img as HTMLImageElement).getAttribute('data-original') || (img as HTMLImageElement).src)
        .filter(src => src && src.startsWith('http') && !src.includes('blank'));
      if (images.length > 0) break;
    }
  }
  return { title, price, images };
}

export async function crawlProductByUrl(url: string, userCookie?: string): Promise<any> {
  const platform = detectPlatform(url);
  if (platform === 'unknown') {
    throw new Error(`不支持该平台: ${url}`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const contextOptions: any = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'zh-CN',
      timezoneId: 'Asia/Shanghai',
    };
    if (USE_PROXY && PROXY_SERVER) {
      contextOptions.proxy = { server: PROXY_SERVER };
    }
    const context = await browser.newContext(contextOptions);

    if (platform === 'alibaba' && userCookie) {
      const cookies = parseCookieString(userCookie);
      await context.addCookies(cookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: '.alibaba.com',
        path: '/',
      })));
    }

    const page = await context.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 等待关键元素
    const platformSelectors = {
      alibaba: ['.product-title', '.price', '.gallery-img'],
      '1688': ['.offer-title', '.price', '.offer-image'],
    };
    const selectors = platformSelectors[platform as keyof typeof platformSelectors] || [];
    if (selectors.length > 0) {
      try {
        await page.waitForSelector(selectors.join(','), { timeout: 15000 });
        console.log(`[crawler] 关键元素已加载`);
      } catch (err) {
        console.warn(`[crawler] 等待关键元素超时`);
      }
    }

    await page.waitForTimeout(Math.random() * 2000 + 1000);

    let productData: any = { source_url: url, platform };
    if (platform === 'alibaba') {
      productData = await page.evaluate(extractAlibaba);
    } else if (platform === '1688') {
      productData = await page.evaluate(extract1688);
    }
    productData.platform = platform;
    productData.source_url = url;
    return productData;
  } finally {
    await browser.close();
  }
}