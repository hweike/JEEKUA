// src/background/save-handler.js
// Background 专用的保存处理模块（悬浮面板使用）

// ============================================================
// 工具函数（与 product-mapper.js 保持一致）
// ============================================================

/**
 * 解析价格
 */
function parsePrice(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') {
    return [];
  }
  const cleaned = priceStr.replace(/[^0-9.\-]/g, ' ');
  const numbers = cleaned.match(/[\d.]+/g);
  if (!numbers || numbers.length === 0) {
    return [];
  }
  const nums = numbers.map(Number).filter(n => !isNaN(n) && n > 0);
  if (nums.length === 0) {
    return [];
  }
  const price = nums[0];
  return [{
    min_qty: 1,
    max_qty: null,
    price: price,
    currency: 'USD'
  }];
}

/**
 * 提取货币
 */
function extractCurrency(raw) {
  const priceStr = raw?.price || raw?.priceDisplay || '';
  if (priceStr.includes('US$') || priceStr.includes('USD')) return 'USD';
  if (priceStr.includes('€')) return 'EUR';
  if (priceStr.includes('£')) return 'GBP';
  if (priceStr.includes('¥')) return 'CNY';
  return 'USD';
}

/**
 * 提取平台商品ID
 */
function extractSourceId(url, platform) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (platform === 'alibaba') {
      const match = pathname.match(/\/product-detail\/[^/]*(?:-|_)(\d+)\.html/);
      return match ? match[1] : null;
    }
    if (platform === '1688') {
      const match = pathname.match(/\/offer\/(\d+)\.html/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 生成 SKU
 */
function generateSku(productId, platform) {
  const prefix = platform === '1688' ? 'CN' : 'US';
  return `${prefix}_${productId || Date.now()}`;
}

/**
 * 生成简短描述
 */
function generateShortDescription(description) {
  if (!description) return '';
  const clean = description.replace(/<[^>]*>/g, '').trim();
  return clean.length > 200 ? clean.slice(0, 200) + '...' : clean;
}

/**
 * 生成 slug
 */
function generateSlug(title, productId) {
  if (!title) return productId || '';
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return productId ? `${base}-${productId}` : base;
}

// ============================================================
// 核心保存函数
// ============================================================

/**
 * 获取 Token
 */
function getTokenFromStorage() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['api_token', 'api_token_expires_at'], function(result) {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        const token = result.api_token;
        const expiresAt = result.api_token_expires_at;
        if (!token) { resolve(null); return; }
        if (expiresAt && new Date(expiresAt) < new Date()) { resolve(null); return; }
        resolve(token);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * 获取 API 地址
 */
function getApiBaseFromStorage() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get('api_base', function(result) {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(result.api_base || null);
      });
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * 执行保存（悬浮面板专用）
 */
async function executeSaveDirectly(data, platform) {
  console.log('[Background] 执行直接保存...');
  
  // 1. 获取 API 地址
  const apiBase = await getApiBaseFromStorage();
  if (!apiBase) {
    throw new Error('未配置独立站地址');
  }
  console.log('[Background] API 地址:', apiBase);
  
  // 2. 获取 Token
  const token = await getTokenFromStorage();
  if (!token) {
    throw new Error('未获取到 Token，请先配置独立站');
  }
  console.log('[Background] Token 已获取');
  
  // 3. 构建数据
  const sourceId = extractSourceId(data.url, platform);
  const currency = extractCurrency(data);
  const priceTiers = parsePrice(data.price);
  
  const productData = {
    platform: platform || 'alibaba',
    source_url: data.url || '',
    source_product_id: sourceId || '',
    product_name: data.title || data.product_name || '',
    description: data.description || '',
    short_description: generateShortDescription(data.description),
    brand: data.supplier || data.brand || '',
    slug: generateSlug(data.title || data.product_name || '', sourceId),
    price_tiers: priceTiers,
    currency: currency,
    min_order_quantity: parseInt(data.moq) || 1,
    availability: 'in_stock',
    main_image_url: data.main_image || 
      (Array.isArray(data.gallery_images) ? data.gallery_images[0] : ''),
    additional_images: Array.isArray(data.gallery_images) ? 
      data.gallery_images : 
      (Array.isArray(data.images) ? data.images : []),
    sku: generateSku(sourceId, platform),
    sku_list: Array.isArray(data.sku) ? data.sku : 
               Array.isArray(data.sku_list) ? data.sku_list : [],
    attributes: data.attributes || {},
    spec_text: data.spec_text || '',
    status: 'draft',
    import_status: 'pending',
    collected_at: data.collectedAt || new Date().toISOString(),
    collected_by: 'plugin',
    template_id: data.templateId || '',
    raw_data: data
  };
  
  if (data.supplier) {
    productData.attributes.supplier = data.supplier;
  }
  if (data.location) {
    productData.attributes.location = data.location;
  }
  
  console.log('[Background] 商品数据:', productData);
  
  const url = apiBase + '/api/productCrawl/collection';
  console.log('[Background] 请求 URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(productData)
    });
    
    console.log('[Background] 响应状态:', response.status);
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error('API 请求失败 (' + response.status + '): ' + text);
    }
    
    const result = await response.json();
    console.log('[Background] 保存成功:', result);
    
    return {
      success: true,
      saved: 1,
      exists: false,
      id: result.id || result._id
    };
  } catch (error) {
    console.error('[Background] 保存失败:', error);
    throw error;
  }
}

// ============================================================
// 导出
// ============================================================

export {
  executeSaveDirectly,
  parsePrice,
  extractCurrency,
  extractSourceId,
  generateSku,
  generateShortDescription,
  generateSlug,
  getTokenFromStorage,
  getApiBaseFromStorage
};