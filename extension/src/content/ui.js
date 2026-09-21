// src/content/ui.js
(function() {
  'use strict';

  // 防止重复注入
  if (window.__jeekuaUI) {
    console.log('[UI] 悬浮窗已存在，跳过注入');
    return;
  }
  window.__jeekuaUI = true;

  console.log('[UI] 开始创建悬浮窗...');

  // ============================================================
  // ⭐ 复制 getCollectStatus 函数（从 status-helper.js）
  // ============================================================
  
  function getCollectStatus(result, rawData) {
    var title = rawData?.title || rawData?.product_name || '商品';
    var price = rawData?.price || '';
    var shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
    
    if (!result || !result.success) {
      return {
        type: 'error',
        statusType: 'error',
        statusText: '❌ 采集失败: ' + (result?.error || '未知错误'),
        shortStatus: '❌ 采集失败',
        bannerText: '⚠️ ' + (result?.error || '采集失败，请重试'),
        bannerType: 'disconnected',
        logMessage: '❌ 采集失败: ' + (result?.error || '未知错误'),
        logType: 'err',
        saved: 0,
        exists: 0,
        failed: result?.failed || 0,
        tagText: '🔴 失败'
      };
    }
    
    if (result.saved > 0) {
      var priceText = price ? ' ' + price : '';
      return {
        type: 'success',
        statusType: 'ready',
        statusText: '✅ 采集成功（' + result.saved + ' 条） ' + shortTitle + priceText,
        shortStatus: '✅ 采集成功（' + result.saved + ' 条）',
        bannerText: '✅ 已保存 ' + result.saved + ' 条商品数据',
        bannerType: 'connected',
        logMessage: '✅ 采集成功！已保存 ' + result.saved + ' 条商品数据 (' + title + ')' + priceText,
        logType: 'ok',
        saved: result.saved,
        exists: 0,
        failed: 0,
        tagText: '🟢 已连接'
      };
    }
    
    if (result.exists > 0 && result.saved === 0) {
      return {
        type: 'info',
        statusType: 'ready',
        statusText: 'ℹ️ 已采集（' + result.exists + ' 条） ' + shortTitle,
        shortStatus: 'ℹ️ 已采集（' + result.exists + ' 条）',
        bannerText: 'ℹ️ 该商品已采集（' + result.exists + ' 条），无需重复采集',
        bannerType: 'connected',
        logMessage: 'ℹ️ 该商品已采集（' + result.exists + ' 条），无需重复采集: ' + title,
        logType: 'warn',
        saved: 0,
        exists: result.exists,
        failed: 0,
        tagText: '🟢 已连接'
      };
    }
    
    if (result.failed > 0 && result.saved === 0) {
      return {
        type: 'warn',
        statusType: 'error',
        statusText: '❌ 采集失败（' + result.failed + ' 条）',
        shortStatus: '❌ 采集失败',
        bannerText: '⚠️ ' + result.failed + ' 条数据保存失败',
        bannerType: 'disconnected',
        logMessage: '❌ 采集失败，' + result.failed + ' 条数据保存失败: ' + (result.error || '未知错误'),
        logType: 'err',
        saved: 0,
        exists: 0,
        failed: result.failed,
        tagText: '🔴 失败'
      };
    }
    
    return {
      type: 'warn',
      statusType: 'error',
      statusText: '⚠️ 采集完成，状态未知',
      shortStatus: '⚠️ 状态未知',
      bannerText: '请检查独立站配置',
      bannerType: 'disconnected',
      logMessage: '⚠️ 采集完成，状态未知',
      logType: 'warn',
      saved: 0,
      exists: 0,
      failed: 0,
      tagText: '🔴 未知'
    };
  }

  // ============================================================
  // ⭐ 生成唯一 ID
  // ============================================================
  
  function generateId() {
    return 'jeekua_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ============================================================
  // ⭐ 通过 postMessage 与 content.js 通信（使用 JEEKUA_REQUEST）
  // ============================================================
  
  function sendMessageToContent(message, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    return new Promise(function(resolve, reject) {
      var eventId = generateId();
      console.log('[UI] 📤 发送消息:', message.action || message, 'eventId:', eventId);
      
      var startTime = Date.now();
      
      var handler = function(event) {
        if (event.source !== window) return;
        
        var data = event.data;
        if (!data || data.type !== 'JEEKUA_RESPONSE' || data.eventId !== eventId) return;
        
        var elapsed = Date.now() - startTime;
        console.log('[UI] 📥 收到响应 (耗时 ' + elapsed + 'ms):', data);
        
        window.removeEventListener('message', handler);
        clearTimeout(timeout);
        
        if (data.error) {
          console.error('[UI] ❌ 响应错误:', data.error);
          reject(new Error(data.error));
          return;
        }
        
        var response = data.response;
        if (!response) {
          reject(new Error('空响应'));
          return;
        }
        
        resolve(response);
      };
      
      window.addEventListener('message', handler);

      var timeout = setTimeout(function() {
        var elapsed = Date.now() - startTime;
        console.warn('[UI] ⏰ 请求超时 (耗时 ' + elapsed + 'ms):', message.action || message, 'eventId:', eventId);
        window.removeEventListener('message', handler);
        reject(new Error('请求超时 (' + timeoutMs / 1000 + 's)'));
      }, timeoutMs);

      try {
        var cleanMessage = { action: message.action };
        if (message.data !== undefined) cleanMessage.data = message.data;
        if (message.platform !== undefined) cleanMessage.platform = message.platform;
        if (message.apiBase !== undefined) cleanMessage.apiBase = message.apiBase;
        
        console.log('[UI] 📤 postMessage 内容:', JSON.stringify(cleanMessage));
        
        window.postMessage({
          type: 'JEEKUA_REQUEST',  // ⭐ 关键修复：使用 JEEKUA_REQUEST
          eventId: eventId,
          message: cleanMessage
        }, '*');
        console.log('[UI] 📤 消息已发送, 等待响应...');
      } catch (error) {
        console.error('[UI] ❌ postMessage 发送失败:', error);
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        reject(new Error('postMessage 发送失败: ' + error.message));
      }
    });
  }

  // ============================================================
  // ⭐ 检查 Token 配置
  // ============================================================
  function checkTokenConfig() {
    return sendMessageToContent({ action: 'getConfigStatus' }, 5000)
      .then(function(response) {
        if (response && response.success) {
          if (response.hasApiBase && response.hasValidToken) {
            return { valid: true, apiBase: response.apiBase };
          } else if (!response.hasApiBase) {
            return { valid: false, reason: '未配置独立站地址' };
          } else {
            return { valid: false, reason: 'Token 无效或已过期，请重新配置' };
          }
        } else {
          return { valid: false, reason: response?.error || '获取配置失败' };
        }
      })
      .catch(function() {
        return { valid: false, reason: '获取配置超时' };
      });
  }

  // ============================================================
  // ⭐ 获取适配器状态（通过 postMessage）
  // ============================================================
  function getAdapterStatusFromContent() {
    return sendMessageToContent({ action: 'getStatus' }, 5000)
      .then(function(response) {
        if (response && response.success) {
          return { 
            success: true, 
            isLoaded: response.isLoaded || false,
            platformId: response.platformId || '未知'
          };
        } else {
          return { success: false, isLoaded: false, error: response?.error || '获取状态失败' };
        }
      })
      .catch(function() {
        return { success: false, isLoaded: false, error: '获取状态超时' };
      });
  }

  // ============================================================
  // ⭐ 加载适配器（通过 postMessage）
  // ============================================================
  function loadAdapterViaContent() {
    return sendMessageToContent({ action: 'loadAdapter' }, 15000)
      .then(function(response) {
        if (response && response.success) {
          return { success: true, platform: response.platform || 'alibaba' };
        } else {
          return { success: false, error: response?.error || '加载适配器失败' };
        }
      })
      .catch(function() {
        return { success: false, error: '加载适配器超时' };
      });
  }

  // ============================================================
  // ⭐ 执行采集（通过 postMessage）
  // ============================================================
  function performCollectViaContent() {
    return sendMessageToContent({ action: 'collect' }, 30000)
      .then(function(response) {
        if (response && response.success) {
          return { 
            success: true, 
            data: response.data || {},
            title: response.title || '商品',
            price: response.price || '',
            saved: response.saved || 0,
            exists: response.exists || 0,
            failed: response.failed || 0
          };
        } else {
          return { 
            success: false, 
            error: response?.error || '采集失败',
            saved: 0,
            exists: 0,
            failed: 0
          };
        }
      })
      .catch(function() {
        return { 
          success: false, 
          error: '采集超时',
          saved: 0,
          exists: 0,
          failed: 0
        };
      });
  }

  // ============================================================
  // 检测平台
  // ============================================================
  function detectPlatform(url) {
    if (/1688\.com/.test(url)) return '1688';
    if (/alibaba\.com/.test(url)) return 'alibaba';
    return null;
  }

  // ============================================================
  // 样式
  // ============================================================
  var styles = `
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
    .jeekua-float-btn .badge.loading {
      background: #f9a825;
      animation: pulse 1s infinite;
    }
    .jeekua-float-btn .badge.ready {
      background: #34a853;
    }
    .jeekua-float-btn .badge.error {
      background: #ea4335;
    }
    .jeekua-float-btn .badge.reconnecting {
      background: #f9a825;
      animation: pulse 0.5s infinite;
    }
    .jeekua-float-btn .badge.idle {
      background: #adb5bd;
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
    .jeekua-status .dot.reconnecting { background: #f9a825; animation: pulse 0.5s infinite; }

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

    .jeekua-float-btn.minimized {
      bottom: 30px;
      right: 30px;
      width: 48px;
      height: 48px;
      font-size: 20px;
    }

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
      .jeekua-panel {
        width: calc(100vw - 32px);
        right: 16px;
        bottom: 160px;
        max-height: 460px;
      }
      .jeekua-float-btn {
        bottom: 80px;
        right: 16px;
        width: 48px;
        height: 48px;
        font-size: 20px;
      }
      .jeekua-float-btn.minimized {
        bottom: 24px;
        right: 16px;
        width: 44px;
        height: 44px;
        font-size: 18px;
      }
    }
  `;

  // ============================================================
  // 注入样式
  // ============================================================
  var styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // ============================================================
  // 创建 DOM 元素
  // ============================================================

  var floatBtn = document.createElement('button');
  floatBtn.className = 'jeekua-float-btn minimized';
  floatBtn.innerHTML = '🛒<span class="badge idle" id="jeekuaBadge">●</span>';
  document.body.appendChild(floatBtn);

  var panel = document.createElement('div');
  panel.className = 'jeekua-panel';
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

  // ============================================================
  // DOM 引用
  // ============================================================
  var badge = document.getElementById('jeekuaBadge');
  var dot = document.getElementById('jeekuaDot');
  var statusText = document.getElementById('jeekuaStatusText');
  var statusTag = document.getElementById('jeekuaStatusTag');
  var banner = document.getElementById('jeekuaBanner');
  var logEl = document.getElementById('jeekuaLog');
  var loadBtn = document.getElementById('jeekuaLoadBtn');
  var collectBtn = document.getElementById('jeekuaCollectBtn');
  var detectBtn = document.getElementById('jeekuaDetectBtn');
  var reconnectBtn = document.getElementById('jeekuaReconnectBtn');
  var closeBtn = document.getElementById('jeekuaClose');

  // ============================================================
  // UI 状态
  // ============================================================
  var UI_STATE = {
    adapterLoaded: false,
    platform: null,
    isCollecting: false,
    connectionStatus: 'idle',
    tokenChecked: false,
    tokenValid: false
  };

  // ============================================================
  // 日志功能
  // ============================================================
  function addLog(message, type) {
    var time = new Date().toLocaleTimeString();
    var cls = type === 'ok' ? 'ok' : type === 'err' ? 'err' : type === 'warn' ? 'warn' : 'info';
    var prefix = type === 'err' ? '❌' : type === 'ok' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
    logEl.innerHTML += '\n<span class="' + cls + '">[' + time + '] ' + prefix + ' ' + message + '</span>';
    logEl.scrollTop = logEl.scrollHeight;
    console.log('[UI]', message);
  }

  function setStatus(text, type, tagText) {
    statusText.textContent = text;
    dot.className = 'dot ' + type;
    
    if (type === 'ready') {
      badge.textContent = '✓';
      badge.className = 'badge ready';
    } else if (type === 'loading' || type === 'reconnecting') {
      badge.textContent = '⟳';
      badge.className = 'badge ' + type;
    } else if (type === 'error') {
      badge.textContent = '✕';
      badge.className = 'badge error';
    } else {
      badge.textContent = '●';
      badge.className = 'badge idle';
    }

    if (tagText) {
      statusTag.textContent = tagText;
      statusTag.className = 'status-tag';
    }
  }

  function showBanner(message, type) {
    banner.textContent = message;
    banner.className = 'jeekua-connection-banner show ' + type;
  }

  function hideBanner() {
    banner.className = 'jeekua-connection-banner';
  }

  // ============================================================
  // ⭐ 核心初始化函数
  // ============================================================
  async function initializeOnShow() {
    console.log('[UI] 执行初始化检查...');
    
    // 1. 检查是否在支持的平台
    var platform = detectPlatform(window.location.href);
    if (!platform) {
      console.log('[UI] 当前页面不支持采集，不显示悬浮面板');
      if (floatBtn) floatBtn.style.display = 'none';
      return;
    }
    
    // 2. 检查 Token
    var tokenStatus = await checkTokenConfig();
    if (!tokenStatus.valid) {
      console.log('[UI] Token 检查失败:', tokenStatus.reason);
      UI_STATE.tokenValid = false;
      UI_STATE.tokenChecked = true;
      setStatus('⚠️ ' + tokenStatus.reason, 'error');
      showBanner('⚠️ ' + tokenStatus.reason + '，请点击插件图标配置', 'disconnected');
      collectBtn.disabled = true;
      return;
    }
    
    UI_STATE.tokenValid = true;
    UI_STATE.tokenChecked = true;
    console.log('[UI] ✅ Token 有效');
    
    // 3. 检查适配器状态
    var statusResult = await getAdapterStatusFromContent();
    console.log('[UI] 适配器状态:', statusResult);
    
    if (statusResult && statusResult.isLoaded) {
      UI_STATE.adapterLoaded = true;
      setStatus('✅ 就绪', 'ready');
      hideBanner();
      collectBtn.disabled = false;
      loadBtn.textContent = '✅ 已加载';
      loadBtn.disabled = true;
      console.log('[UI] ✅ 适配器已加载');
    } else {
      console.log('[UI] 适配器未加载，尝试自动加载...');
      setStatus('⏳ 加载适配器...', 'loading');
      showBanner('🔄 正在加载适配器...', 'connecting');
      
      var loadResult = await loadAdapterViaContent();
      console.log('[UI] 加载适配器结果:', loadResult);
      
      if (loadResult && loadResult.success) {
        UI_STATE.adapterLoaded = true;
        setStatus('✅ 适配器已加载', 'ready');
        hideBanner();
        collectBtn.disabled = false;
        loadBtn.textContent = '✅ 已加载';
        loadBtn.disabled = true;
        addLog('✅ 适配器自动加载成功', 'ok');
        console.log('[UI] ✅ 适配器自动加载成功');
      } else {
        UI_STATE.adapterLoaded = false;
        var errorMsg = loadResult?.error || '未知错误';
        setStatus('❌ 适配器加载失败: ' + errorMsg, 'error');
        showBanner('⚠️ 请手动点击「加载适配器」', 'disconnected');
        collectBtn.disabled = true;
        loadBtn.textContent = '📥 加载适配器';
        loadBtn.disabled = false;
        addLog('❌ 适配器加载失败: ' + errorMsg, 'err');
        console.warn('[UI] 适配器加载失败:', errorMsg);
      }
    }
  }

  // ============================================================
  // ⭐ 检测状态
  // ============================================================
  async function detectStatus() {
    addLog('检测状态...', 'info');
    setStatus('检测中...', 'loading', '⏳ 连接中');
    showBanner('⏳ 正在检测连接状态...', 'connecting');

    try {
      var result = await getAdapterStatusFromContent();
      console.log('[UI] detectStatus 结果:', result);
      
      if (result && result.success) {
        UI_STATE.platform = result.platformId || '未知';
        UI_STATE.adapterLoaded = result.isLoaded || false;
        UI_STATE.connectionStatus = 'connected';
        
        var statusType = UI_STATE.adapterLoaded ? 'ready' : 'idle';
        var statusText2 = UI_STATE.platform + ' ' + (UI_STATE.adapterLoaded ? '✅ 已加载' : '⏳ 未加载');
        setStatus(statusText2, statusType, '🟢 已连接');
        collectBtn.disabled = !UI_STATE.adapterLoaded;
        if (UI_STATE.adapterLoaded) {
          loadBtn.textContent = '✅ 已加载';
          loadBtn.disabled = true;
        } else {
          loadBtn.textContent = '📥 加载适配器';
          loadBtn.disabled = false;
        }
        reconnectBtn.style.display = 'none';
        hideBanner();
        addLog('检测完成: ' + UI_STATE.platform + ', 适配器: ' + (UI_STATE.adapterLoaded ? '已加载' : '未加载'), 'ok');
      } else {
        throw new Error(result?.error || '无效响应');
      }
    } catch (e) {
      console.error('[UI] detectStatus 错误:', e);
      UI_STATE.connectionStatus = 'error';
      setStatus('❌ 连接中断', 'error', '🔴 已断开');
      showBanner('⚠️ 与插件连接已断开，请点击「重新连接」', 'disconnected');
      reconnectBtn.style.display = 'block';
      collectBtn.disabled = true;
      addLog('检测失败: ' + e.message, 'err');
    }
  }

  // ============================================================
  // ⭐ 加载适配器（用户点击）
  // ============================================================
  async function loadAdapter() {
    addLog('正在加载适配器...', 'info');
    setStatus('加载中...', 'loading', '⏳ 加载中');
    loadBtn.disabled = true;
    loadBtn.textContent = '⏳ 加载中...';

    try {
      var result = await loadAdapterViaContent();
      console.log('[UI] loadAdapter 结果:', result);
      
      if (result && result.success) {
        UI_STATE.adapterLoaded = true;
        setStatus('✅ 适配器已加载', 'ready', '🟢 已连接');
        collectBtn.disabled = false;
        loadBtn.textContent = '✅ 已加载';
        loadBtn.disabled = true;
        addLog('适配器加载成功', 'ok');
        hideBanner();
        setTimeout(detectStatus, 1000);
      } else {
        var errorMsg = result?.error || '加载失败';
        setStatus('❌ 加载失败: ' + errorMsg, 'error', '🔴 加载失败');
        addLog('加载失败: ' + errorMsg, 'err');
        showBanner('⚠️ 适配器加载失败，请重试', 'disconnected');
        loadBtn.textContent = '📥 重试加载';
        loadBtn.disabled = false;
      }
    } catch (e) {
      setStatus('❌ 加载失败', 'error', '🔴 加载失败');
      addLog('加载异常: ' + e.message, 'err');
      showBanner('⚠️ 加载失败: ' + e.message, 'disconnected');
      loadBtn.textContent = '📥 重试加载';
      loadBtn.disabled = false;
    }
  }

  // ============================================================
  // ⭐ 采集商品
  // ============================================================
  async function collectProduct() {
    console.log('[UI] collectProduct 开始执行');
    
    // 检查 Token
    var tokenStatus = await checkTokenConfig();
    if (!tokenStatus.valid) {
      addLog('❌ ' + tokenStatus.reason, 'err');
      setStatus('❌ 配置无效', 'error', '🔴 配置无效');
      showBanner('⚠️ ' + tokenStatus.reason + '，请点击插件图标配置', 'disconnected');
      collectBtn.disabled = true;
      return;
    }
    
    if (UI_STATE.connectionStatus === 'error') {
      addLog('⚠️ 连接已断开，先尝试重新连接...', 'warn');
      await reconnect();
      if (UI_STATE.connectionStatus !== 'connected') {
        addLog('❌ 无法连接，请刷新页面', 'err');
        return;
      }
    }
    
    if (!UI_STATE.adapterLoaded) {
      addLog('⚠️ 适配器未加载，尝试自动加载...', 'warn');
      var loadResult = await loadAdapterViaContent();
      if (!loadResult || !loadResult.success) {
        addLog('❌ 适配器加载失败，请手动加载', 'err');
        setStatus('❌ 适配器加载失败', 'error', '🔴 适配器加载失败');
        showBanner('⚠️ 请手动点击「加载适配器」', 'disconnected');
        return;
      }
      UI_STATE.adapterLoaded = true;
      collectBtn.disabled = false;
      addLog('✅ 适配器加载成功', 'ok');
    }
    
    if (UI_STATE.isCollecting) return;
    UI_STATE.isCollecting = true;
    collectBtn.disabled = true;
    setStatus('采集中...', 'loading', '⏳ 采集中');
    addLog('⏳ 正在采集...', 'info');
    
    try {
      var response = await performCollectViaContent();
      console.log('[UI] collect 响应:', response);
      
      if (response && response.success) {
        var data = response.data || {};
        var title = data.title || '商品';
        var price = data.price || '';
        var saved = response.saved || 0;
        var exists = response.exists || 0;
        var failed = response.failed || 0;
        
        var result = {
          success: true,
          saved: saved,
          exists: exists,
          failed: failed,
          error: response.error || null
        };
        var status = getCollectStatus(result, data);
        setStatus(status.statusText, status.statusType, status.tagText);
        showBanner(status.bannerText, status.bannerType);
        addLog(status.logMessage, status.logType);
        
        if (saved > 0 || exists > 0) {
          setTimeout(function() { hideBanner(); }, 5000);
        }
      } else {
        var errorMsg = response?.error || '未知错误';
        var status = getCollectStatus({ success: false, error: errorMsg }, {});
        setStatus(status.statusText, status.statusType, status.tagText);
        showBanner(status.bannerText, status.bannerType);
        addLog(status.logMessage, status.logType);
      }
    } catch (error) {
      console.error('[UI] collectProduct 异常:', error);
      var status = getCollectStatus({ success: false, error: error.message }, {});
      setStatus(status.statusText, status.statusType, status.tagText);
      showBanner(status.bannerText, status.bannerType);
      addLog(status.logMessage, status.logType);
    }
    
    UI_STATE.isCollecting = false;
    collectBtn.disabled = !UI_STATE.adapterLoaded;
    console.log('[UI] collectProduct 结束');
  }

  // ============================================================
  // ⭐ 重新连接
  // ============================================================
  async function reconnect() {
    addLog('🔄 尝试重新连接...', 'warn');
    setStatus('重连中...', 'loading', '⏳ 重连中');
    showBanner('🔄 正在重新连接...', 'connecting');
    reconnectBtn.disabled = true;

    try {
      await detectStatus();
      if (UI_STATE.connectionStatus === 'connected') {
        addLog('✅ 连接已恢复', 'ok');
        reconnectBtn.style.display = 'none';
        hideBanner();
      } else {
        throw new Error('连接未恢复');
      }
    } catch (e) {
      addLog('❌ 重连失败: ' + e.message, 'err');
      UI_STATE.connectionStatus = 'error';
      setStatus('❌ 重连失败', 'error', '🔴 已断开');
      showBanner('⚠️ 重连失败，请刷新页面后重试', 'disconnected');
    }
    reconnectBtn.disabled = false;
  }

  // ============================================================
  // 事件绑定
  // ============================================================

  floatBtn.addEventListener('click', function() {
    var isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      floatBtn.classList.add('minimized');
    } else {
      panel.classList.add('open');
      floatBtn.classList.remove('minimized');
      setTimeout(detectStatus, 200);
    }
  });

  closeBtn.addEventListener('click', function() {
    panel.classList.remove('open');
    floatBtn.classList.add('minimized');
  });

  loadBtn.addEventListener('click', loadAdapter);
  collectBtn.addEventListener('click', collectProduct);
  detectBtn.addEventListener('click', detectStatus);
  reconnectBtn.addEventListener('click', reconnect);

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

  // ⭐ 初始化
  addLog('🚀 悬浮窗已启动', 'info');
  addLog('💡 点击悬浮按钮展开面板', 'info');
  
  // 执行初始化
  setTimeout(initializeOnShow, 500);

  console.log('[UI] 悬浮窗初始化完成');
})();