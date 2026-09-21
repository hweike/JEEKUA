// src/core/state-manager.js

/**
 * 状态管理器
 * 页面状态、按钮状态、连接状态
 */

class StateManager {
  constructor() {
    this.state = {
      // 页面状态
      page: {
        isSupported: false,
        platform: null,
        url: null,
        tabId: null
      },
      // 连接状态
      connection: {
        scriptReady: false,
        apiConnected: false,
        tokenValid: false
      },
      // 采集状态
      collection: {
        isCollecting: false,
        lastResult: null,
        error: null
      },
      // UI 状态
      ui: {
        status: 'idle', // idle | ready | collecting | success | error
        statusMessage: '',
        statusType: 'info'
      }
    };
    
    this.listeners = [];
  }

  /**
   * 获取状态
   */
  getState() {
    return this.state;
  }

  /**
   * 更新状态
   */
  updateState(updates) {
    // 深度合并
    const newState = this.deepMerge(this.state, updates);
    this.state = newState;
    
    // 通知监听器
    this.notifyListeners();
    
    return this.state;
  }

  /**
   * 更新页面状态
   */
  updatePage(pageInfo) {
    return this.updateState({
      page: { ...this.state.page, ...pageInfo }
    });
  }

  /**
   * 更新连接状态
   */
  updateConnection(connectionInfo) {
    return this.updateState({
      connection: { ...this.state.connection, ...connectionInfo }
    });
  }

  /**
   * 更新采集状态
   */
  updateCollection(collectionInfo) {
    return this.updateState({
      collection: { ...this.state.collection, ...collectionInfo }
    });
  }

  /**
   * 更新 UI 状态
   */
  updateUI(uiInfo) {
    return this.updateState({
      ui: { ...this.state.ui, ...uiInfo }
    });
  }

  /**
   * 设置状态信息
   */
  setStatus(message, type = 'info') {
    return this.updateUI({
      statusMessage: message,
      statusType: type
    });
  }

  /**
   * 设置采集状态
   */
  setCollecting(isCollecting) {
    return this.updateCollection({ isCollecting });
  }

  /**
   * 重置状态
   */
  reset() {
    this.state = {
      page: { isSupported: false, platform: null, url: null, tabId: null },
      connection: { scriptReady: false, apiConnected: false, tokenValid: false },
      collection: { isCollecting: false, lastResult: null, error: null },
      ui: { status: 'idle', statusMessage: '', statusType: 'info' }
    };
    this.notifyListeners();
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 通知监听器
   */
  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[StateManager] 监听器执行失败:', error);
      }
    }
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

// 单例
let instance = null;

export function getStateManager() {
  if (!instance) {
    instance = new StateManager();
  }
  return instance;
}

export default { getStateManager };