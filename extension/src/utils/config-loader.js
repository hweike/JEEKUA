// src/utils/config-loader.js
(function() {
  'use strict';

  if (window.__jeekuaConfigLoader) {
    return;
  }
  window.__jeekuaConfigLoader = true;

  console.log('[ConfigLoader] 初始化...');

  const CONFIG_CACHE = new Map();

  async function loadPlatformConfig(platformId) {
    if (CONFIG_CACHE.has(platformId)) {
      console.log(`[ConfigLoader] 从缓存加载 ${platformId} 配置`);
      return CONFIG_CACHE.get(platformId);
    }

    try {
      // ⭐ 使用 chrome.runtime.getURL 获取扩展内完整路径
      const configUrl = chrome.runtime.getURL(`src/selectors/${platformId}.json`);
      console.log(`[ConfigLoader] 加载 ${platformId} 配置: ${configUrl}`);

      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = await response.json();
      CONFIG_CACHE.set(platformId, config);
      console.log(`[ConfigLoader] ✅ ${platformId} 配置加载成功，版本: ${config._version}`);
      return config;

    } catch (error) {
      console.error(`[ConfigLoader] ❌ 加载 ${platformId} 配置失败:`, error);
      return null;
    }
  }

  function getFieldSelectors(config, fieldName) {
    if (!config || !config.fields || !config.fields[fieldName]) {
      return [];
    }
    return config.fields[fieldName].selectors || [];
  }

  function getFieldType(config, fieldName) {
    if (!config || !config.fields || !config.fields[fieldName]) {
      return 'text';
    }
    return config.fields[fieldName].type || 'text';
  }

  function getFieldFallback(config, fieldName) {
    if (!config || !config.fields || !config.fields[fieldName]) {
      return null;
    }
    return config.fields[fieldName].fallback || null;
  }

  function getFieldAttribute(config, fieldName) {
    if (!config || !config.fields || !config.fields[fieldName]) {
      return null;
    }
    return config.fields[fieldName].attribute || null;
  }

  function getFieldNames(config) {
    if (!config || !config.fields) {
      return [];
    }
    return Object.keys(config.fields);
  }

  function clearCache() {
    CONFIG_CACHE.clear();
    console.log('[ConfigLoader] 缓存已清除');
  }

  window.__jeekuaConfig = {
    loadPlatformConfig: loadPlatformConfig,
    getFieldSelectors: getFieldSelectors,
    getFieldType: getFieldType,
    getFieldFallback: getFieldFallback,
    getFieldAttribute: getFieldAttribute,
    getFieldNames: getFieldNames,
    clearCache: clearCache
  };

  console.log('[ConfigLoader] ✅ 已就绪');
})();