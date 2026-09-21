// src/core/config-manager.js

/**
 * 配置管理器
 * 管理独立站地址、R2地址等配置
 * 使用 chrome.storage.local 持久化存储
 */

const STORAGE_KEY = 'plugin_config';

const DEFAULT_CONFIG = {
  apiBase: null,          // 独立站 API 基础地址
  r2PublicUrl: null,      // R2 公开地址
  lastUpdated: null       // 最后更新时间
};

class ConfigManager {
  constructor() {
    this.cache = null;
  }

  /**
   * 获取配置
   */
  async getConfig() {
    if (this.cache) return this.cache;
    
    const result = await chrome.storage.local.get(STORAGE_KEY);
    this.cache = result[STORAGE_KEY] || { ...DEFAULT_CONFIG };
    return this.cache;
  }

  /**
   * 保存配置
   */
  async saveConfig(config) {
    const current = await this.getConfig();
    const updated = { ...current, ...config, lastUpdated: new Date().toISOString() };
    await chrome.storage.local.set({ [STORAGE_KEY]: updated });
    this.cache = updated;
    return updated;
  }

  /**
   * 获取 API Base URL
   */
  async getApiBase() {
    const config = await this.getConfig();
    return config.apiBase || null;
  }

  /**
   * 设置 API Base URL
   */
  async setApiBase(url) {
    const config = await this.saveConfig({ apiBase: url });
    return config.apiBase;
  }

  /**
   * 获取 R2 Public URL
   */
  async getR2PublicUrl() {
    const config = await this.getConfig();
    return config.r2PublicUrl || null;
  }

  /**
   * 设置 R2 Public URL
   */
  async setR2PublicUrl(url) {
    const config = await this.saveConfig({ r2PublicUrl: url });
    return config.r2PublicUrl;
  }

  /**
   * 检查是否已配置
   */
  async isConfigured() {
    const config = await this.getConfig();
    return !!config.apiBase;
  }

  /**
   * 清除所有配置
   */
  async clearAll() {
    await chrome.storage.local.remove(STORAGE_KEY);
    this.cache = null;
  }

  /**
   * 获取配置版本
   */
  async getConfigVersion() {
    const config = await this.getConfig();
    return config.lastUpdated || null;
  }
}

// 单例
let instance = null;

export function getConfigManager() {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}

export default { getConfigManager };