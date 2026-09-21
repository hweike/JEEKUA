// src/popup/popup.js

// ⭐ 删除所有静态 import
// 所有导入都改为动态 import()

var statusEl = document.getElementById('status');
var statusText = document.getElementById('statusText');
var loadBtn = document.getElementById('loadBtn');
var collectBtn = document.getElementById('collectBtn');
var openFloatBtn = document.getElementById('openFloatBtn');

// 🔥 配置页面元素
var configPage = document.getElementById('configPage');
var mainPage = document.getElementById('mainPage');
var apiBaseInput = document.getElementById('apiBaseInput');
var saveConfigBtn = document.getElementById('saveConfigBtn');
var configStatus = document.getElementById('configStatus');
var editConfigBtn = document.getElementById('editConfigBtn');

// ⭐ 新增元素
var apiBaseDisplayEl = document.getElementById('apiBaseDisplay');
var versionDisplayEl = document.getElementById('versionDisplay');

// ⭐ Token 状态元素
var apiDot = document.getElementById('apiDot');
var tokenDot = document.getElementById('tokenDot');
var tokenStatusDisplay = document.getElementById('tokenStatusDisplay');

// ⭐ 采集计数存储 key
var COLLECT_COUNT_KEY = 'collect_count';

var currentTabId = null;
var adapterLoaded = false;
var currentPlatform = null;
var contentScriptInjected = false;
var isInitializing = false;

// ============================================================
// ⭐ 采集计数管理
// ============================================================

async function getCollectCount() {
  try {
    var result = await chrome.storage.local.get(COLLECT_COUNT_KEY);
    return result[COLLECT_COUNT_KEY] || 0;
  } catch {
    return 0;
  }
}

async function incrementCollectCount() {
  try {
    var current = await getCollectCount();
    var newCount = current + 1;
    await chrome.storage.local.set({ [COLLECT_COUNT_KEY]: newCount });
    return newCount;
  } catch {
    return 0;
  }
}

async function updateCollectCountDisplay() {
  var count = await getCollectCount();
  var el = document.getElementById('collectCount');
  if (el) {
    el.textContent = '已采集: ' + count;
  }
}

// ============================================================
// ⭐ 监听来自 Background 的消息（悬浮面板触发 + 采集计数更新）
// ============================================================

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // ⭐ 保存请求（悬浮面板触发）
  if (message.type === 'EXECUTE_SAVE_FROM_FLOATING') {
    console.log('[Popup] 收到来自悬浮面板的保存请求:', message);
    
    (async function() {
      try {
        var data = message.data;
        var platform = message.platform;
        var apiBase = message.apiBase;
        
        if (!data) {
          sendResponse({ success: false, error: '缺少商品数据' });
          return;
        }
        
        if (!apiBase) {
          sendResponse({ success: false, error: '缺少独立站地址' });
          return;
        }
        
        // 加载 Mapper 和 Service
        var mappers = await loadMappers();
        var mapToProduct = mappers.mapToProduct;
        var saveProduct = mappers.saveProduct;
        var productData = mapToProduct(data, platform || 'alibaba');
        console.log('[Popup] 映射后数据:', productData);
        
        // 保存到独立站
        var result = await saveProduct(productData, { apiBase: apiBase });
        console.log('[Popup] 保存结果:', result);
        
        // 更新采集计数
        if (result.success && result.saved > 0) {
          await incrementCollectCount();
          await updateCollectCountDisplay();
        }
        
        // ⭐ 动态导入 status-helper 生成状态
        var { getCollectStatus } = await import('../utils/status-helper.js');
        var status = getCollectStatus(result, data);
        setStatus(status.statusText, status.statusType);
        sendLogToFloating(status.logMessage, status.logType);
        
        // 发送详细数据到悬浮面板
        if (data) {
          sendLogToFloating('📦 ' + JSON.stringify(data, null, 2), 'info');
        }
        
        if (result.results) {
          sendLogToFloating('📊 详细结果: ' + JSON.stringify(result.results, null, 2), 'info');
        }
        
        sendResponse(result);
        
      } catch (error) {
        console.error('[Popup] 保存异常:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true;
  }

  // ⭐ 采集计数更新（来自 Content Script）
  if (message.type === 'COLLECT_COUNT_UPDATED') {
    console.log('[Popup] 采集计数更新:', message.count);
    updateCollectCountDisplay();
    sendResponse({ success: true });
    return true;
  }
});


// ============================================================
// ⭐ 日志函数 - 发送到悬浮面板
// ============================================================
function sendLogToFloating(message, type) {
  if (!currentTabId) {
    console.log('[Popup] 悬浮面板未就绪，日志:', message);
    return;
  }
  
  try {
    chrome.tabs.sendMessage(currentTabId, {
      action: 'addLog',
      message: message,
      type: type || 'info'
    }, function(response) {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  } catch (e) {
    // 忽略
  }
}

// ============================================================
// 工具函数
// ============================================================

function setStatus(text, type) {
  if (statusText) statusText.textContent = text;
  if (statusEl) {
    statusEl.className = 'status';
    if (type) statusEl.classList.add(type);
  }
}

// ============================================================
// ⭐ 重置适配器状态
// ============================================================
function resetAdapterState() {
  adapterLoaded = false;
  currentPlatform = null;
  isInitializing = false;
  if (collectBtn) collectBtn.disabled = true;
  console.log('[Popup] 适配器状态已重置');
}

// ============================================================
// 🔥 Token 和配置管理
// ============================================================

async function getApiBase() {
  var result = await chrome.storage.local.get('api_base');
  return result.api_base || null;
}

async function setApiBase(url) {
  await chrome.storage.local.set({ api_base: url });
}

async function getTokenStatus() {
  try {
    var result = await chrome.storage.local.get(['api_token', 'api_token_expires_at']);
    var token = result.api_token;
    var expiresAt = result.api_token_expires_at;
    
    if (!token) {
      return { hasToken: false, isValid: false, reason: '未配置 Token' };
    }
    
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return { hasToken: true, isValid: false, reason: 'Token 已过期' };
    }
    
    return { hasToken: true, isValid: true, expiresAt: expiresAt };
  } catch (e) {
    return { hasToken: false, isValid: false, reason: '读取失败' };
  }
}

async function clearToken() {
  await chrome.storage.local.remove(['api_token', 'api_token_expires_at']);
}

// ============================================================
// 🔥 页面切换
// ============================================================

function showMainPage() {
  if (mainPage) mainPage.style.display = 'block';
  if (configPage) configPage.style.display = 'none';
}

function showConfigPage(message, type) {
  if (mainPage) mainPage.style.display = 'none';
  if (configPage) configPage.style.display = 'block';
  if (configStatus) {
    configStatus.textContent = message || '请配置独立站地址';
    configStatus.className = 'config-status ' + (type || 'info');
  }
}

// ============================================================
// ⭐ 更新独立站地址显示
// ============================================================
async function updateApiDisplay() {
  if (!apiBaseDisplayEl) return;
  var apiBase = await getApiBase();
  var tokenInfo = await getTokenStatus();
  
  if (apiBase && tokenInfo.isValid) {
    apiBaseDisplayEl.textContent = apiBase;
    apiBaseDisplayEl.className = 'api-url';
  } else if (apiBase && !tokenInfo.isValid) {
    apiBaseDisplayEl.textContent = apiBase;
    apiBaseDisplayEl.className = 'api-url unconnected';
  } else {
    apiBaseDisplayEl.textContent = '未连接独立站';
    apiBaseDisplayEl.className = 'api-url unconnected';
  }
}

// ============================================================
// ⭐ 更新独立站和 Token 状态显示
// ============================================================
async function updateConnectionStatus() {
  var apiBase = await getApiBase();
  var tokenInfo = await getTokenStatus();
  
  if (apiDot) {
    if (apiBase && tokenInfo.isValid) {
      apiDot.className = 'dot green';
    } else if (apiBase && !tokenInfo.isValid) {
      apiDot.className = 'dot yellow';
    } else {
      apiDot.className = 'dot red';
    }
  }
  
  if (apiBaseDisplayEl) {
    if (apiBase && tokenInfo.isValid) {
      apiBaseDisplayEl.textContent = apiBase;
      apiBaseDisplayEl.className = 'api-url';
    } else if (apiBase && !tokenInfo.isValid) {
      apiBaseDisplayEl.textContent = apiBase;
      apiBaseDisplayEl.className = 'api-url unconnected';
    } else {
      apiBaseDisplayEl.textContent = '未连接';
      apiBaseDisplayEl.className = 'api-url unconnected';
    }
  }
  
  if (tokenDot && tokenStatusDisplay) {
    if (tokenInfo.isValid) {
      tokenDot.className = 'dot green';
      tokenStatusDisplay.textContent = '已连接';
    } else if (tokenInfo.hasToken && !tokenInfo.isValid) {
      tokenDot.className = 'dot red';
      tokenStatusDisplay.textContent = '已过期';
    } else {
      tokenDot.className = 'dot gray';
      tokenStatusDisplay.textContent = '未获取';
    }
  }
}

// ============================================================
// ⭐ 显示版本号
// ============================================================
function displayVersion() {
  if (!versionDisplayEl) return;
  try {
    var manifest = chrome.runtime.getManifest();
    versionDisplayEl.textContent = 'v' + (manifest.version || '1.0.0');
  } catch (e) {
    versionDisplayEl.textContent = 'v1.0.0';
  }
}

// ============================================================
// 🔥 核心：Token 检测和配置引导
// ============================================================

async function checkTokenAndConfig() {
  console.log('[Popup] 检查 Token 和配置...');
  
  var apiBase = await getApiBase();
  if (!apiBase) {
    showConfigPage('⚠️ 首次使用，请配置独立站地址', 'info');
    setStatus('⚠️ 请先配置独立站地址', 'warning');
    if (loadBtn) loadBtn.style.display = 'none';
    if (collectBtn) collectBtn.disabled = true;
    if (openFloatBtn) openFloatBtn.style.display = 'none';
    await updateApiDisplay();
    await updateConnectionStatus();
    return false;
  }
  
  var tokenInfo = await getTokenStatus();
  if (!tokenInfo.isValid) {
    showConfigPage('⚠️ ' + (tokenInfo.reason || 'Token 无效') + '，请重新登录获取', 'error');
    setStatus('⚠️ ' + (tokenInfo.reason || 'Token 无效'), 'warning');
    if (loadBtn) loadBtn.style.display = 'none';
    if (collectBtn) collectBtn.disabled = true;
    if (openFloatBtn) openFloatBtn.style.display = 'none';
    await updateApiDisplay();
    await updateConnectionStatus();
    return false;
  }
  
  showMainPage();
  resetAdapterState();
  setStatus('⏳ 等待加载适配器...', 'info');
  if (collectBtn) collectBtn.disabled = true;
  if (loadBtn) loadBtn.style.display = 'none';
  if (openFloatBtn) openFloatBtn.style.display = 'none';
  await updateApiDisplay();
  await updateConnectionStatus();
  return true;
}

// ============================================================
// Chrome API 封装
// ============================================================

function getCurrentTabId() {
  return new Promise(function(resolve) {
    try {
      if (!chrome.tabs || !chrome.tabs.query) {
        console.warn('[Popup] chrome.tabs.query 不可用');
        resolve(null);
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (chrome.runtime.lastError) {
          console.warn('[Popup] tabs.query 错误:', chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        if (tabs && tabs.length > 0 && tabs[0].id) {
          resolve(tabs[0].id);
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error('[Popup] tabs.query 异常:', error);
      resolve(null);
    }
  });
}

function injectContentScript(tabId) {
  return new Promise(function(resolve, reject) {
    try {
      if (!chrome.scripting) {
        reject(new Error('chrome.scripting 不可用'));
        return;
      }
      
      if (!chrome.scripting.executeScript) {
        reject(new Error('chrome.scripting.executeScript 不可用'));
        return;
      }
      
      console.log('[Popup] 开始动态注入 Content Script, tabId:', tabId);
      
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ['src/content/content.js']
        },
        function(results) {
          if (chrome.runtime.lastError) {
            console.error('[Popup] executeScript 错误:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          console.log('[Popup] Content Script 动态注入成功:', results);
          resolve(results);
        }
      );
    } catch (error) {
      console.error('[Popup] executeScript 异常:', error);
      reject(error);
    }
  });
}

// ⭐ sendMessageToContent - 自动注入 Content Script
function sendMessageToContent(tabId, message, maxRetries) {
  maxRetries = maxRetries || 5;
  return new Promise(function(resolve) {
    if (!tabId) {
      resolve({ success: false, error: '无效的标签页 ID' });
      return;
    }
    
    var retries = 0;
    var injected = false;
    var injectAttempts = 0;
    var maxInjectAttempts = 2;
    
    function trySend() {
      console.log('[Popup] 发送消息 (尝试 ' + (retries + 1) + '):', message);
      
      try {
        chrome.tabs.sendMessage(tabId, message, function(response) {
          if (chrome.runtime.lastError) {
            var errorMsg = chrome.runtime.lastError.message;
            console.warn('[Popup] sendMessage 错误 (尝试 ' + (retries + 1) + '):', errorMsg);
            
            if ((errorMsg.includes('Could not establish connection') || 
                 errorMsg.includes('Receiving end does not exist') ||
                 errorMsg.includes('Could not connect'))) {
              
              if (!injected && injectAttempts < maxInjectAttempts) {
                injected = true;
                injectAttempts++;
                console.log('[Popup] Content Script 未就绪，准备注入 (尝试 ' + injectAttempts + '/' + maxInjectAttempts + ')...');
                
                chrome.tabs.get(tabId, function(tab) {
                  if (chrome.runtime.lastError) {
                    console.error('[Popup] 获取 tab 信息失败:', chrome.runtime.lastError.message);
                  }
                  
                  injectContentScript(tabId)
                    .then(function() {
                      console.log('[Popup] Content Script 注入成功，等待初始化...');
                      return new Promise(function(resolve) {
                        setTimeout(resolve, 800 + injectAttempts * 200);
                      });
                    })
                    .then(function() {
                      retries = 0;
                      console.log('[Popup] 重新尝试发送消息...');
                      trySend();
                    })
                    .catch(function(err) {
                      console.error('[Popup] Content Script 注入失败:', err);
                      if (retries < maxRetries) {
                        retries++;
                        var delay = retries * 500;
                        console.log('[Popup] ' + delay + 'ms 后重试...');
                        setTimeout(trySend, delay);
                      } else {
                        resolve({ 
                          success: false, 
                          error: 'Content Script 注入失败: ' + err.message,
                          needInjection: true
                        });
                      }
                    });
                });
                return;
              }
              
              if (injected && retries < maxRetries) {
                retries++;
                var delay = retries * 500 + 300;
                console.log('[Popup] 注入后仍失败，' + delay + 'ms 后重试 (尝试 ' + retries + '/' + maxRetries + ')...');
                setTimeout(trySend, delay);
                return;
              }
            }
            
            if (retries < maxRetries) {
              retries++;
              var delay = retries * 500;
              console.log('[Popup] ' + delay + 'ms 后重试...');
              setTimeout(trySend, delay);
              return;
            }
            
            resolve({ 
              success: false, 
              error: errorMsg,
              needInjection: !injected
            });
            return;
          }
          
          console.log('[Popup] sendMessage 响应:', response);
          resolve(response || { success: false, error: '无响应' });
        });
      } catch (error) {
        console.error('[Popup] sendMessage 异常:', error);
        if (retries < maxRetries) {
          retries++;
          var delay = retries * 500;
          console.log('[Popup] 异常后 ' + delay + 'ms 重试...');
          setTimeout(trySend, delay);
        } else {
          resolve({ success: false, error: error.message });
        }
      }
    }
    
    trySend();
  });
}

// ============================================================
// 加载 Mapper 和 Service（直接导入，不经过共享模块）
// ============================================================

async function loadMappers() {
  try {
    var productMapper = await import('../mappers/product-mapper.js');
    var productService = await import('../services/product-service.js');
    return {
      mapToProduct: productMapper.mapToProduct,
      saveProduct: productService.saveProduct
    };
  } catch (error) {
    console.error('[Popup] 加载 mapper/service 失败:', error);
    throw new Error('加载映射服务失败: ' + error.message);
  }
}

// ============================================================
// ⭐ 核心业务逻辑
// ============================================================

async function checkPageStatus() {
  console.log('[Popup] checkPageStatus 开始执行');
  try {
    var tabId = await getCurrentTabId();
    console.log('[Popup] 获取到 tabId:', tabId);
    
    if (!tabId) {
      setStatus('❌ 无法获取当前页面', 'error');
      if (collectBtn) collectBtn.disabled = true;
      return;
    }
    
    currentTabId = tabId;
    
    chrome.tabs.get(tabId, function(tab) {
      if (chrome.runtime.lastError) {
        console.error('[Popup] tabs.get 错误:', chrome.runtime.lastError.message);
        setStatus('❌ 获取页面信息失败', 'error');
        if (collectBtn) collectBtn.disabled = true;
        return;
      }
      
      var url = tab.url || '';
      console.log('[Popup] 当前页面 URL:', url);
      var isAlibaba = /alibaba\.com/.test(url);
      var is1688 = /1688\.com/.test(url);
      
      if (isAlibaba || is1688) {
        var platform = isAlibaba ? 'alibaba' : '1688';
        currentPlatform = platform;
        setStatus('⏳ 正在加载适配器...', 'loading');
        sendLogToFloating('页面检测: ' + platform, 'info');
        autoLoadAdapter();
      } else {
        console.log('[Popup] 当前页面不支持采集');
        setStatus('⚠️ 请在商品详情页使用', 'warning');
        if (collectBtn) collectBtn.disabled = true;
        sendLogToFloating('当前页面不支持采集', 'warn');
      }
    });
  } catch (error) {
    console.error('[Popup] checkPageStatus 异常:', error);
    setStatus('❌ 初始化失败', 'error');
    if (collectBtn) collectBtn.disabled = true;
  }
}

async function autoLoadAdapter() {
  if (adapterLoaded) {
    console.log('[Popup] 适配器已加载，跳过');
    return true;
  }
  
  if (isInitializing) return false;
  isInitializing = true;
  
  console.log('[Popup] 自动加载适配器...');
  
  if (!currentTabId) {
    var tabId = await getCurrentTabId();
    if (!tabId) {
      setStatus('❌ 无法获取当前页面', 'error');
      isInitializing = false;
      return false;
    }
    currentTabId = tabId;
  }
  
  setStatus('⏳ 正在加载适配器...', 'loading');
  sendLogToFloating('正在加载适配器...', 'info');
  
  try {
    var pingResponse = await sendMessageToContent(currentTabId, { action: 'ping' }, 3);
    var csReady = pingResponse && pingResponse.success;
    
    if (!csReady) {
      console.log('[Popup] Content Script 未就绪，直接注入...');
      await injectContentScript(currentTabId);
      await new Promise(function(resolve) { setTimeout(resolve, 1000); });
      
      pingResponse = await sendMessageToContent(currentTabId, { action: 'ping' }, 3);
      csReady = pingResponse && pingResponse.success;
      
      if (!csReady) {
        throw new Error('Content Script 无法连接');
      }
    }
    
    console.log('[Popup] Content Script 已就绪，加载适配器...');
    
    var response = await sendMessageToContent(currentTabId, {
      action: 'loadAdapter'
    }, 3);
    
    if (response && response.success) {
      adapterLoaded = true;
      currentPlatform = response.platform || currentPlatform;
      setStatus('✅ 适配器加载成功: ' + currentPlatform, 'success');
      if (collectBtn) collectBtn.disabled = false;
      isInitializing = false;
      
      sendLogToFloating('适配器加载成功: ' + currentPlatform, 'success');
      await openFloatingWindowInternal();
      
      return true;
    } else {
      var errorMsg = response?.error || '未知错误';
      setStatus('❌ 适配器加载失败: ' + errorMsg, 'error');
      if (collectBtn) collectBtn.disabled = true;
      isInitializing = false;
      sendLogToFloating('适配器加载失败: ' + errorMsg, 'error');
      return false;
    }
  } catch (error) {
    console.error('[Popup] 自动加载适配器异常:', error);
    setStatus('❌ 加载失败: ' + error.message, 'error');
    if (collectBtn) collectBtn.disabled = true;
    isInitializing = false;
    sendLogToFloating('适配器加载异常: ' + error.message, 'error');
    return false;
  }
}

// ============================================================
// ⭐ 采集商品（Popup 按钮触发）
// ============================================================

async function performCollect() {
  console.log('[Popup] performCollect 开始执行');
  
  if (!adapterLoaded) {
    setStatus('⚠️ 请先加载适配器', 'error');
    return;
  }
  
  if (!currentTabId) {
    var tabId = await getCurrentTabId();
    if (!tabId) {
      setStatus('❌ 无法获取当前页面', 'error');
      return;
    }
    currentTabId = tabId;
  }
  
  setStatus('⏳ 采集中...', 'loading');
  if (collectBtn) {
    collectBtn.disabled = true;
    collectBtn.textContent = '⏳ 采集中...';
  }
  sendLogToFloating('开始采集商品...', 'info');
  
  try {
    // 1. 采集数据
    var response = await sendMessageToContent(currentTabId, {
      action: 'collect'
    }, 3);
    
    console.log('[Popup] collect 响应:', response);
    
    if (!response || !response.success) {
      var errorMsg = response?.error || '未知错误';
      setStatus('❌ 采集失败: ' + errorMsg, 'error');
      sendLogToFloating('采集失败: ' + errorMsg, 'error');
      if (collectBtn) {
        collectBtn.disabled = false;
        collectBtn.textContent = '📦 采集商品';
      }
      return;
    }
    
    var rawData = response.data;
    console.log('[Popup] 原始采集数据:', rawData);
    
    // 2. 获取 API 地址
    var apiBase = await getApiBase();
    if (!apiBase) {
      setStatus('❌ 请先配置独立站地址', 'error');
      sendLogToFloating('未配置独立站地址', 'error');
      if (collectBtn) {
        collectBtn.disabled = false;
        collectBtn.textContent = '📦 采集商品';
      }
      return;
    }
    
    // 3. ⭐ 使用 loadMappers() 直接保存
    var mappers = await loadMappers();
    var mapToProduct = mappers.mapToProduct;
    var saveProduct = mappers.saveProduct;
    var platform = currentPlatform || rawData.platform || 'alibaba';
    var productData = mapToProduct(rawData, platform);
    console.log('[Popup] 映射后数据:', productData);
    
    var result = await saveProduct(productData, { apiBase: apiBase });
    console.log('[Popup] 保存结果:', result);
    
    // 4. 更新采集计数
    if (result.success && result.saved > 0) {
      await incrementCollectCount();
      await updateCollectCountDisplay();
    }
    
    // ⭐ 5. 动态导入 status-helper 生成状态
    var { getCollectStatus } = await import('../utils/status-helper.js');
    var status = getCollectStatus(result, rawData);
    setStatus(status.statusText, status.statusType);
    sendLogToFloating(status.logMessage, status.logType);
    
    // 显示数据预览（精简版，不包含完整 description）
    if (rawData) {
      var preview = {
        title: rawData.title || '无',
        price: rawData.price || '无',
        sku_count: rawData.sku_list ? rawData.sku_list.length : (rawData.variants ? rawData.variants.length : 0),
        image_count: rawData.images ? rawData.images.length : 0,
        desc_length: rawData.description ? rawData.description.length : 0
      };
      sendLogToFloating('📊 ' + JSON.stringify(preview, null, 2), 'info');
    }
    
  } catch (error) {
    console.error('[Popup] performCollect 异常:', error);
    setStatus('❌ 采集失败: ' + error.message, 'error');
    sendLogToFloating('采集异常: ' + error.message, 'error');
  }
  
  if (collectBtn) {
    collectBtn.disabled = false;
    collectBtn.textContent = '📦 采集商品';
  }
}

// ============================================================
// 🔥 自动打开悬浮窗（注入到页面，不是独立窗口）
// ============================================================
async function openFloatingWindowInternal() {
  if (!currentTabId) {
    var tabId = await getCurrentTabId();
    if (!tabId) return;
    currentTabId = tabId;
  }
  
  try {
    // ⭐ 检查 Content Script 是否就绪
    var pingResponse = await sendMessageToContent(currentTabId, { action: 'ping' }, 2);
    if (!pingResponse || !pingResponse.success) {
      console.log('[Popup] Content Script 未就绪，先注入...');
      await injectContentScript(currentTabId);
      await new Promise(function(resolve) { setTimeout(resolve, 500); });
    }
    
    // ⭐ 发送消息让 Content Script 注入悬浮 UI
    var response = await sendMessageToContent(currentTabId, {
      action: 'injectFloatingUI'
    }, 2);
    
    if (response && response.success) {
      console.log('[Popup] ✅ 悬浮面板已注入');
      sendLogToFloating('悬浮面板已打开', 'info');
    } else {
      console.warn('[Popup] 悬浮面板注入失败:', response?.error || '未知错误');
      sendLogToFloating('打开悬浮面板失败: ' + (response?.error || '未知错误'), 'error');
    }
  } catch (error) {
    console.warn('[Popup] 打开悬浮面板异常:', error.message);
    sendLogToFloating('打开悬浮面板失败: ' + error.message, 'error');
  }
}

// ============================================================
// 🔥 保存配置
// ============================================================

async function saveConfig() {
  var url = apiBaseInput?.value?.trim();
  if (!url) {
    if (configStatus) {
      configStatus.textContent = '❌ 请输入独立站地址';
      configStatus.className = 'config-status error';
    }
    return;
  }
  
  try {
    new URL(url);
  } catch (e) {
    if (configStatus) {
      configStatus.textContent = '❌ 请输入有效的 URL';
      configStatus.className = 'config-status error';
    }
    return;
  }
  
  if (configStatus) {
    configStatus.textContent = '⏳ 正在验证连接...';
    configStatus.className = 'config-status info';
  }
  
  try {
    await setApiBase(url);
    sendLogToFloating('独立站地址已保存: ' + url, 'success');
    
    var response = await fetch(url + '/api/productCrawl/plugin/config', {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    
    var data = await response.json();
    console.log('🔵 独立站配置返回:', data);
    
    if (configStatus) {
      configStatus.textContent = '✅ 连接成功！版本: ' + (data.version || '未知');
      configStatus.className = 'config-status success';
    }
    
    if (configStatus) {
      configStatus.textContent = '⏳ 正在获取 Token...';
      configStatus.className = 'config-status info';
    }
    sendLogToFloating('正在获取 Token...', 'info');
    
    try {
      var tokenResponse = await fetch(url + '/api/productCrawl/plugin/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!tokenResponse.ok) {
        if (tokenResponse.status === 401) {
          throw new Error('请先在浏览器中登录独立站');
        }
        throw new Error('HTTP ' + tokenResponse.status);
      }
      
      var tokenData = await tokenResponse.json();
      if (!tokenData.token) {
        throw new Error('API 未返回 Token');
      }
      
      await chrome.storage.local.set({
        api_token: tokenData.token,
        api_token_expires_at: tokenData.expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      });
      
      if (configStatus) {
        configStatus.textContent = '✅ Token 获取成功！';
        configStatus.className = 'config-status success';
      }
      sendLogToFloating('Token 获取成功', 'success');
      
    } catch (tokenError) {
      if (configStatus) {
        configStatus.textContent = '⚠️ 地址已保存，但获取 Token 失败: ' + tokenError.message;
        configStatus.className = 'config-status error';
        configStatus.innerHTML = '<span>⚠️ 地址已保存，但获取 Token 失败: ' + tokenError.message + '</span><button class="btn btn-sm btn-info" id="refreshTokenBtn" style="margin-top:8px;display:inline-block;">🔄 重试获取 Token</button>';
        var refreshBtn = document.getElementById('refreshTokenBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', refreshToken);
      }
      sendLogToFloating('获取 Token 失败: ' + tokenError.message, 'error');
      return;
    }
    
    resetAdapterState();
    
    await checkTokenAndConfig();
    await checkPageStatus();
    await updateApiDisplay();
    await updateConnectionStatus();
    
  } catch (error) {
    if (configStatus) {
      configStatus.textContent = '❌ 连接失败: ' + error.message;
      configStatus.className = 'config-status error';
    }
    sendLogToFloating('配置失败: ' + error.message, 'error');
  }
}

// ============================================================
// 🔥 刷新 Token
// ============================================================

async function refreshToken() {
  var apiBase = await getApiBase();
  if (!apiBase) {
    if (configStatus) {
      configStatus.textContent = '❌ 请先配置独立站地址';
      configStatus.className = 'config-status error';
    }
    return;
  }
  
  if (configStatus) {
    configStatus.textContent = '⏳ 正在刷新 Token...';
    configStatus.className = 'config-status info';
  }
  
  try {
    var response = await fetch(apiBase + '/api/productCrawl/plugin/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('请先在浏览器中登录独立站');
      }
      throw new Error('HTTP ' + response.status);
    }
    
    var data = await response.json();
    if (!data.token) {
      throw new Error('API 未返回 Token');
    }
    
    await chrome.storage.local.set({
      api_token: data.token,
      api_token_expires_at: data.expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    });
    
    if (configStatus) {
      configStatus.textContent = '✅ Token 刷新成功！';
      configStatus.className = 'config-status success';
    }
    sendLogToFloating('Token 刷新成功', 'success');
    
    resetAdapterState();
    
    await checkTokenAndConfig();
    await checkPageStatus();
    await updateApiDisplay();
    await updateConnectionStatus();
    
  } catch (error) {
    if (configStatus) {
      configStatus.textContent = '❌ ' + error.message;
      configStatus.className = 'config-status error';
    }
    sendLogToFloating('刷新 Token 失败: ' + error.message, 'error');
  }
}

// ============================================================
// 事件绑定
// ============================================================

if (collectBtn) collectBtn.addEventListener('click', performCollect);
if (saveConfigBtn) saveConfigBtn.addEventListener('click', saveConfig);

if (editConfigBtn) {
  editConfigBtn.addEventListener('click', function() {
    showConfigPage('修改独立站地址后重新连接', 'info');
    if (apiBaseInput) {
      getApiBase().then(function(url) {
        if (apiBaseInput) apiBaseInput.value = url || '';
      });
    }
    if (configStatus) {
      configStatus.innerHTML = '<span>修改独立站地址后点击「保存并连接」</span><button class="btn btn-sm btn-info" id="refreshTokenBtn" style="margin-top:8px;display:inline-block;">🔄 刷新 Token</button>';
      var refreshBtn = document.getElementById('refreshTokenBtn');
      if (refreshBtn) refreshBtn.addEventListener('click', refreshToken);
    }
  });
}

// ============================================================
// 🔥 初始化// ============================================================

async function init() {
  console.log('[Popup] DOMContentLoaded 事件触发');
  
  displayVersion();
  await updateCollectCountDisplay();
  await updateConnectionStatus();
  await updateApiDisplay();
  
  var isReady = await checkTokenAndConfig();
  
  if (isReady) {
    await checkPageStatus();
  } else {
    console.log('[Popup] 等待用户配置');
  }
  
  console.log('[Popup] 初始化完成');
}

document.addEventListener('DOMContentLoaded', init);