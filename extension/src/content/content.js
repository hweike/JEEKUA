// src/content/content.js
console.log('🔥 Content Script 已注入！当前页面:', window.location.href);

// ============================================================
// ⭐ 优先注册 JEEKUA_REQUEST 监听器（Popup 专用）
// ============================================================

window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  var data = event.data;
  if (!data || data.type !== 'JEEKUA_REQUEST') return;
  
  var eventId = data.eventId;
  var message = data.message;
  
  console.log('[Content] ✅ 收到 JEEKUA_REQUEST:', message, 'eventId:', eventId);
  
  if (!message || typeof message !== 'object') {
    window.postMessage({
      type: 'JEEKUA_RESPONSE',
      eventId: eventId,
      error: '无效的消息格式'
    }, '*');
    return;
  }
  
  // ⭐ 处理 getStatus
  if (message.action === 'getStatus') {
    console.log('[Content] 处理 getStatus 请求');
    var platform = detectPlatform(window.location.href);
    var loaded = checkAdapters();
    var response = {
      success: true,
      isSupported: !!platform,
      platformId: platform || STATE.platform,
      isLoaded: loaded || STATE.adapterLoaded,
      connectionStatus: STATE.connectionStatus || 'idle'
    };
    console.log('[Content] getStatus 响应:', response);
    window.postMessage({
      type: 'JEEKUA_RESPONSE',
      eventId: eventId,
      response: response
    }, '*');
    return;
  }
  
  // ⭐ 处理 getConfigStatus（检查独立站配置状态）
  if (message.action === 'getConfigStatus') {
    console.log('[Content] 处理 getConfigStatus 请求');
    
    chrome.storage.local.get(['api_base', 'api_token', 'api_token_expires_at'], function(result) {
      var apiBase = result.api_base || null;
      var token = result.api_token || null;
      var expiresAt = result.api_token_expires_at || null;
      
      var hasApiBase = !!apiBase;
      var hasValidToken = false;
      
      // ⭐ 增强 Token 验证逻辑
      if (token) {
        if (expiresAt) {
          var now = new Date();
          var expiry = new Date(expiresAt);
          hasValidToken = expiry > now;
          console.log('[Content] Token 过期检查 - 现在:', now.toISOString(), '过期时间:', expiry.toISOString(), '有效:', hasValidToken);
        } else {
          hasValidToken = true;
          console.log('[Content] Token 无过期时间，视为有效');
        }
      }
      
      var response = {
        success: true,
        hasApiBase: hasApiBase,
        hasValidToken: hasValidToken,
        apiBase: apiBase,
        tokenExists: !!token,
        isExpired: token && expiresAt && new Date(expiresAt) < new Date()
      };
      
      console.log('[Content] getConfigStatus 响应:', response);
      window.postMessage({
        type: 'JEEKUA_RESPONSE',
        eventId: eventId,
        response: response
      }, '*');
    });
    
    return;
  }
  
  // ⭐ 处理 ping
  if (message.action === 'ping') {
    window.postMessage({
      type: 'JEEKUA_RESPONSE',
      eventId: eventId,
      response: { success: true, message: 'pong' }
    }, '*');
    return;
  }
  
  // ⭐ 处理 loadAdapter（Popup 专用）
  if (message.action === 'loadAdapter') {
    console.log('[Content] 处理 loadAdapter 请求');
    var platform = detectPlatform(window.location.href);
    if (!platform) {
      window.postMessage({
        type: 'JEEKUA_RESPONSE',
        eventId: eventId,
        response: { success: false, error: '当前页面不支持采集' }
      }, '*');
      return;
    }
    
    loadAdapters(platform)
      .then(function(result) {
        window.postMessage({
          type: 'JEEKUA_RESPONSE',
          eventId: eventId,
          response: { success: true, platform: result?.platform || platform }
        }, '*');
      })
      .catch(function(error) {
        window.postMessage({
          type: 'JEEKUA_RESPONSE',
          eventId: eventId,
          response: { success: false, error: error.message }
        }, '*');
      });
    return;
  }
  
  // ⭐ 处理 collect - 通过 postMessage 转发到 floating-handler
  if (message.action === 'collect') {
    console.log('[Content] 转发 collect 请求到 floating-handler (postMessage)');
    
    // ⭐ 生成唯一 ID 用于匹配响应
    var floatingEventId = 'floating_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    
    // ⭐ 监听 floating-handler 的响应
    var floatingHandler = function(event) {
      if (event.source !== window) return;
      var data = event.data;
      if (!data || data.type !== 'FLOATING_RESPONSE' || data.eventId !== floatingEventId) return;
      
      window.removeEventListener('message', floatingHandler);
      
      console.log('[Content] 收到 floating-handler 响应:', data.response);
      
      // ⭐ 直接转发响应到 ui.js
      window.postMessage({
        type: 'JEEKUA_RESPONSE',
        eventId: eventId,
        response: data.response
      }, '*');
    };
    
    window.addEventListener('message', floatingHandler);
    
    // ⭐ 发送 FLOATING_REQUEST 到 floating-handler
    window.postMessage({
      type: 'FLOATING_REQUEST',
      eventId: floatingEventId,
      message: { action: 'collect' }
    }, '*');
    
    return;
  }
  
  // 未知消息
  console.warn('[Content] 未知 JEEKUA_REQUEST:', message.action);
  window.postMessage({
    type: 'JEEKUA_RESPONSE',
    eventId: eventId,
    response: { success: false, error: '未知消息类型: ' + message.action }
  }, '*');
});

console.log('[Content] ✅ JEEKUA_REQUEST 监听器已注册');

// ============================================================
// 状态管理
// ============================================================

var STATE = {
  platform: null,
  adapterLoaded: false,
  connectionStatus: 'idle'
};

function detectPlatform(url) {
  if (/1688\.com/.test(url)) return '1688';
  if (/alibaba\.com/.test(url)) return 'alibaba';
  return null;
}

function updateState(updates) {
  if (updates.platform !== undefined) STATE.platform = updates.platform;
  if (updates.adapterLoaded !== undefined) STATE.adapterLoaded = !!updates.adapterLoaded;
  if (updates.connectionStatus !== undefined) {
    var validStatuses = ['idle', 'connecting', 'connected', 'error'];
    STATE.connectionStatus = validStatuses.indexOf(updates.connectionStatus) !== -1 ? updates.connectionStatus : 'idle';
  }
  
  var safeState = {
    platform: STATE.platform ? String(STATE.platform).slice(0, 50) : null,
    adapterLoaded: STATE.adapterLoaded === true,
    connectionStatus: ['idle', 'connecting', 'connected', 'error'].indexOf(STATE.connectionStatus) !== -1 
      ? STATE.connectionStatus 
      : 'idle'
  };
  
  try {
    window.postMessage({
      type: 'JEEKUA_STATE_CHANGE',
      state: safeState
    }, '*');
  } catch (e) {
    console.warn('[Content] postMessage 状态通知失败:', e.message);
  }
  
  try {
    document.dispatchEvent(new CustomEvent('JEEKUA_STATE_CHANGE', {
      detail: { state: safeState }
    }));
  } catch (e) {}
  
  console.log('[Content] 状态更新:', safeState);
}

function checkAdapters() {
  try {
    var hasBase = !!(window.__adapters && window.__adapters.BaseAdapter);
    var adapterKey = STATE.platform === '1688' ? 'China1688Adapter' : 'AlibabaAdapter';
    var hasPlatform = STATE.platform && window.__adapters && window.__adapters[adapterKey];
    
    var loaded = !!(hasBase && hasPlatform);
    if (loaded !== STATE.adapterLoaded) {
      updateState({ adapterLoaded: loaded });
    }
    return loaded;
  } catch (e) {
    console.warn('[Content] checkAdapters 异常:', e);
    return false;
  }
}

// ============================================================
// ⭐ 注入 ui.js 到 MAIN 世界（通过 script 标签）
// ============================================================

function injectUI() {
  if (document.querySelector('script[src*="ui.js"]')) {
    console.log('[Content] ui.js 已存在，跳过注入');
    return;
  }
  
  console.log('[Content] 通过 script 标签注入 ui.js 到 MAIN 世界...');
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/content/ui.js');
  script.onload = function() {
    console.log('[Content] ✅ ui.js 注入成功');
  };
  script.onerror = function() {
    console.error('[Content] ❌ ui.js 注入失败');
  };
  document.head.appendChild(script);
}

// ============================================================
// ⭐ 注入 floating-handler.js（通过 Background）
// ============================================================

function injectFloatingHandler() {
  if (window.__jeekuaFloatingHandler && typeof window.__jeekuaFloatingHandler === 'object') {
    console.log('[Content] floating-handler.js 已注入，跳过');
    return;
  }
  
  console.log('[Content] 通过 Background 注入 floating-handler.js...');
  chrome.runtime.sendMessage({
    type: 'INJECT_FLOATING_HANDLER'
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('[Content] ❌ floating-handler.js 注入失败:', chrome.runtime.lastError.message);
      return;
    }
    console.log('[Content] ✅ floating-handler.js 注入结果:', response);
    if (response && response.success) {
      console.log('[Content] floating-handler.js 注入已触发，等待 API 就绪...');
    }
  });
}

// ============================================================
// ⭐ 适配器加载 - 通过 Background 注入（Popup 专用）
// ============================================================

function loadAdapters(platformId) {
  console.log('[Content] 开始动态加载 ' + platformId + ' 适配器...');
  updateState({ connectionStatus: 'connecting' });
  
  var platformFile = platformId === '1688' 
    ? 'src/adapters/china-1688-adapter.js'
    : 'src/adapters/alibaba-adapter.js';
  
  var files = [
    'src/utils/config-loader.js',
    'src/adapters/base-adapter.js',
    platformFile
  ];
  
  return new Promise(function(resolve, reject) {
    chrome.runtime.sendMessage({
      type: 'INJECT_ADAPTER_FILES',
      files: files
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('[Content] 注入失败:', chrome.runtime.lastError.message);
        updateState({ connectionStatus: 'error' });
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        console.log('[Content] ✅ ' + platformId + ' 适配器加载完成');
        setTimeout(function() {
          var loaded = checkAdapters();
          if (loaded) {
            updateState({ adapterLoaded: true, connectionStatus: 'connected' });
            resolve({ platform: platformId });
          } else {
            setTimeout(function() {
              var loaded2 = checkAdapters();
              if (loaded2) {
                updateState({ adapterLoaded: true, connectionStatus: 'connected' });
                resolve({ platform: platformId });
              } else {
                updateState({ connectionStatus: 'error' });
                reject(new Error('适配器加载完成但未挂载到 window'));
              }
            }, 1000);
          }
        }, 300);
      } else {
        var errorMsg = response?.error || '未知错误';
        console.error('[Content] 注入失败:', errorMsg);
        updateState({ connectionStatus: 'error' });
        reject(new Error(errorMsg));
      }
    });
  });
}

// ============================================================
// 从页面直接提取数据的备用函数
// ============================================================

function extractFromPage(platform) {
  var data = {
    platform: platform,
    url: window.location.href,
    title: '',
    price: 'N/A',
    images: [],
    description: ''
  };
  
  try {
    var titleSelectors = [
      'h1[data-testid="product-title"]',
      'h1.product-title',
      'h1[data-spm="100"]',
      '.product-title',
      '.product-name',
      '.title',
      'h1',
      'h2'
    ];
    
    for (var i = 0; i < titleSelectors.length; i++) {
      var el = document.querySelector(titleSelectors[i]);
      if (el && el.textContent.trim()) {
        data.title = el.textContent.trim();
        break;
      }
    }
    
    if (!data.title) {
      data.title = document.title || '未知商品';
    }
    
    var priceSelectors = [
      '[data-testid="product-price"]',
      '.product-price',
      '.price',
      '.price span',
      '[data-spm="200"]',
      '.price-discount',
      '.price-now'
    ];
    
    for (var j = 0; j < priceSelectors.length; j++) {
      var el2 = document.querySelector(priceSelectors[j]);
      if (el2 && el2.textContent.trim()) {
        var priceText = el2.textContent.trim();
        var priceMatch = priceText.match(/[\d,\.]+/);
        if (priceMatch) {
          data.price = priceMatch[0];
          break;
        }
      }
    }
    
    var imageSelectors = [
      '.product-image img',
      '[data-testid="product-image"] img',
      '.main-image img',
      '.images img',
      '.gallery img'
    ];
    
    var images = [];
    for (var k = 0; k < imageSelectors.length; k++) {
      var els = document.querySelectorAll(imageSelectors[k]);
      for (var m = 0; m < els.length; m++) {
        var src = els[m].src || els[m].getAttribute('data-src') || els[m].getAttribute('srcset');
        if (src && src.startsWith('http')) {
          images.push(src);
        }
        if (images.length >= 5) break;
      }
      if (images.length >= 5) break;
    }
    data.images = images;
    
    var descSelectors = [
      '.product-description',
      '.description',
      '[data-testid="product-description"]',
      '.detail-content'
    ];
    
    for (var n = 0; n < descSelectors.length; n++) {
      var el3 = document.querySelector(descSelectors[n]);
      if (el3 && el3.textContent.trim()) {
        data.description = el3.textContent.trim().slice(0, 500);
        break;
      }
    }
    
  } catch (e) {
    console.warn('[Content] 页面数据提取异常:', e);
  }
  
  console.log('[Content] 从页面提取的数据:', data);
  return data;
}

function extractTitleFromPage() {
  var selectors = [
    'h1[data-testid="product-title"]',
    'h1.product-title',
    'h1[data-spm="100"]',
    '.product-title',
    '.product-name',
    '.title',
    'h1',
    'h2'
  ];
  
  for (var i = 0; i < selectors.length; i++) {
    var el = document.querySelector(selectors[i]);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  
  var metaTitle = document.querySelector('meta[property="og:title"]');
  if (metaTitle && metaTitle.content) {
    return metaTitle.content;
  }
  
  return document.title || '未知商品';
}

// ============================================================
// ⭐ performCollect - 执行采集（保留作为降级方案）
// ============================================================

async function performCollect() {
  console.log('[Content] 执行采集（降级方案）...');
  
  var platform = detectPlatform(window.location.href);
  if (!platform) throw new Error('不支持的平台');
  
  var loaded = checkAdapters();
  if (!loaded) {
    console.log('[Content] 适配器未加载，尝试自动重新加载...');
    updateState({ connectionStatus: 'connecting' });
    await loadAdapters(platform);
    if (!checkAdapters()) {
      throw new Error('适配器加载失败');
    }
  }
  
  var adapterKey = platform === '1688' ? 'China1688Adapter' : 'AlibabaAdapter';
  var AdapterClass = window.__adapters?.[adapterKey];
  if (!AdapterClass) throw new Error('适配器 ' + adapterKey + ' 未找到');
  
  var adapter = new AdapterClass();
  var result;
  try {
    result = await adapter.scrape();
  } catch (e) {
    console.error('[Content] 适配器采集异常:', e);
    result = extractFromPage(platform);
  }
  
  if (!result || !result.title || !result.url) {
    console.log('[Content] 适配器返回数据不完整，尝试从页面直接提取...');
    var pageData = extractFromPage(platform);
    result = { ...result, ...pageData };
  }
  
  var safeResult = {
    platform: result?.platform || platform,
    url: result?.url || window.location.href,
    title: result?.title || document.title || '未知商品',
    price: result?.price || 'N/A',
    images: Array.isArray(result?.images) ? result.images.slice(0, 10) : [],
    description: result?.description || '',
    timestamp: new Date().toISOString()
  };
  
  if (!safeResult.title || safeResult.title === '未知商品') {
    safeResult.title = extractTitleFromPage();
  }
  
  console.log('[Content] 采集结果:', safeResult);
  
  return {
    success: true,
    data: safeResult,
    title: safeResult.title,
    price: safeResult.price
  };
}

// ============================================================
// ⭐ 悬浮面板样式
// ============================================================

function getFloatingStyles() {
  return `
    .jeekua-float-btn {
      position: fixed;
      bottom: 100px;
      right: 30px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #1a73e8;
      color: white;
      border: none;
      box-shadow: 0 4px 16px rgba(26, 115, 232, 0.4);
      cursor: pointer;
      z-index: 999999;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .jeekua-float-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(26, 115, 232, 0.5);
    }
    .jeekua-float-btn:active {
      transform: scale(0.95);
    }
    .jeekua-float-btn .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #adb5bd;
      font-size: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      color: white;
      font-weight: 700;
      transition: background 0.3s;
    }
    .jeekua-float-btn .badge.ready { background: #34a853; }
    .jeekua-float-btn .badge.loading { background: #f9a825; animation: pulse 1s infinite; }
    .jeekua-float-btn .badge.error { background: #ea4335; }
    .jeekua-float-btn .badge.idle { background: #adb5bd; }
    .jeekua-float-btn.minimized {
      bottom: 30px;
      right: 30px;
      width: 48px;
      height: 48px;
      font-size: 20px;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    
    .jeekua-panel {
      position: fixed;
      bottom: 170px;
      right: 30px;
      width: 380px;
      max-height: 560px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
      z-index: 999998;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid rgba(0, 0, 0, 0.06);
      animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .jeekua-panel.open {
      display: flex;
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .jeekua-panel-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f1f3f5;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .jeekua-panel-header .title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .jeekua-panel-header .title .version {
      font-size: 10px;
      font-weight: 400;
      color: #adb5bd;
      background: #f1f3f5;
      padding: 1px 8px;
      border-radius: 10px;
    }
    .jeekua-panel-header .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      color: #adb5bd;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
      transition: color 0.2s;
    }
    .jeekua-panel-header .close-btn:hover {
      color: #495057;
    }
    .jeekua-panel-header .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .jeekua-drag-handle {
      cursor: move;
      padding: 4px 8px;
      color: #dee2e6;
      font-size: 14px;
      user-select: none;
      display: inline-block;
    }
    .jeekua-drag-handle:hover {
      color: #adb5bd;
    }
    
    .jeekua-panel-body {
      padding: 16px 20px 20px;
      overflow-y: auto;
      flex: 1;
      max-height: 460px;
    }
    
    .jeekua-status {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 8px;
      background: #f8f9fa;
      font-size: 13px;
      margin-bottom: 14px;
    }
    .jeekua-status .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: background 0.3s;
    }
    .jeekua-status .dot.ready { background: #34a853; }
    .jeekua-status .dot.loading { background: #f9a825; animation: pulse 1s infinite; }
    .jeekua-status .dot.error { background: #ea4335; }
    .jeekua-status .dot.idle { background: #adb5bd; }
    .jeekua-status .status-tag {
      font-size: 10px;
      padding: 1px 10px;
      border-radius: 12px;
      margin-left: auto;
      background: #e9ecef;
      color: #495057;
    }
    .jeekua-status .status-tag.connected { background: #d4edda; color: #155724; }
    .jeekua-status .status-tag.disconnected { background: #f8d7da; color: #721c24; }
    .jeekua-status .status-tag.connecting { background: #fff3cd; color: #856404; }
    
    .jeekua-btn-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .jeekua-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .jeekua-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .jeekua-btn.primary {
      background: #1a73e8;
      color: white;
    }
    .jeekua-btn.primary:hover:not(:disabled) {
      background: #1557b0;
    }
    .jeekua-btn.success {
      background: #34a853;
      color: white;
    }
    .jeekua-btn.success:hover:not(:disabled) {
      background: #2d9248;
    }
    .jeekua-btn.outline {
      background: #f1f3f5;
      color: #495057;
    }
    .jeekua-btn.outline:hover:not(:disabled) {
      background: #e9ecef;
    }
    .jeekua-btn.warning {
      background: #f9a825;
      color: #1a1a2e;
    }
    .jeekua-btn.warning:hover:not(:disabled) {
      background: #f57f17;
      color: white;
    }
    
    .jeekua-log {
      margin-top: 12px;
      padding: 10px 12px;
      background: #1e1e2e;
      color: #cdd6f4;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      max-height: 120px;
      overflow: auto;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .jeekua-log .ok { color: #a6e3a1; }
    .jeekua-log .err { color: #f38ba8; }
    .jeekua-log .warn { color: #f9e2af; }
    .jeekua-log .info { color: #89b4fa; }
    
    .jeekua-connection-banner {
      font-size: 11px;
      padding: 4px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      text-align: center;
      display: none;
    }
    .jeekua-connection-banner.show {
      display: block;
    }
    .jeekua-connection-banner.connected {
      background: #d4edda;
      color: #155724;
      display: block;
    }
    .jeekua-connection-banner.disconnected {
      background: #f8d7da;
      color: #721c24;
      display: block;
    }
    .jeekua-connection-banner.connecting {
      background: #fff3cd;
      color: #856404;
      display: block;
    }
    
    @media (max-width: 480px) {
      .jeekua-panel { width: calc(100vw - 32px); right: 16px; bottom: 160px; max-height: 460px; }
      .jeekua-float-btn { bottom: 80px; right: 16px; width: 48px; height: 48px; font-size: 20px; }
      .jeekua-float-btn.minimized { bottom: 24px; right: 16px; width: 44px; height: 44px; font-size: 18px; }
    }
  `;
}

// ============================================================
// ⭐ 直接创建悬浮面板 DOM
// ============================================================

var floatingUIInjected = false;

function createFloatingUI() {
  // ⭐ 检查是否在支持的平台
  var platform = detectPlatform(window.location.href);
  if (!platform) {
    console.log('[Content] 当前页面不支持采集，不显示悬浮面板');
    return;
  }
  
  if (floatingUIInjected) {
    console.log('[Content] 悬浮 UI 已创建，跳过');
    return;
  }
  
  if (document.querySelector('.jeekua-float-btn')) {
    console.log('[Content] 悬浮按钮已存在，标记为已创建');
    floatingUIInjected = true;
    return;
  }
  
  console.log('[Content] 直接创建悬浮面板...');
  
  // 1. 注入样式
  var styleEl = document.createElement('style');
  styleEl.id = 'jeekuaStyles';
  styleEl.textContent = getFloatingStyles();
  document.head.appendChild(styleEl);
  
  // 2. 创建悬浮按钮
  var floatBtn = document.createElement('button');
  floatBtn.className = 'jeekua-float-btn minimized';
  floatBtn.id = 'jeekuaFloatBtn';
  floatBtn.innerHTML = '🛒<span class="badge" id="jeekuaBadge">●</span>';
  document.body.appendChild(floatBtn);
  
  // 3. 创建面板
  var panel = document.createElement('div');
  panel.className = 'jeekua-panel';
  panel.id = 'jeekuaPanel';
  panel.innerHTML = 
    '<div class="jeekua-panel-header">' +
      '<div class="title">' +
        '🛒 商品采集器' +
        '<span class="version">v1.0</span>' +
      '</div>' +
      '<div class="header-actions">' +
        '<span class="jeekua-drag-handle" title="拖拽移动">⠿</span>' +
        '<button class="close-btn" id="jeekuaClose">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="jeekua-panel-body">' +
      '<div class="jeekua-connection-banner" id="jeekuaBanner"></div>' +
      '<div class="jeekua-status" id="jeekuaStatus">' +
        '<span class="dot idle" id="jeekuaDot"></span>' +
        '<span id="jeekuaStatusText">就绪</span>' +
        '<span class="status-tag" id="jeekuaStatusTag">● 待检测</span>' +
      '</div>' +
      '<div class="jeekua-btn-group">' +
        '<button class="jeekua-btn primary" id="jeekuaLoadBtn">📥 加载适配器</button>' +
        '<button class="jeekua-btn success" id="jeekuaCollectBtn" disabled>📦 采集商品</button>' +
        '<button class="jeekua-btn outline" id="jeekuaDetectBtn">🔍 检测状态</button>' +
        '<button class="jeekua-btn warning" id="jeekuaReconnectBtn" style="display:none;">🔄 重新连接</button>' +
      '</div>' +
      '<div class="jeekua-log" id="jeekuaLog">等待操作...</div>' +
    '</div>';
  document.body.appendChild(panel);
  
  floatingUIInjected = true;
  console.log('[Content] ✅ 悬浮面板创建成功');
  
  // ⭐ 绑定事件（只控制面板开/关）
  bindFloatingEvents(floatBtn, panel);
}

// ============================================================
// ⭐ 绑定悬浮面板事件（只负责面板开/关）
// ============================================================

function bindFloatingEvents(floatBtn, panel) {
  var closeBtn = document.getElementById('jeekuaClose');
  
  // ⭐ 按钮点击事件 - 只控制面板开/关
  floatBtn.addEventListener('click', function() {
    var isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      floatBtn.classList.add('minimized');
    } else {
      panel.classList.add('open');
      floatBtn.classList.remove('minimized');
    }
  });
  
  closeBtn.addEventListener('click', function() {
    panel.classList.remove('open');
    floatBtn.classList.add('minimized');
  });
  
  // ⭐ 拖拽功能
  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var dragHandle = panel.querySelector('.jeekua-drag-handle');
  
  dragHandle.addEventListener('mousedown', function(e) {
    isDragging = true;
    var rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    panel.style.cursor = 'move';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var left = e.clientX - dragOffsetX;
    var top = e.clientY - dragOffsetY;
    left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, left));
    top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, top));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
    panel.style.cursor = '';
  });
  
  console.log('[Content] 🚀 悬浮面板已启动（UI 逻辑由 ui.js 处理）');
}

// ============================================================
// ⭐ 页面变化检测 - 自动重新注入悬浮面板
// ============================================================

function autoCreateOnLoad() {
  if (document.readyState === 'complete') {
    setTimeout(createFloatingUI, 500);
  } else {
    window.addEventListener('load', function() {
      setTimeout(createFloatingUI, 500);
    });
  }
}

var lastUrl = window.location.href;

function checkUrlChange() {
  var currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    console.log('[Content] 检测到 URL 变化，重新创建悬浮面板...');
    lastUrl = currentUrl;
    floatingUIInjected = false;
    setTimeout(createFloatingUI, 800);
  }
}

var urlObserver = new MutationObserver(function() {
  checkUrlChange();
});
urlObserver.observe(document, { subtree: true, childList: true });

window.addEventListener('popstate', function() {
  console.log('[Content] 检测到 popstate，重新创建悬浮面板...');
  floatingUIInjected = false;
  setTimeout(createFloatingUI, 500);
});

// ============================================================
// 转发日志到悬浮面板
// ============================================================

function forwardLogToFloating(message, type) {
  try {
    window.postMessage({
      type: 'JEEKUA_FLOATING_LOG',
      message: message,
      type: type || 'info'
    }, '*');
  } catch (e) {
    console.warn('[Content] 转发日志失败:', e.message);
  }
}

// ============================================================
// ⭐ 处理来自 Popup 的 chrome.runtime 消息
// ============================================================

function handleMessage(message, sender, sendResponse) {
  console.log('[Content] handleMessage 处理:', message);
  
  try {
    if (message.action === 'injectFloatingUI') {
      createFloatingUI();
      setTimeout(function() {
        var injected = !!document.querySelector('.jeekua-float-btn');
        sendResponse({ success: injected });
      }, 500);
      return true;
    }
    
    if (message.action === 'addLog') {
      forwardLogToFloating(message.message, message.type || 'info');
      sendResponse({ success: true });
      return true;
    }
    
    if (message.action === 'loadAdapter') {
      var platform = detectPlatform(window.location.href);
      if (!platform) {
        sendResponse({ success: false, error: '当前页面不支持采集' });
        return true;
      }
      
      if (checkAdapters()) {
        sendResponse({ success: true, platform: platform, alreadyLoaded: true });
        return true;
      }
      
      loadAdapters(platform)
        .then(function(result) {
          sendResponse({ success: true, platform: result?.platform || platform });
        })
        .catch(function(error) {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    // ⭐ 处理 collect - 通过 postMessage 转发到 floating-handler
    if (message.action === 'collect') {
      console.log('[Content] handleMessage: 转发 collect 到 floating-handler');
      
      // ⭐ 生成唯一 ID
      var floatingEventId = 'floating_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      
      // ⭐ 监听响应
      var floatingHandler = function(event) {
        if (event.source !== window) return;
        var data = event.data;
        if (!data || data.type !== 'FLOATING_RESPONSE' || data.eventId !== floatingEventId) return;
        
        window.removeEventListener('message', floatingHandler);
        
        console.log('[Content] handleMessage 收到 floating-handler 响应:', data.response);
        
        // ⭐ 转发到 Popup
        sendResponse({
          success: data.response.success !== false,
          data: data.response.data || {},
          title: data.response.title || '商品',
          price: data.response.price || '',
          saved: data.response.saved || 0,
          exists: data.response.exists || 0,
          failed: data.response.failed || 0,
          error: data.response.error || null
        });
      };
      
      window.addEventListener('message', floatingHandler);
      
      // ⭐ 发送到 floating-handler
      window.postMessage({
        type: 'FLOATING_REQUEST',
        eventId: floatingEventId,
        message: { action: 'collect' }
      }, '*');
      
      return true;
    }
    
    if (message.action === 'getStatus') {
      var platform = detectPlatform(window.location.href);
      var loaded = checkAdapters();
      sendResponse({
        success: true,
        isSupported: !!platform,
        platformId: platform || STATE.platform,
        isLoaded: loaded || STATE.adapterLoaded,
        connectionStatus: STATE.connectionStatus || 'idle'
      });
      return true;
    }
    
    if (message.action === 'ping') {
      sendResponse({ success: true, message: 'pong' });
      return true;
    }
    
    sendResponse({ success: false, error: '未知消息类型: ' + message.action });
    return true;
    
  } catch (error) {
    console.error('[Content] handleMessage 异常:', error);
    sendResponse({ success: false, error: error.message });
    return true;
  }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[Content] 收到 chrome.runtime 消息:', message);
  return handleMessage(message, sender, sendResponse);
});

console.log('✅ Content Script 消息监听已就绪');

// ============================================================
// ⭐ 初始化
// ============================================================

function initialize() {
  var platform = detectPlatform(window.location.href);
  if (!platform) {
    console.log('[Content] 当前页面不支持采集');
    return;
  }
  
  STATE.platform = platform;
  var loaded = checkAdapters();
  updateState({
    platform: platform,
    adapterLoaded: loaded,
    connectionStatus: loaded ? 'connected' : 'idle'
  });
  
  console.log('[Content] 初始化完成，平台: ' + platform + ', 适配器: ' + (loaded ? '已加载' : '未加载'));
  
  // ⭐ 注入 floating-handler.js（ISOLATED 世界）
  injectFloatingHandler();
  
  // ⭐ 注入 ui.js（MAIN 世界，通过 script 标签）
  injectUI();
  
  // ⭐ 自动创建悬浮面板
  autoCreateOnLoad();
}

initialize();

// 定期检查适配器状态
setInterval(function() {
  var platform = detectPlatform(window.location.href);
  if (platform) {
    var loaded = checkAdapters();
    if (loaded !== STATE.adapterLoaded) {
      updateState({ adapterLoaded: loaded });
    }
  }
}, 10000);

console.log('✅ Content Script 初始化完成');