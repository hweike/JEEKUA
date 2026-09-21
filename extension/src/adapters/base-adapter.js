// ⭐ 注意：没有 export，直接挂载到 window

(function(window, document) {
  'use strict';
  
  console.log('[BaseAdapter] 脚本已加载');
  
  // 定义基类
  class BaseAdapter {
    get platformId() {
      throw new Error('子类必须实现 platformId');
    }
    
    getText(selector) {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : '';
    }
    
    waitForElement(selector, timeout = 10000) {
      return new Promise((resolve) => {
        if (document.querySelector(selector)) {
          resolve(true);
          return;
        }
        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            observer.disconnect();
            resolve(true);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, timeout);
      });
    }
  }
  
  // ⭐ 挂载到全局
  window.__adapters = window.__adapters || {};
  window.__adapters.BaseAdapter = BaseAdapter;
  
  console.log('[BaseAdapter] 已挂载到 window.__adapters.BaseAdapter');
  
})(window, document);