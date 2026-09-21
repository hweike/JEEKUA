// src/content/floating-handler.js
// 悬浮面板独立处理器 - 完全独立于 Popup，不依赖 content.js

(function() {
  'use strict';

  // 防止重复注入
  if (window.__jeekuaFloatingHandler) {
    console.log('[FloatingHandler] 已存在，跳过注入');
    return;
  }

  console.log('[FloatingHandler] 初始化...');

  // ============================================================
  // 状态管理
  // ============================================================

  const STATE = {
    platform: null,
    adapterLoaded: false,
    connectionStatus: 'idle',
    isCollecting: false
  };

  function detectPlatform() {
    const url = window.location.href;
    if (/1688\.com/.test(url)) return '1688';
    if (/alibaba\.com/.test(url)) return 'alibaba';
    return null;
  }

  function checkAdapters() {
    try {
      const hasBase = !!(window.__adapters && window.__adapters.BaseAdapter);
      const platform = detectPlatform();
      const adapterKey = platform === '1688' ? 'China1688Adapter' : 'AlibabaAdapter';
      const hasPlatform = platform && window.__adapters && window.__adapters[adapterKey];
      const result = !!(hasBase && hasPlatform);
      console.log('[FloatingHandler] checkAdapters 结果:', result, 'hasBase:', hasBase, 'hasPlatform:', hasPlatform);
      return result;
    } catch (e) {
      console.error('[FloatingHandler] checkAdapters 异常:', e);
      return false;
    }
  }

  // ============================================================
  // ⭐ 确保 config-loader 已加载
  // ============================================================

  function ensureConfigLoader() {
    return new Promise((resolve) => {
      if (window.__jeekuaConfig) {
        console.log('[FloatingHandler] config-loader 已加载');
        resolve();
        return;
      }
      
      console.log('[FloatingHandler] 通过 script 标签加载 config-loader...');
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('src/utils/config-loader.js');
      script.onload = () => {
        console.log('[FloatingHandler] ✅ config-loader 加载成功');
        setTimeout(resolve, 300);
      };
      script.onerror = () => {
        console.warn('[FloatingHandler] ⚠️ config-loader 加载失败');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  // ============================================================
  // ⭐ 适配器加载（增强版 - 增加详细日志和错误处理）
  // ============================================================

  function loadAdapters(platformId) {
    console.log('[FloatingHandler] loadAdapters 被调用, platformId:', platformId);
    
    // 先检查是否已经加载
    if (checkAdapters()) {
      console.log('[FloatingHandler] 适配器已加载，直接返回');
      STATE.adapterLoaded = true;
      return Promise.resolve({ platform: platformId, alreadyLoaded: true });
    }
    
    console.log('[FloatingHandler] 适配器未加载，开始加载流程...');
    console.log('[FloatingHandler] 当前 window.__adapters:', window.__adapters);
    console.log('[FloatingHandler] 当前 window.__jeekuaConfig:', window.__jeekuaConfig);
    
    return new Promise((resolve, reject) => {
      const files = [
        'src/utils/config-loader.js',
        'src/adapters/base-adapter.js',
        platformId === '1688' 
          ? 'src/adapters/china-1688-adapter.js'
          : 'src/adapters/alibaba-adapter.js'
      ];
      
      console.log('[FloatingHandler] 发送 INJECT_ADAPTER_FILES 消息到 Background...');
      console.log('[FloatingHandler] 文件列表:', files);
      
      chrome.runtime.sendMessage({
        type: 'INJECT_ADAPTER_FILES',
        files: files
      }, (response) => {
        console.log('[FloatingHandler] INJECT_ADAPTER_FILES 响应:', response);
        
        if (chrome.runtime.lastError) {
          console.error('[FloatingHandler] chrome.runtime.lastError:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          console.log('[FloatingHandler] ✅ 文件注入成功，等待适配器挂载...');
          console.log('[FloatingHandler] 注入文件数:', response.injectedCount || files.length);
          if (response.partial) {
            console.warn('[FloatingHandler] ⚠️ 部分文件注入失败:', response.failed);
          }
          
          let attempts = 0;
          const maxAttempts = 30; // 增加到30次，共10秒
          
          function checkAndResolve() {
            attempts++;
            const isLoaded = checkAdapters();
            console.log(`[FloatingHandler] 检查适配器 (${attempts}/${maxAttempts}):`, isLoaded);
            
            if (isLoaded) {
              STATE.adapterLoaded = true;
              console.log('[FloatingHandler] ✅ 适配器已挂载！');
              resolve({ platform: platformId });
              return;
            }
            
            if (attempts < maxAttempts) {
              setTimeout(checkAndResolve, 300);
            } else {
              console.error('[FloatingHandler] ❌ 适配器加载超时');
              console.log('[FloatingHandler] 最终 window.__adapters:', window.__adapters);
              console.log('[FloatingHandler] 最终 window.__jeekuaConfig:', window.__jeekuaConfig);
              // 检查是否部分加载
              const hasBase = !!(window.__adapters && window.__adapters.BaseAdapter);
              const hasPlatform = window.__adapters && window.__adapters[platformId === '1688' ? 'China1688Adapter' : 'AlibabaAdapter'];
              console.log('[FloatingHandler] 部分加载状态 - BaseAdapter:', hasBase, 'PlatformAdapter:', hasPlatform);
              
              let errorMsg = '适配器加载超时';
              if (hasBase && !hasPlatform) {
                errorMsg = 'BaseAdapter 已加载但 PlatformAdapter 未加载，请检查适配器文件是否正确';
              } else if (!hasBase && hasPlatform) {
                errorMsg = 'PlatformAdapter 已加载但 BaseAdapter 未加载，请检查 base-adapter.js 是否注入成功';
              } else if (!hasBase && !hasPlatform) {
                errorMsg = '所有适配器均未加载，请检查 Background 是否正常运行';
              }
              reject(new Error(errorMsg));
            }
          }
          setTimeout(checkAndResolve, 500);
        } else {
          console.error('[FloatingHandler] 注入失败:', response?.error || '未知错误');
          reject(new Error(response?.error || '注入失败'));
        }
      });
    });
  }

  // ============================================================
  // 数据采集
  // ============================================================

  async function performCollect() {
    console.log('[FloatingHandler] 执行采集...');
    
    const platform = detectPlatform();
    if (!platform) throw new Error('不支持的平台');
    
    await ensureConfigLoader();
    
    if (!checkAdapters()) {
      console.log('[FloatingHandler] 适配器未加载，开始加载...');
      await loadAdapters(platform);
      if (!checkAdapters()) {
        throw new Error('适配器加载失败');
      }
    }
    
    const adapterKey = platform === '1688' ? 'China1688Adapter' : 'AlibabaAdapter';
    const AdapterClass = window.__adapters?.[adapterKey];
    if (!AdapterClass) throw new Error('适配器 ' + adapterKey + ' 未找到');
    
    console.log('[FloatingHandler] ✅ 适配器类已找到:', adapterKey);
    
    const adapter = new AdapterClass();
    let result;
    try {
      result = await adapter.scrape();
    } catch (e) {
      console.error('[FloatingHandler] 适配器采集异常:', e);
      result = extractFromPage(platform);
    }
    
    console.log('[FloatingHandler] 适配器返回:');
    console.log('  description 长度:', result?.description?.length || 0);
    console.log('  images 数量:', result?.images?.length || result?.gallery_images?.length || 0);
    console.log('  sku_list 数量:', result?.sku_list?.length || 0);
    if (result?.sku_list && result.sku_list.length > 0) {
      console.log('  sku_list 内容:', JSON.stringify(result.sku_list, null, 2));
    }
    console.log('  variants 数量:', result?.variants?.length || 0);
    if (result?.variants && result.variants.length > 0) {
      console.log('  variants 内容:', JSON.stringify(result.variants, null, 2));
    }
    
    // ⭐ 保存原始变体数据
    const originalSkuList = result?.sku_list || [];
    const originalVariants = result?.variants || [];
    
    // 构建标准数据 - 保持完整 description
    const safeResult = {
      platform: result?.platform || platform,
      url: result?.url || window.location.href,
      title: result?.title || document.title || '未知商品',
      price: result?.price || 'N/A',
      images: Array.isArray(result?.images) ? result.images.slice(0, 10) : 
              Array.isArray(result?.gallery_images) ? result.gallery_images.slice(0, 10) : [],
      description: result?.description || result?.desc || '',
      // ⭐ 保留 sku_list 和 variants
      sku_list: originalSkuList,
      variants: originalVariants,
      // ⭐ 保存原始数据副本，用于后续恢复
      _original: {
        sku_list: originalSkuList,
        variants: originalVariants
      },
      attributes: result?.attributes || {},
      supplier: result?.supplier || '',
      currency: result?.currency || 'USD',
      moq: result?.moq || '1',
      timestamp: new Date().toISOString()
    };
    
    // 如果 description 为空，尝试从其他字段获取
    if (!safeResult.description || safeResult.description.trim() === '') {
      const possibleFields = ['desc', 'product_description', 'productDescription', 'detail', 'content', 'text', 'description_html', 'html'];
      for (const field of possibleFields) {
        if (result && result[field] && typeof result[field] === 'string' && result[field].length > 10) {
          safeResult.description = result[field];
          console.log('[FloatingHandler] 从 ' + field + ' 获取到描述');
          break;
        }
      }
    }
    
    // 如果标题为空，从页面提取
    if (!safeResult.title || safeResult.title === '未知商品') {
      safeResult.title = extractTitleFromPage();
    }
    
    // 如果描述为空，从页面直接提取
    if (!safeResult.description || safeResult.description.trim() === '') {
      console.log('[FloatingHandler] description 为空，从页面直接提取...');
      const pageData = extractFromPage(platform);
      if (pageData.description) {
        safeResult.description = pageData.description;
      }
    }
    
    console.log('[FloatingHandler] 最终数据:');
    console.log('  title:', safeResult.title);
    console.log('  description 长度:', safeResult.description?.length || 0);
    console.log('  images 数量:', safeResult.images?.length || 0);
    console.log('  sku_list 数量:', safeResult.sku_list?.length || 0);
    if (safeResult.sku_list && safeResult.sku_list.length > 0) {
      console.log('  sku_list 内容:', JSON.stringify(safeResult.sku_list, null, 2));
    }
    console.log('  variants 数量:', safeResult.variants?.length || 0);
    if (safeResult.variants && safeResult.variants.length > 0) {
      console.log('  variants 内容:', JSON.stringify(safeResult.variants, null, 2));
    }
    
    // ⭐ 保存到全局变量，用于后续恢复（防止 postMessage 丢失数据）
    window.__floating_last_collect = safeResult;
    return safeResult;
  }

  // ============================================================
  // 从页面直接提取数据（备用方案）
  // ============================================================

  function extractFromPage(platform) {
    const data = {
      platform: platform,
      url: window.location.href,
      title: '',
      price: 'N/A',
      images: [],
      description: '',
      sku_list: [],
      variants: []
    };
    
    try {
      // 提取标题
      const titleSelectors = [
        'h1[data-testid="product-title"]',
        'h1.product-title',
        'h1[data-spm="100"]',
        '.product-title',
        '.product-name',
        '.title',
        'h1',
        'h2'
      ];
      
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim()) {
          data.title = el.textContent.trim();
          break;
        }
      }
      
      if (!data.title) {
        data.title = document.title || '未知商品';
      }
      
      // 提取价格
      const priceSelectors = [
        '[data-testid="product-price"]',
        '.product-price',
        '.price',
        '.price span',
        '[data-spm="200"]',
        '.price-discount',
        '.price-now'
      ];
      
      for (const selector of priceSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim()) {
          const priceText = el.textContent.trim();
          const priceMatch = priceText.match(/[\d,\.]+/);
          if (priceMatch) {
            data.price = priceMatch[0];
            break;
          }
        }
      }
      
      // 提取图片
      const imageSelectors = [
        '.product-image img',
        '[data-testid="product-image"] img',
        '.main-image img',
        '.images img',
        '.gallery img'
      ];
      
      const images = [];
      for (const selector of imageSelectors) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
          const src = el.src || el.getAttribute('data-src') || el.getAttribute('srcset');
          if (src && src.startsWith('http')) {
            images.push(src);
          }
          if (images.length >= 5) break;
        }
        if (images.length >= 5) break;
      }
      data.images = images;
      
      // 描述提取
      const descSelectors = [
        '.product-description',
        '.product-description-content',
        '.description',
        '.detail-content',
        '.product-detail-description',
        '.module_product_specification .richtext-detail',
        '#product-description',
        '[data-testid="product-description"]',
        '.product-description-text',
        '.description-content',
        '.product-detail',
        '.product-info .description',
        '.product-detail .description'
      ];
      
      for (const selector of descSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          let content = '';
          if (el.tagName === 'IFRAME') {
            try {
              const doc = el.contentDocument || el.contentWindow?.document;
              if (doc) {
                const body = doc.querySelector('body');
                if (body) {
                  content = body.textContent.trim();
                }
              }
            } catch (e) {
              content = el.src || '';
            }
          } else {
            content = el.textContent.trim() || el.innerHTML.trim();
          }
          
          if (content && content.length > 10) {
            data.description = content.replace(/\s+/g, ' ').trim().slice(0, 2000);
            break;
          }
        }
      }
      
      // 通过关键词查找
      if (!data.description || data.description.length < 10) {
        const allElements = document.querySelectorAll('div, section, article');
        for (const el of allElements) {
          const text = el.textContent.trim();
          if (text.length > 50 && 
              (el.className.includes('desc') || 
               el.className.includes('description') || 
               el.id.includes('desc') ||
               el.id.includes('description'))) {
            data.description = text.replace(/\s+/g, ' ').trim().slice(0, 2000);
            break;
          }
        }
      }
      
    } catch (e) {
      console.warn('[FloatingHandler] 页面数据提取异常:', e);
    }
    
    return data;
  }

  function extractTitleFromPage() {
    const selectors = [
      'h1[data-testid="product-title"]',
      'h1.product-title',
      'h1[data-spm="100"]',
      '.product-title',
      '.product-name',
      '.title',
      'h1',
      'h2'
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle && metaTitle.content) {
      return metaTitle.content;
    }
    
    return document.title || '未知商品';
  }

  // ============================================================
  // ⭐ 保存数据（通过 Background 执行 fetch，绕过 CORS）- 已完善
  // ============================================================

  async function saveProduct(data, platform) {
    console.log('[FloatingHandler] 通过 Background 保存数据...');
    console.log('[FloatingHandler] 数据大小: description=', data.description?.length || 0, 'images=', data.images?.length || 0);
    
    // ⭐ 调试：打印所有 key
    console.log('[FloatingHandler] data keys:', Object.keys(data));
    
    // ⭐ 从 data 中获取 sku_list 和 variants
    let skuList = data.sku_list || [];
    let variants = data.variants || [];
    
    // ⭐ 策略1: 如果 sku_list 为空，尝试从 window.__floating_last_collect 恢复
    if (skuList.length === 0 && window.__floating_last_collect) {
      const lastCollect = window.__floating_last_collect;
      console.log('[FloatingHandler] 从 __floating_last_collect 恢复数据...');
      console.log('[FloatingHandler] __floating_last_collect.sku_list 数量:', lastCollect.sku_list?.length || 0);
      console.log('[FloatingHandler] __floating_last_collect.variants 数量:', lastCollect.variants?.length || 0);
      
      if (lastCollect.sku_list && lastCollect.sku_list.length > 0) {
        skuList = lastCollect.sku_list;
        console.log('[FloatingHandler] ✅ 从 __floating_last_collect 恢复 sku_list，数量:', skuList.length);
      }
      if (lastCollect.variants && lastCollect.variants.length > 0) {
        variants = lastCollect.variants;
        console.log('[FloatingHandler] ✅ 从 __floating_last_collect 恢复 variants，数量:', variants.length);
      }
    }
    
    // ⭐ 策略2: 如果 sku_list 为空，尝试从 data._original 恢复
    if (skuList.length === 0 && data._original) {
      console.log('[FloatingHandler] 尝试从 data._original 恢复...');
      if (data._original.sku_list && data._original.sku_list.length > 0) {
        skuList = data._original.sku_list;
        console.log('[FloatingHandler] ✅ 从 data._original 恢复 sku_list，数量:', skuList.length);
      }
      if (data._original.variants && data._original.variants.length > 0) {
        variants = data._original.variants;
        console.log('[FloatingHandler] ✅ 从 data._original 恢复 variants，数量:', variants.length);
      }
    }
    
    // ⭐ 策略3: 如果还是空，尝试从 data 的其他字段获取
    if (skuList.length === 0) {
      // 尝试从 data 中查找任何可能包含 SKU 的字段
      const possibleSkuFields = ['skus', 'sku_options', 'options', 'product_options', 'variation'];
      for (const field of possibleSkuFields) {
        if (data[field] && Array.isArray(data[field]) && data[field].length > 0) {
          skuList = data[field];
          console.log('[FloatingHandler] ✅ 从 data.' + field + ' 获取 sku_list，数量:', skuList.length);
          break;
        }
      }
    }
    
    console.log('[FloatingHandler] 最终 sku_list 数量:', skuList.length);
    console.log('[FloatingHandler] 最终 variants 数量:', variants.length);
    
    if (skuList.length > 0) {
      console.log('[FloatingHandler] sku_list 内容 (前2项):', JSON.stringify(skuList.slice(0, 2), null, 2));
    }
    if (variants.length > 0) {
      console.log('[FloatingHandler] variants 内容 (前2项):', JSON.stringify(variants.slice(0, 2), null, 2));
    }
    
    // ⭐ 构建要发送的数据 - 同时保留 sku_list 和 variants
    const sendData = {
      platform: data.platform || platform || 'alibaba',
      url: data.url || window.location.href,
      title: data.title || '未知商品',
      price: data.price || 'N/A',
      images: Array.isArray(data.images) ? data.images : [],
      description: data.description || '',
      // ⭐ 同时传递 sku_list 和 variants（product-mapper 会处理）
      sku_list: skuList,
      variants: variants,
      attributes: data.attributes || {},
      supplier: data.supplier || '',
      currency: data.currency || 'USD',
      moq: data.moq || '1',
      timestamp: data.timestamp || new Date().toISOString()
    };
    
    console.log('[FloatingHandler] 发送数据 - sku_list 数量:', sendData.sku_list.length);
    console.log('[FloatingHandler] 发送数据 - variants 数量:', sendData.variants.length);
    
    // ⭐ 验证发送数据
    if (sendData.sku_list.length === 0 && sendData.variants.length === 0) {
      console.warn('[FloatingHandler] ⚠️ 警告：发送数据中 sku_list 和 variants 都为空！');
    }
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'SAVE_PRODUCT_FROM_FLOATING',
        data: sendData,
        platform: platform || 'alibaba'
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[FloatingHandler] 发送保存请求失败:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        console.log('[FloatingHandler] 保存响应:', response);
        
        if (response && response.success) {
          // ⭐ 确保返回的响应中包含 saved、exists、failed
          resolve({
            success: true,
            saved: response.saved || 0,
            exists: response.exists || 0,
            failed: response.failed || 0,
            id: response.id || null,
            error: response.error || null
          });
        } else {
          reject(new Error(response?.error || '保存失败'));
        }
      });
    });
  }

  // ============================================================
  // 获取状态
  // ============================================================

  function getStatus() {
    const platform = detectPlatform();
    const loaded = checkAdapters();
    return {
      platformId: platform || '未知',
      isLoaded: loaded,
      connectionStatus: loaded ? 'connected' : 'idle'
    };
  }

  // ============================================================
  // ⭐ 处理来自 UI 的 FLOATING_REQUEST 消息
  // ============================================================

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    const data = event.data;
    if (!data || data.type !== 'FLOATING_REQUEST') return;
    
    const { eventId, message } = data;
    console.log('[FloatingHandler] 收到 FLOATING_REQUEST:', message?.action, 'eventId:', eventId);
    
    if (!message || typeof message !== 'object') {
      window.postMessage({
        type: 'FLOATING_RESPONSE',
        eventId: eventId,
        error: '无效的消息格式'
      }, '*');
      return;
    }
    
    // 处理 ping
    if (message.action === 'ping') {
      window.postMessage({
        type: 'FLOATING_RESPONSE',
        eventId: eventId,
        response: { success: true, message: 'pong' }
      }, '*');
      return;
    }
    
    // 处理 getStatus
    if (message.action === 'getStatus') {
      try {
        const status = getStatus();
        window.postMessage({
          type: 'FLOATING_RESPONSE',
          eventId: eventId,
          response: { success: true, ...status }
        }, '*');
      } catch (error) {
        window.postMessage({
          type: 'FLOATING_RESPONSE',
          eventId: eventId,
          error: error.message
        }, '*');
      }
      return;
    }
    
    // ⭐ 处理 getConfigStatus - 通过 Background 获取配置状态
    if (message.action === 'getConfigStatus') {
      try {
        chrome.runtime.sendMessage({
          type: 'GET_CONFIG_STATUS'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[FloatingHandler] GET_CONFIG_STATUS lastError:', chrome.runtime.lastError);
            window.postMessage({
              type: 'FLOATING_RESPONSE',
              eventId: eventId,
              response: {
                success: false,
                hasApiBase: false,
                hasValidToken: false,
                error: chrome.runtime.lastError.message
              }
            }, '*');
            return;
          }
          
          console.log('[FloatingHandler] GET_CONFIG_STATUS 响应:', response);
          window.postMessage({
            type: 'FLOATING_RESPONSE',
            eventId: eventId,
            response: {
              success: true,
              hasApiBase: response?.hasApiBase || false,
              hasValidToken: response?.hasValidToken || false,
              apiBase: response?.apiBase || null
            }
          }, '*');
        });
        return;
      } catch (e) {
        console.error('[FloatingHandler] getConfigStatus 异常:', e);
        window.postMessage({
          type: 'FLOATING_RESPONSE',
          eventId: eventId,
          response: {
            success: false,
            hasApiBase: false,
            hasValidToken: false,
            error: e.message
          }
        }, '*');
        return;
      }
    }
    
    // 处理 loadAdapter
    if (message.action === 'loadAdapter') {
      const platform = detectPlatform();
      if (!platform) {
        window.postMessage({
          type: 'FLOATING_RESPONSE',
          eventId: eventId,
          response: { success: false, error: '当前页面不支持采集' }
        }, '*');
        return;
      }
      
      loadAdapters(platform)
        .then((result) => {
          window.postMessage({
            type: 'FLOATING_RESPONSE',
            eventId: eventId,
            response: { success: true, platform: result?.platform || platform }
          }, '*');
        })
        .catch((error) => {
          window.postMessage({
            type: 'FLOATING_RESPONSE',
            eventId: eventId,
            response: { success: false, error: error.message }
          }, '*');
        });
      return;
    }
    
    // ⭐ 处理 collect（核心采集）- 修复：确保返回 saved、exists、failed
    if (message.action === 'collect') {
      (async function() {
        try {
          console.log('[FloatingHandler] 开始处理 collect (postMessage)');
          
          const platform = detectPlatform();
          if (!platform) {
            window.postMessage({
              type: 'FLOATING_RESPONSE',
              eventId: eventId,
              response: { 
                success: false, 
                error: '当前页面不支持采集',
                saved: 0,
                exists: 0,
                failed: 0
              }
            }, '*');
            return;
          }
          
          // 1. 采集完整数据
          const rawData = await performCollect();
          console.log('[FloatingHandler] 采集完成');
          console.log('[FloatingHandler] description 原始长度:', rawData.description?.length || 0);
          console.log('[FloatingHandler] images 数量:', rawData.images?.length || 0);
          console.log('[FloatingHandler] sku_list 数量:', rawData.sku_list?.length || 0);
          
          // ⭐ 确保 rawData 包含 sku_list（如果丢失，从 __floating_last_collect 恢复）
          if ((!rawData.sku_list || rawData.sku_list.length === 0) && window.__floating_last_collect) {
            const lastCollect = window.__floating_last_collect;
            if (lastCollect.sku_list && lastCollect.sku_list.length > 0) {
              rawData.sku_list = lastCollect.sku_list;
              console.log('[FloatingHandler] collect 中从 __floating_last_collect 恢复 sku_list，数量:', rawData.sku_list.length);
            }
            if (lastCollect.variants && lastCollect.variants.length > 0) {
              rawData.variants = lastCollect.variants;
              console.log('[FloatingHandler] collect 中从 __floating_last_collect 恢复 variants，数量:', rawData.variants.length);
            }
          }
          
          // 2. 通过 Background 保存完整数据
          const result = await saveProduct(rawData, platform);
          console.log('[FloatingHandler] 保存结果:', result);
          
          // 3. 构建精简响应数据（避免 postMessage 截断）
          const descPreview = rawData.description 
            ? rawData.description.substring(0, 300) + (rawData.description.length > 300 ? '...' : '') 
            : '';
          
          const slimData = {
            platform: rawData.platform,
            url: rawData.url,
            title: rawData.title,
            price: rawData.price,
            images: Array.isArray(rawData.images) ? rawData.images.slice(0, 5) : [],
            description: descPreview,
            description_full_length: rawData.description?.length || 0,
            sku_list: Array.isArray(rawData.sku_list) ? rawData.sku_list.slice(0, 5) : [],
            variants: Array.isArray(rawData.variants) ? rawData.variants.slice(0, 5) : [],
            attributes: rawData.attributes || {},
            supplier: rawData.supplier || '',
            currency: rawData.currency || 'USD',
            moq: rawData.moq || '1',
            timestamp: rawData.timestamp
          };
          
          // ⭐ 4. 返回完整响应（包含 saved、exists、failed）
          window.postMessage({
            type: 'FLOATING_RESPONSE',
            eventId: eventId,
            response: {
              success: true,
              data: slimData,
              title: rawData.title || '商品',
              price: rawData.price || '',
              description: descPreview,
              description_full_length: rawData.description?.length || 0,
              sku_count: rawData.sku_list?.length || 0,
              variants_count: rawData.variants?.length || 0,
              // ⭐ 关键：传递保存结果字段
              saved: result.saved || 0,
              exists: result.exists || 0,
              failed: result.failed || 0,
              error: result.error || null
            }
          }, '*');
          
          console.log('[FloatingHandler] ✅ 响应已发送');
          console.log('[FloatingHandler] ✅ saved:', result.saved || 0);
          console.log('[FloatingHandler] ✅ exists:', result.exists || 0);
          console.log('[FloatingHandler] ✅ failed:', result.failed || 0);
          console.log('[FloatingHandler] ✅ sku_list 数量:', rawData.sku_list?.length || 0);
          console.log('[FloatingHandler] ✅ variants 数量:', rawData.variants?.length || 0);
          
        } catch (error) {
          console.error('[FloatingHandler] collect 异常:', error);
          window.postMessage({
            type: 'FLOATING_RESPONSE',
            eventId: eventId,
            response: { 
              success: false, 
              error: error.message || String(error),
              saved: 0,
              exists: 0,
              failed: 0,
              data: null
            }
          }, '*');
        }
      })();
      return;
    }
    
    // 未知消息
    console.warn('[FloatingHandler] 未知消息类型:', message.action);
    window.postMessage({
      type: 'FLOATING_RESPONSE',
      eventId: eventId,
      response: { success: false, error: '未知消息类型: ' + message.action }
    }, '*');
  });

  // ============================================================
  // ⭐ 暴露 API 供直接调用
  // ============================================================

  const FloatingHandlerAPI = {
    collect: performCollect,
    getStatus: getStatus,
    loadAdapter: loadAdapters,
    isAdapterLoaded: checkAdapters,
    detectPlatform: detectPlatform,
    saveProduct: saveProduct,
    version: '1.0.0'
  };

  window.__jeekuaFloatingHandler = FloatingHandlerAPI;

  console.log('[FloatingHandler] ✅ API 已挂载到 window.__jeekuaFloatingHandler');
  console.log('[FloatingHandler] ✅ 可用方法:', Object.keys(FloatingHandlerAPI).join(', '));
  console.log('[FloatingHandler] ✅ 已就绪，等待调用');

})();