// src/background/background.js
console.log('✅ Background Service Worker 已启动');

// ============================================================
// 保持 Background 活跃
// ============================================================

let keepAliveInterval = setInterval(() => {
  console.log('[Background] 💓 Keep alive');
}, 30000);

// ============================================================
// 获取 Token
// ============================================================

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

// ============================================================
// 获取 API 地址
// ============================================================

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

// ============================================================
// 解析价格（与 product-mapper.js 保持一致）
// ============================================================

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

// ============================================================
// 提取货币（与 product-mapper.js 保持一致）
// ============================================================

function extractCurrency(raw) {
  const priceStr = raw?.price || raw?.priceDisplay || '';
  if (priceStr.includes('US$') || priceStr.includes('USD')) return 'USD';
  if (priceStr.includes('€')) return 'EUR';
  if (priceStr.includes('£')) return 'GBP';
  if (priceStr.includes('¥')) return 'CNY';
  return 'USD';
}

// ============================================================
// 提取平台商品ID（与 product-mapper.js 保持一致）
// ============================================================

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

// ============================================================
// 生成 SKU（与 product-mapper.js 保持一致）
// ============================================================

function generateSku(productId, platform) {
  const prefix = platform === '1688' ? 'CN' : 'US';
  return `${prefix}_${productId || Date.now()}`;
}

// ============================================================
// 生成简短描述（与 product-mapper.js 保持一致）
// ============================================================

function generateShortDescription(description) {
  if (!description) return '';
  const clean = description.replace(/<[^>]*>/g, '').trim();
  return clean.length > 200 ? clean.slice(0, 200) + '...' : clean;
}

// ============================================================
// 生成 slug（与 product-mapper.js 保持一致）
// ============================================================

function generateSlug(title, productId) {
  if (!title) return productId || '';
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return productId ? `${base}-${productId}` : base;
}

// ============================================================
// 核心：直接执行保存（手动构建数据，与 product-mapper 格式一致）
// ============================================================

async function executeSaveDirectly(data, platform) {
  console.log('[Background] 执行直接保存...');
  console.log('[Background] 数据 keys:', Object.keys(data));
  console.log('[Background] sku_list 数量:', data.sku_list?.length || 0);
  
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
  
  // 3. 手动构建数据
  const sourceId = extractSourceId(data.url, platform);
  const currency = extractCurrency(data);
  const priceTiers = parsePrice(data.price);
  
  const images = Array.isArray(data.images) ? data.images : 
                 Array.isArray(data.gallery_images) ? data.gallery_images : [];
  
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
    main_image_url: images.length > 0 ? images[0] : '',
    additional_images: images,
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
  
  console.log('[Background] 构建的 productData:');
  console.log('  - product_name:', productData.product_name);
  console.log('  - main_image_url:', productData.main_image_url?.substring(0, 60) || '无');
  console.log('  - additional_images 数量:', productData.additional_images.length);
  console.log('  - sku_list 数量:', productData.sku_list.length);
  
  // 4. 发送保存请求
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
    
    // ⭐ 获取响应文本
    const responseText = await response.text();
    console.log('[Background] 响应原始内容:', responseText);
    
    // 尝试解析 JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('[Background] API 响应结果:', result);
      console.log('[Background] result.code:', result.code);
      console.log('[Background] result.exists:', result.exists);
      console.log('[Background] result.message:', result.message);
    } catch (e) {
      console.error('[Background] 解析 JSON 失败:', e);
      throw new Error('API 返回非 JSON 格式: ' + responseText);
    }
    
    // ⭐ 检查是否是重复商品
    if (result.code === 'DUPLICATE_ENTRY' || 
        result.exists === true || 
        result.exists === 1 ||
        (result.message && (
          result.message.toLowerCase().includes('already exists') ||
          result.message.toLowerCase().includes('duplicate') ||
          result.message.toLowerCase().includes('重复')
        ))) {
      console.log('[Background] ⚠️ 检测到重复商品，返回 exists: 1');
      return {
        success: true,
        saved: 0,
        exists: 1,
        failed: 0,
        sku_count: productData.sku_list.length,
        image_count: productData.additional_images.length
      };
    }
    
    if (!response.ok) {
      throw new Error('API 请求失败 (' + response.status + '): ' + responseText);
    }
    
    console.log('[Background] 保存成功:', result);
    
    return {
      success: true,
      saved: 1,
      exists: 0,
      failed: 0,
      id: result.id || result._id,
      sku_count: productData.sku_list.length,
      image_count: productData.additional_images.length
    };
    
  } catch (error) {
    console.error('[Background] 保存失败:', error);
    // ⭐ 检查错误信息中是否包含重复关键词
    if (error.message && (
      error.message.toLowerCase().includes('duplicate') || 
      error.message.toLowerCase().includes('already exists') ||
      error.message.toLowerCase().includes('重复')
    )) {
      console.log('[Background] ⚠️ 错误信息指示重复商品，返回 exists: 1');
      return {
        success: true,
        saved: 0,
        exists: 1,
        failed: 0,
        sku_count: productData.sku_list.length,
        image_count: productData.additional_images.length
      };
    }
    throw error;
  }
}


// ============================================================
// 动态注入适配器（批量）- 增强版：逐个注入，容错处理
// ============================================================

async function injectFiles(tabId, files) {
  console.log(`[Background] 批量注入 ${files.length} 个文件...`);
  console.log('[Background] 文件列表:', files);
  
  const results = [];
  let hasError = false;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[Background] 注入 ${i + 1}/${files.length}: ${file}`);
    
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [file],
        world: 'ISOLATED'
      });
      results.push({ file, success: true, result });
      console.log(`[Background] ✅ ${file} 注入成功`);
    } catch (error) {
      console.error(`[Background] ❌ ${file} 注入失败:`, error);
      results.push({ file, success: false, error: error.message });
      hasError = true;
      // 继续注入其他文件，不要因为一个失败就停止
    }
    
    // 等待脚本执行，避免竞态条件
    await new Promise(r => setTimeout(r, 200));
  }
  
  // 返回结果
  const successCount = results.filter(r => r.success).length;
  const failedFiles = results.filter(r => !r.success).map(r => r.file);
  
  console.log(`[Background] 注入完成: ${successCount}/${files.length} 成功`);
  if (failedFiles.length > 0) {
    console.warn('[Background] 失败的文件:', failedFiles.join(', '));
  }
  
  return {
    results,
    successCount,
    failedFiles,
    allSuccess: failedFiles.length === 0
  };
}

// ============================================================
// 消息监听
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] 收到消息:', JSON.stringify(message));

  switch (message.type) {

    // ⭐ 唤醒 Background
    case 'WAKE_UP': {
      console.log('[Background] 🟢 被唤醒');
      sendResponse({ success: true, timestamp: Date.now() });
      return true;
    }

    // ⭐ 保存请求（来自 Content Script，悬浮面板触发）
    case 'SAVE_PRODUCT_FROM_FLOATING': {
      console.log('[Background] 收到悬浮面板保存请求');
      
      const { data, platform } = message;
      
      if (!data) {
        sendResponse({ success: false, error: '缺少商品数据' });
        return true;
      }
      
      // ⭐ 直接执行保存
      executeSaveDirectly(data, platform || 'alibaba')
        .then(result => {
          console.log('[Background] 保存结果返回:', result);
          sendResponse({ success: true, ...result });
        })
        .catch(err => {
          console.error('[Background] 保存失败:', err);
          sendResponse({ success: false, error: err.message });
        });
      
      return true;
    }

    // ⭐ 批量注入适配器文件（增强版：详细日志 + 容错）
    case 'INJECT_ADAPTER_FILES': {
      const tabId = sender.tab?.id;
      const files = message.files;

      console.log('[Background] 收到 INJECT_ADAPTER_FILES 请求');
      console.log('[Background] tabId:', tabId);
      console.log('[Background] files:', files);

      if (!tabId) {
        console.error('[Background] 无法获取标签页 ID');
        sendResponse({ success: false, error: '无法获取标签页 ID' });
        return true;
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        console.error('[Background] 文件列表为空');
        sendResponse({ success: false, error: '文件列表为空' });
        return true;
      }

      // ⭐ 使用 IIFE 异步执行
      (async function() {
        try {
          const result = await injectFiles(tabId, files);
          
          if (result.allSuccess) {
            console.log('[Background] ✅ 所有文件注入完成');
            sendResponse({ 
              success: true, 
              injectedCount: result.successCount,
              allSuccess: true
            });
          } else {
            console.warn('[Background] ⚠️ 部分文件注入失败');
            sendResponse({ 
              success: true,  // 部分成功也返回 true，让 floating-handler 知道有文件注入了
              injectedCount: result.successCount,
              partial: true,
              failed: result.failedFiles,
              allSuccess: false
            });
          }
        } catch (error) {
          console.error('[Background] 注入失败:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      
      return true;
    }

    // ⭐ 注入 floating-handler.js 到 ISOLATED 世界（悬浮面板使用）
    case 'INJECT_FLOATING_HANDLER': {
      const tabId = sender.tab?.id;
      
      if (!tabId) {
        console.error('[Background] 无法获取标签页 ID');
        sendResponse({ success: false, error: '无法获取标签页 ID' });
        return true;
      }
      
      console.log('[Background] 注入 floating-handler.js 到 ISOLATED 世界...');
      console.log('[Background] tabId:', tabId);
      
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['src/content/floating-handler.js'],
        world: 'ISOLATED'  // ⭐ 关键：ISOLATED 世界
      })
      .then((result) => {
        console.log('[Background] ✅ floating-handler.js 注入成功');
        console.log('[Background] 注入结果:', result);
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Background] ❌ floating-handler.js 注入失败:', error);
        sendResponse({ success: false, error: error.message });
      });
      
      return true;
    }

    // ⭐ 来自 Content Script 的采集计数更新
    case 'COLLECT_COUNT_UPDATED': {
      console.log('[Background] 采集计数更新:', message.count);
      chrome.runtime.sendMessage({
        type: 'COLLECT_COUNT_UPDATED',
        count: message.count
      });
      sendResponse({ success: true });
      return true;
    }

    // ⭐ 获取独立站配置状态（悬浮面板使用）
    case 'GET_CONFIG_STATUS': {
      console.log('[Background] 获取配置状态');
      
      (async function() {
        try {
          const apiBase = await getApiBaseFromStorage();
          const token = await getTokenFromStorage();
          
          const hasApiBase = !!apiBase;
          const hasValidToken = !!token;
          
          console.log('[Background] 配置状态 - hasApiBase:', hasApiBase, 'hasValidToken:', hasValidToken);
          
          sendResponse({
            success: true,
            hasApiBase: hasApiBase,
            hasValidToken: hasValidToken,
            apiBase: apiBase || null
          });
        } catch (error) {
          console.error('[Background] 获取配置状态失败:', error);
          sendResponse({ 
            success: false, 
            hasApiBase: false, 
            hasValidToken: false, 
            error: error.message 
          });
        }
      })();
      
      return true;
    }

    default: {
      console.warn('[Background] 未知消息类型:', message.type);
      sendResponse({ success: false, error: '未知消息类型: ' + (message.type || 'unknown') });
      return true;
    }
  }
});

console.log('✅ Background 消息监听已就绪');

// ============================================================
// ⭐ Service Worker 生命周期事件
// ============================================================

// 安装事件
self.addEventListener('install', function(event) {
  console.log('[Background] Service Worker 安装');
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', function(event) {
  console.log('[Background] Service Worker 激活');
  event.waitUntil(clients.claim());
});

// 错误处理
self.addEventListener('unhandledrejection', function(event) {
  console.error('[Background] 未处理的 Promise 错误:', event.reason);
});

console.log('✅ Background Service Worker 初始化完成');