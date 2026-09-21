// src/content/content.js

/**
 * Content Script - 核心调度器
 * 使用动态 import() 加载依赖，兼容 Content Script 环境
 * 
 * v5.2 - 统一配置管理，移除直接 storage 读取
 */

console.log('🔵 [1] Content Script 启动，当前页面:', window.location.href);

// ============================================================
// 1. 使用动态 import() 加载所有依赖
// ============================================================

(async function initContent() {
  console.log('🔵 [2] 开始动态导入核心模块...');

  let PlatformRegistry, getConfigLoader, getUpgradeManager, getConfigManager;
  let registry, configLoader, upgradeManager, configManager;

  try {
    console.log('🔵 [3] 导入 platform-registry.js...');
    const module0 = await import(chrome.runtime.getURL('src/core/platform-registry.js'));
    console.log('✅ platform-registry.js 加载成功');

    console.log('🔵 [4] 导入 config-loader.js...');
    const module1 = await import(chrome.runtime.getURL('src/core/config-loader.js'));
    console.log('✅ config-loader.js 加载成功');

    console.log('🔵 [5] 导入 upgrade-manager.js...');
    const module2 = await import(chrome.runtime.getURL('src/core/upgrade-manager.js'));
    console.log('✅ upgrade-manager.js 加载成功');

    console.log('🔵 [6] 导入 config-manager.js...');
    const module3 = await import(chrome.runtime.getURL('src/core/config-manager.js'));
    console.log('✅ config-manager.js 加载成功');

    // 兼容处理：获取 getUpgradeManager
    let getUpgradeManagerFn;
    if (module2.getUpgradeManager) {
      getUpgradeManagerFn = module2.getUpgradeManager;
      console.log('✅ 使用 getUpgradeManager');
    } else if (module2.UpgradeManager) {
      console.log('⚠️ 使用 UpgradeManager 类');
      const UpgradeManagerClass = module2.UpgradeManager;
      getUpgradeManagerFn = () => new UpgradeManagerClass();
    } else if (module2.default) {
      console.log('⚠️ 使用 default 导出');
      const UpgradeManagerClass = module2.default;
      getUpgradeManagerFn = () => new UpgradeManagerClass();
    } else {
      throw new Error('无法找到 UpgradeManager');
    }

    PlatformRegistry = module0.PlatformRegistry;
    getConfigLoader = module1.getConfigLoader;
    getConfigManager = module3.getConfigManager;

    console.log('✅ [7] 所有核心模块动态加载完成');
    
  } catch (err) {
    console.error('❌ 核心模块加载失败:', err);
    console.error('❌ 错误堆栈:', err.stack);
    return;
  }

  // ============================================================
  // 2. 初始化核心模块
  // ============================================================

  console.log('🔵 [8] 开始初始化核心模块...');

  try {
    registry = new PlatformRegistry();
    console.log('✅ PlatformRegistry 创建成功');
  } catch (err) {
    console.error('❌ PlatformRegistry 创建失败:', err);
    return;
  }

  try {
    configLoader = getConfigLoader();
    console.log('✅ ConfigLoader 创建成功');
  } catch (err) {
    console.error('❌ ConfigLoader 创建失败:', err);
    return;
  }

  try {
    upgradeManager = getUpgradeManagerFn();
    console.log('✅ UpgradeManager 创建成功');
  } catch (err) {
    console.error('❌ UpgradeManager 创建失败:', err);
    return;
  }

  try {
    configManager = getConfigManager();
    console.log('✅ ConfigManager 创建成功');
  } catch (err) {
    console.error('❌ ConfigManager 创建失败:', err);
    return;
  }

  let currentAdapter = null;
  let cachedProduct = null;
  let isCollecting = false;
  let currentAbortController = null;
  let remoteConfig = null;

  console.log('✅ [9] 核心模块初始化完成');

  // ============================================================
  // 3. 初始化
  // ============================================================

  async function init() {
    console.log('🔵 [10] Content Script 初始化...');
    
    try {
      const isConfigured = await configManager.isConfigured();
      console.log('🔵 [11] isConfigured:', isConfigured);
      
      if (!isConfigured) {
        console.warn('⚠️ 独立站地址未配置，请先在插件中配置');
        return;
      }

      console.log('🔵 [12] 加载适配器...');
      await upgradeManager.loadAdaptersFromCache(registry);
      console.log('✅ 适配器加载完成');
      
      console.log('🔵 [13] 加载配置...');
      remoteConfig = await configLoader.loadConfig();
      
      console.log('✅ 配置加载完成');
      console.log(`📋 已注册平台: ${registry.getPlatformNames().join(', ')}`);
      console.log(`📋 配置版本: ${remoteConfig?.version || '未知'}`);
      
    } catch (err) {
      console.error('❌ 初始化失败:', err);
      console.error('❌ 错误堆栈:', err.stack);
    }
  }

  // ============================================================
  // 4. 核心采集方法
  // ============================================================

  async function extractProduct(signal) {
    console.log('🔵 开始采集商品数据...');
    const url = window.location.href;
    
    const AdapterClass = registry.match(url);
    if (!AdapterClass) {
      return { error: '当前页面不支持采集' };
    }
    
    const platformName = AdapterClass.platformName;
    console.log(`✅ 匹配到平台: ${platformName}`);
    
    let config;
    try {
      config = await configLoader.loadConfig();
    } catch (err) {
      console.error('❌ 配置加载失败:', err);
      return { error: `配置加载失败: ${err.message}` };
    }
    
    if (!config || !config.platforms || !config.platforms.alibaba) {
      console.error('❌ 配置无效，缺少必要平台');
      return { error: '配置加载失败，请重新加载插件' };
    }
    
    const platformConfig = config.platforms[platformName];
    if (!platformConfig) {
      console.error(`❌ 平台 "${platformName}" 配置缺失`);
      return { error: `平台 "${platformName}" 的配置不存在` };
    }
    
    const adapter = new AdapterClass();
    adapter.init({ config: config, platform: platformConfig });
    currentAdapter = adapter;
    
    console.log(`🔧 适配器已初始化: ${adapter.name || platformName}`);
    
    const rawData = await adapter.extract(signal);
    console.log('📦 原始数据已采集');
    
    const mapping = platformConfig.field_mapping || {};
    const standardData = adapter.mapToStandard(rawData, mapping);
    console.log('📤 数据标准化完成');
    
    const validation = adapter.validate(standardData);
    if (!validation.valid) {
      console.warn('⚠️ 数据验证未完全通过，缺失字段:', validation.missing);
    }
    
    return standardData;
  }

  // ============================================================
  // 5. 消息监听
  // ============================================================

  console.log('🔵 [14] 注册消息监听器...');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📩 Content Script 收到消息:', request?.action);
    
    if (request.action === 'extract') {
      console.log('🔵 收到 extract 消息');
      if (isCollecting) {
        currentAbortController?.abort();
      }
      
      currentAbortController = new AbortController();
      isCollecting = true;
      
      extractProduct(currentAbortController.signal)
        .then(data => {
          cachedProduct = data;
          isCollecting = false;
          currentAbortController = null;
          sendResponse(data);
        })
        .catch(err => {
          console.error('❌ 采集失败:', err);
          isCollecting = false;
          currentAbortController = null;
          sendResponse({ error: err.message });
        });
      return true;
    }
    
    if (request.action === 'ping') {
      console.log('🔵 收到 ping 消息');
      const AdapterClass = registry.match(window.location.href);
      sendResponse({
        status: 'alive',
        url: window.location.href,
        platform: AdapterClass?.platformName || null,
        isCollecting: isCollecting,
        configLoaded: !!remoteConfig,
        adaptersLoaded: registry.getPlatformNames()
      });
      return true;
    }
    
    if (request.action === 'reset') {
      console.log('🔵 收到 reset 消息');
      if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
      }
      isCollecting = false;
      cachedProduct = null;
      sendResponse({ status: 'reset' });
      return true;
    }
    
    if (request.action === 'refreshConfig') {
      console.log('🔵 收到 refreshConfig 消息');
      configLoader.loadConfig(true)
        .then(config => {
          remoteConfig = config;
          sendResponse({ success: true, version: config.version });
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
    
    if (request.action === 'getStatus') {
      sendResponse({
        configVersion: remoteConfig?.version || null,
        platforms: registry.getPlatformNames(),
        isCollecting: isCollecting
      });
      return true;
    }
    
    sendResponse({ error: '未知消息类型' });
    return true;
  });

  console.log('✅ [15] 消息监听器注册完成');

  // ============================================================
  // 6. 启动
  // ============================================================

  console.log('🔵 [16] 调用 init() 启动...');
  await init();

  console.log('✅ Content Script 已加载 (v5.2)');
  console.log('📍', window.location.href);

})().catch(err => {
  console.error('❌ Content Script 启动失败:', err);
  console.error('❌ 错误堆栈:', err.stack);
});