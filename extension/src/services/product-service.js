// src/services/product-service.js

/**
 * 商品数据服务
 * 负责将映射后的数据写入数据库
 */

import { validateProduct } from '../types/product.js';

// ============================================================
// ⭐ 直接使用 chrome.storage.local 管理配置（与 popup.js 保持一致）
// ============================================================

const STORAGE_KEY_API_BASE = 'api_base';

/**
 * 获取独立站地址
 */
async function getApiBase() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_API_BASE);
    return result[STORAGE_KEY_API_BASE] || null;
  } catch (error) {
    console.error('[ProductService] 读取 api_base 失败:', error);
    return null;
  }
}

/**
 * 获取 Token
 */
async function getToken() {
  try {
    const result = await chrome.storage.local.get(['api_token', 'api_token_expires_at']);
    const token = result.api_token;
    const expiresAt = result.api_token_expires_at;
    
    if (!token) return null;
    if (expiresAt && new Date(expiresAt) < new Date()) return null;
    
    return token;
  } catch (error) {
    console.error('[ProductService] 读取 token 失败:', error);
    return null;
  }
}

// ============================================================
// 核心功能
// ============================================================

/**
 * 保存商品到独立站
 * @param {Object} product - API 格式的商品对象
 * @param {Object} options - 可选参数
 * @param {string} options.apiBase - 独立站地址（优先使用）
 * @returns {Promise<Object>} 保存结果
 */
export async function saveProduct(product, options = {}) {
  console.log('[ProductService] saveProduct 被调用, product:', product);
  
  // ⭐ 1. 获取 API 地址 - 优先使用传入的参数
  let apiBase = options.apiBase;
  if (!apiBase) {
    apiBase = await getApiBase();
  }
  
  console.log('[ProductService] apiBase:', apiBase);
  
  if (!apiBase) {
    throw new Error('请先配置独立站地址');
  }
  
  // 2. 获取 Token
  const token = await getToken();
  console.log('[ProductService] token:', token ? '已获取' : '未获取');
  
  if (!token) {
    throw new Error('请先获取 Token');
  }
  
  // 3. 数据校验
  const validation = validateProduct(product);
  if (!validation.valid) {
    throw new Error(`数据校验失败: ${validation.errors.join(', ')}`);
  }
  
  // 4. 调用后端 API
  const url = `${apiBase}/api/productCrawl/collection`;
  console.log('[ProductService] 发送请求:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });
    
    console.log('[ProductService] 响应状态:', response.status);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('[ProductService] 保存成功:', result);
    return result;
    
  } catch (error) {
    console.error('[ProductService] 请求失败:', error);
    throw error;
  }
}

/**
 * 批量保存商品
 * @param {Array} products - 商品对象数组
 * @param {Object} options - 可选参数
 * @param {string} options.apiBase - 独立站地址（优先使用）
 * @returns {Promise<Object>} 保存结果
 */
export async function saveProducts(products, options = {}) {
  console.log('[ProductService] saveProducts 被调用, 数量:', products.length);
  
  // ⭐ 获取 API 地址 - 优先使用传入的参数
  let apiBase = options.apiBase;
  if (!apiBase) {
    apiBase = await getApiBase();
  }
  
  console.log('[ProductService] apiBase:', apiBase);
  
  if (!apiBase) {
    throw new Error('请先配置独立站地址');
  }
  
  // 获取 Token
  const token = await getToken();
  if (!token) {
    throw new Error('请先获取 Token');
  }
  
  // 批量校验
  const invalidProducts = products.filter(p => !validateProduct(p).valid);
  if (invalidProducts.length > 0) {
    throw new Error(`${invalidProducts.length} 个商品数据无效`);
  }
  
  const url = `${apiBase}/api/productCrawl/collection`;
  console.log('[ProductService] 发送批量请求:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(products)
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('[ProductService] 批量保存成功:', result);
    return result;
    
  } catch (error) {
    console.error('[ProductService] 批量请求失败:', error);
    throw error;
  }
}

/**
 * 检查商品是否已存在
 * @param {string} sourceUrl - 商品来源 URL
 * @param {Object} options - 可选参数
 * @param {string} options.apiBase - 独立站地址（优先使用）
 * @returns {Promise<Object|null>} 已存在的商品或 null
 */
export async function checkProductExists(sourceUrl, options = {}) {
  // ⭐ 获取 API 地址 - 优先使用传入的参数
  let apiBase = options.apiBase;
  if (!apiBase) {
    apiBase = await getApiBase();
  }
  
  if (!apiBase) {
    return null;
  }
  
  try {
    const token = await getToken();
    if (!token) {
      return null;
    }
    
    const url = `${apiBase}/api/productCrawl/collection?sourceUrl=${encodeURIComponent(sourceUrl)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.items && data.items.length > 0 ? data.items[0] : null;
    
  } catch (error) {
    console.error('[ProductService] checkProductExists 失败:', error);
    return null;
  }
}

// ============================================================
// 导出
// ============================================================

export default {
  saveProduct,
  saveProducts,
  checkProductExists
};