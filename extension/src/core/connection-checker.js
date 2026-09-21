// src/core/connection-checker.js

/**
 * Content Script 连接检查器
 * ping 机制确保脚本存活
 */

class ConnectionChecker {
  constructor() {
    this.pingTimeout = 3000;
    this.maxRetries = 3;
    this.injectWait = 800;
  }

  /**
   * ping Content Script
   */
  async ping(tabId, timeout = this.pingTimeout) {
    return new Promise((resolve) => {
      let resolved = false;
      
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[ConnectionChecker] ping 超时 (${timeout}ms)`);
          resolve(false);
        }
      }, timeout);
      
      try {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          
          const isAlive = response && response.status === 'alive';
          console.log(`[ConnectionChecker] ping 响应: ${isAlive ? '✅ 存活' : '❌ 无效'}`);
          resolve(isAlive);
        });
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          console.error('[ConnectionChecker] ping 异常:', error.message);
          resolve(false);
        }
      }
    });
  }

  /**
   * 注入 Content Script
   */
  async inject(tabId) {
    try {
      console.log('[ConnectionChecker] 注入 Content Script...');
      
      if (!chrome.scripting) {
        console.warn('[ConnectionChecker] chrome.scripting API 不可用');
        return false;
      }
      
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content/content.js']
      });
      
      // 等待脚本初始化
      await new Promise(resolve => setTimeout(resolve, this.injectWait));
      
      console.log('[ConnectionChecker] ✅ Content Script 注入成功');
      return true;
    } catch (error) {
      console.error('[ConnectionChecker] ❌ 注入失败:', error.message);
      return false;
    }
  }

  /**
   * 确保 Content Script 就绪
   */
  async ensureReady(tabId, maxRetries = this.maxRetries) {
    console.log(`[ConnectionChecker] 检查 Content Script 就绪状态 (tab: ${tabId})`);
    
    // 先尝试 ping
    let isReady = await this.ping(tabId);
    if (isReady) {
      console.log('[ConnectionChecker] ✅ Content Script 已就绪');
      return true;
    }
    
    // 尝试注入
    console.log('[ConnectionChecker] Content Script 未就绪，尝试注入...');
    const injected = await this.inject(tabId);
    if (injected) {
      isReady = await this.ping(tabId);
      if (isReady) {
        console.log('[ConnectionChecker] ✅ 注入后已就绪');
        return true;
      }
    }
    
    // 重试
    for (let i = 0; i < maxRetries; i++) {
      console.log(`[ConnectionChecker] 等待就绪... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      isReady = await this.ping(tabId, 2000);
      if (isReady) {
        console.log(`[ConnectionChecker] ✅ 第 ${i + 1} 次重试后就绪`);
        return true;
      }
    }
    
    console.error('[ConnectionChecker] ❌ Content Script 未能就绪');
    return false;
  }

  /**
   * 重置 Content Script
   */
  async reset(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'reset' });
      console.log('[ConnectionChecker] ✅ 重置消息已发送');
      return true;
    } catch (error) {
      console.warn('[ConnectionChecker] 重置失败:', error.message);
      return false;
    }
  }

  /**
   * 强制重置 Content Script
   */
  async forceReset(tabId) {
    console.log('[ConnectionChecker] 执行强制重置...');
    
    await this.reset(tabId);
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.inject(tabId);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const isReady = await this.ping(tabId);
    console.log(`[ConnectionChecker] 强制重置后状态: ${isReady ? '✅ 就绪' : '❌ 未就绪'}`);
    return isReady;
  }
}

// 单例
let instance = null;

export function getConnectionChecker() {
  if (!instance) {
    instance = new ConnectionChecker();
  }
  return instance;
}

export default { getConnectionChecker };