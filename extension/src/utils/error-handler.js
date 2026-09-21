// src/utils/error-handler.js

/**
 * 错误分类处理
 * Token 过期、脚本未就绪、网络错误等
 */

export const ErrorTypes = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  SCRIPT_NOT_READY: 'SCRIPT_NOT_READY',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONFIG_MISSING: 'CONFIG_MISSING',
  PAGE_NOT_SUPPORTED: 'PAGE_NOT_SUPPORTED',
  COLLECTION_TIMEOUT: 'COLLECTION_TIMEOUT',
  COLLECTION_FAILED: 'COLLECTION_FAILED',
  UNKNOWN: 'UNKNOWN'
};

export class PluginError extends Error {
  constructor(type, message, details = null) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'PluginError';
  }

  getUserMessage() {
    const messages = {
      [ErrorTypes.TOKEN_EXPIRED]: 'Token 已过期，请重新获取',
      [ErrorTypes.TOKEN_MISSING]: '请先获取 Token',
      [ErrorTypes.SCRIPT_NOT_READY]: '采集脚本未就绪，请刷新页面后重试',
      [ErrorTypes.NETWORK_ERROR]: '网络连接失败，请检查网络后重试',
      [ErrorTypes.CONFIG_MISSING]: '请先配置独立站地址',
      [ErrorTypes.PAGE_NOT_SUPPORTED]: '请在 1688 或阿里国际站商品详情页使用',
      [ErrorTypes.COLLECTION_TIMEOUT]: '采集超时，请重试',
      [ErrorTypes.COLLECTION_FAILED]: '采集失败，请重试',
      [ErrorTypes.UNKNOWN]: '发生未知错误，请查看控制台'
    };
    return messages[this.type] || this.message;
  }

  getAction() {
    const actions = {
      [ErrorTypes.TOKEN_EXPIRED]: '重新获取 Token',
      [ErrorTypes.TOKEN_MISSING]: '获取 Token',
      [ErrorTypes.SCRIPT_NOT_READY]: '刷新页面',
      [ErrorTypes.NETWORK_ERROR]: '检查网络连接',
      [ErrorTypes.CONFIG_MISSING]: '配置独立站地址',
      [ErrorTypes.PAGE_NOT_SUPPORTED]: '切换到商品详情页'
    };
    return actions[this.type] || null;
  }
}

export function classifyError(error) {
  const message = error.message || '';
  
  // Token 相关
  if (message.includes('Token') && (message.includes('过期') || message.includes('expired'))) {
    return new PluginError(ErrorTypes.TOKEN_EXPIRED, message);
  }
  if (message.includes('Token') && (message.includes('不存在') || message.includes('missing'))) {
    return new PluginError(ErrorTypes.TOKEN_MISSING, message);
  }
  
  // 配置相关
  if (message.includes('配置') || message.includes('配置独立站')) {
    return new PluginError(ErrorTypes.CONFIG_MISSING, message);
  }
  
  // 页面支持
  if (message.includes('不支持') || message.includes('商品详情页')) {
    return new PluginError(ErrorTypes.PAGE_NOT_SUPPORTED, message);
  }
  
  // 脚本相关
  if (message.includes('脚本') || message.includes('Content Script')) {
    return new PluginError(ErrorTypes.SCRIPT_NOT_READY, message);
  }
  
  // 网络相关
  if (message.includes('network') || message.includes('网络') || 
      message.includes('fetch') || message.includes('ECONNREFUSED')) {
    return new PluginError(ErrorTypes.NETWORK_ERROR, message);
  }
  
  // 超时
  if (message.includes('timeout') || message.includes('超时')) {
    return new PluginError(ErrorTypes.COLLECTION_TIMEOUT, message);
  }
  
  // 默认
  return new PluginError(ErrorTypes.UNKNOWN, message);
}

export function isRetryable(error) {
  const retryableTypes = [
    ErrorTypes.NETWORK_ERROR,
    ErrorTypes.COLLECTION_TIMEOUT,
    ErrorTypes.TOKEN_EXPIRED
  ];
  return retryableTypes.includes(error.type);
}

export default {
  ErrorTypes,
  PluginError,
  classifyError,
  isRetryable
};