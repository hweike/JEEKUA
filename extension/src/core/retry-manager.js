// src/core/retry-manager.js

/**
 * 重试管理器
 * 采集失败时自动重试
 */

class RetryManager {
  constructor() {
    this.defaultConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffFactor: 2
    };
  }

  /**
   * 执行带重试的操作
   */
  async retry(fn, options = {}) {
    const config = { ...this.defaultConfig, ...options };
    let lastError = null;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        console.log(`[RetryManager] 尝试 ${attempt}/${config.maxAttempts}`);
        const result = await fn(attempt);
        if (attempt > 1) {
          console.log(`[RetryManager] ✅ 第 ${attempt} 次尝试成功`);
        }
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[RetryManager] 尝试 ${attempt} 失败:`, error.message);
        
        if (attempt < config.maxAttempts) {
          // 计算延迟（指数退避 + 随机抖动）
          const delay = Math.min(
            config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
            config.maxDelay
          );
          const jitter = delay * 0.3 * Math.random();
          const waitTime = delay + jitter;
          
          console.log(`[RetryManager] 等待 ${Math.round(waitTime)}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    console.error(`[RetryManager] ❌ 所有 ${config.maxAttempts} 次尝试均失败`);
    throw lastError;
  }

  /**
   * 判断是否可重试的错误
   */
  isRetryableError(error) {
    const message = error.message || '';
    const retryablePatterns = [
      'timeout',
      '超时',
      'connection',
      '连接',
      'network',
      '网络',
      'ECONNRESET',
      'ETIMEDOUT',
      '500',
      '502',
      '503',
      '504',
      'rate limit',
      '限流'
    ];
    
    return retryablePatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * 获取重试状态
   */
  getStatus(attempt, maxAttempts) {
    return {
      attempt,
      maxAttempts,
      isLastAttempt: attempt >= maxAttempts,
      progress: attempt / maxAttempts,
      remaining: maxAttempts - attempt
    };
  }
}

// 单例
let instance = null;

export function getRetryManager() {
  if (!instance) {
    instance = new RetryManager();
  }
  return instance;
}

export default { getRetryManager };