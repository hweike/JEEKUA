// src/core/token-manager.js

/**
 * Token 管理器
 * 缓存 + 过期检查 + 自动刷新
 */

import { getConfigManager } from './config-manager.js';

const STORAGE_KEYS = {
  TOKEN: 'api_token',
  TOKEN_EXPIRES_AT: 'api_token_expires_at'
};

class TokenManager {
  constructor() {
    this.configManager = getConfigManager();
  }

  /**
   * 获取存储的 Token
   */
  async getToken() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN);
    return result[STORAGE_KEYS.TOKEN] || null;
  }

  /**
   * 保存 Token
   */
  async setToken(token, expiresInSeconds = 3600) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.TOKEN]: token,
      [STORAGE_KEYS.TOKEN_EXPIRES_AT]: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
    });
  }

  /**
   * 获取 Token 过期时间
   */
  async getTokenExpiry() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return result[STORAGE_KEYS.TOKEN_EXPIRES_AT] || null;
  }

  /**
   * 检查 Token 是否过期
   */
  async isTokenExpired() {
    const expiresAt = await this.getTokenExpiry();
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date();
  }

  /**
   * 检查 Token 是否有效（存在且未过期）
   */
  async hasValidToken() {
    const token = await this.getToken();
    if (!token) return false;
    return !(await this.isTokenExpired());
  }

  /**
   * 从独立站 API 获取 Token
   */
  async fetchTokenFromAPI() {
    const configManager = getConfigManager();
    const apiBase = await configManager.getApiBase();
    
    if (!apiBase) {
      throw new Error('请先配置独立站地址');
    }

    try {
      const response = await fetch(`${apiBase}/api/productCrawl/plugin/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('请先在浏览器中登录独立站');
        }
        throw new Error(`获取 Token 失败 (HTTP ${response.status})`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('API 未返回 Token');
      }

      // 保存 Token（默认 7 天过期）
      await this.setToken(data.token, data.expiresIn || 604800);
      
      return data.token;
    } catch (error) {
      console.error('[TokenManager] 获取 Token 失败:', error);
      throw error;
    }
  }

  /**
   * 获取有效 Token（自动刷新）
   */
  async getValidToken(forceRefresh = false) {
    // 如果强制刷新，直接从 API 获取
    if (forceRefresh) {
      return await this.fetchTokenFromAPI();
    }

    // 检查缓存的 Token
    const token = await this.getToken();
    const expired = await this.isTokenExpired();

    if (token && !expired) {
      console.log('[TokenManager] 使用缓存的 Token');
      return token;
    }

    // Token 不存在或已过期，从 API 获取
    console.log('[TokenManager] Token 已过期或不存在，重新获取');
    return await this.fetchTokenFromAPI();
  }

  /**
   * 清除 Token
   */
  async clearToken() {
    await chrome.storage.local.remove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRES_AT
    ]);
  }

  /**
   * 获取 Token 状态
   */
  async getTokenStatus() {
    const token = await this.getToken();
    const expiresAt = await this.getTokenExpiry();
    const expired = await this.isTokenExpired();
    
    return {
      hasToken: !!token,
      isValid: !!token && !expired,
      expired: expired,
      expiresAt: expiresAt
    };
  }
}

// 单例
let instance = null;

export function getTokenManager() {
  if (!instance) {
    instance = new TokenManager();
  }
  return instance;
}

export default { getTokenManager };