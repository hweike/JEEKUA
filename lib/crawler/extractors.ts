// lib/crawler/extractors.ts

// 定义一个接口来描述商品的基本信息
interface ProductInfo {
  title: string;
  price: string;
  images: string[];
}

// 定义一个配置，将解析规则从代码中分离出来
const EXTRACTOR_CONFIG = {
  // 可以在这里定义多个平台的解析规则
  1688: {
    titleSelectors: ['.offer-title', '.d-title', '.product-title'],
    priceSelectors: ['.price-wrap', '.price', '.sku-price', '.offer-price-range'],
    imageSelectors: [
      '.offer-image', '.product-image img', '.swiper-slide img', 
      '[class*="detail-gallery"] img', 'img[data-original]', 'img[src*=".jpg"]'
    ]
  }
};

export function extract1688(): ProductInfo {
  // 获取当前平台的配置，如果不存在则使用默认值
  const config = EXTRACTOR_CONFIG['1688'];
  
  // 1. 更健壮的标题提取
  let title = '';
  for (const selector of config.titleSelectors) {
    const element = document.querySelector(selector);
    if (element?.innerText) {
      title = element.innerText.trim();
      break;
    }
  }
  if (!title) title = document.title?.replace(/-.*$/, '').trim();

  // 2. 更健壮的价格提取
  let price = '';
  for (const selector of config.priceSelectors) {
    const element = document.querySelector(selector);
    if (element?.innerText) {
      let rawPrice = element.innerText.trim();
      price = rawPrice.replace(/[^\d¥.]/g, '').replace(/¥起/, '¥');
      break;
    }
  }

  // 3. 更健壮的图片提取
  let images: string[] = [];
  for (const selector of config.imageSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      images = Array.from(elements)
        .map(img => (img as HTMLImageElement).getAttribute('data-original') || (img as HTMLImageElement).src)
        .filter(src => src && src.startsWith('http') && !src.includes('blank'));
      if (images.length > 0) break;
    }
  }
  return { title, price, images };
}