/**
 * 平台适配器基类
 * 所有平台适配器必须继承此类
 * 
 * 职责：
 * 1. 定义统一的采集接口
 * 2. 提供通用的字段提取方法
 * 3. 处理数据标准化映射
 * 
 * 🔥 纯基类，不包含任何平台特定逻辑
 */
export class PlatformAdapter {
  /**
   * 平台名称（子类必须覆盖）
   */
  static platformName = 'unknown';
  
  /**
   * 平台域名匹配模式（子类必须覆盖）
   */
  static domainPatterns = [];
  
  /**
   * 构造函数
   * @param {Object} config - 平台配置（从远程加载）
   */
  constructor(config = {}) {
    this.config = config;
    this.name = this.constructor.platformName;
    this.selectors = config.selectors || {};
    this.mapping = config.mapping || {};
    this.validation = config.validation || {};
    this.strategies = config.strategies || {};
  }

  /**
   * 检测当前页面是否匹配该平台
   * @param {string} url - 当前页面 URL
   * @returns {boolean}
   */
  static match(url) {
    for (const pattern of this.domainPatterns) {
      if (pattern.startsWith('*.')) {
        // 通配符匹配：*.alibaba.com
        const domain = pattern.replace('*.', '');
        if (url.includes(domain)) return true;
      } else if (url.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取平台配置（从远程配置中提取）
   * @param {Object} remoteConfig - 完整远程配置
   * @returns {Object} 平台配置
   */
  static getPlatformConfig(remoteConfig) {
    const config = remoteConfig?.platforms?.[this.platformName];
    if (!config) {
      throw new Error(`平台 ${this.platformName} 配置缺失`);
    }
    return config;
  }

  /**
   * 初始化适配器（可被子类覆盖）
   * @param {Object} remoteConfig - 完整远程配置
   */
  init(remoteConfig) {
    const config = this.constructor.getPlatformConfig(remoteConfig);
    this.config = config;
    this.selectors = config.selectors || {};
    this.mapping = config.mapping || {};
    this.validation = config.validation || {};
    this.strategies = config.strategies || {};
    return this;
  }

  /**
   * 主采集方法（子类可覆盖）
   * @param {AbortSignal} signal - 取消信号
   * @returns {Promise<Object>} 原始采集数据
   */
  async extract(signal) {
    const data = {};
    const fields = this.selectors.fields || {};
    
    // 1. 提取所有字段（并行）
    const entries = Object.entries(fields);
    const chunkSize = 5;
    const results = {};
    
    for (let i = 0; i < entries.length; i += chunkSize) {
      if (signal?.aborted) break;
      
      const chunk = entries.slice(i, i + chunkSize);
      const promises = chunk.map(async ([key, config]) => {
        results[key] = await this.extractField(config);
      });
      await Promise.all(promises);
    }
    
    Object.assign(data, results);
    
    // 2. 提取 SKU（如果配置了 SKU 策略）
    if (this.strategies.sku) {
      data.sku_list = await this.extractSKU(this.strategies.sku);
    }
    
    // 3. 提取自定义字段（子类可覆盖）
    if (this.extractCustomFields) {
      const custom = await this.extractCustomFields(signal);
      Object.assign(data, custom);
    }
    
    // 4. 添加元数据
    data._platform = this.name;
    data._collected_at = new Date().toISOString();
    
    return data;
  }

  /**
   * 提取单个字段
   * @param {Object} fieldConfig - 字段配置
   * @returns {Promise<any>}
   */
  async extractField(fieldConfig) {
    const { selectors = [], type = 'text', attribute = 'src', fallback = null } = fieldConfig;
    
    // 查找元素
    const element = this.findElement(selectors);
    if (!element) {
      return this.evaluateFallback(fallback);
    }
    
    // 提取值
    return this.extractValue(element, { type, attribute });
  }

  /**
   * 查找元素（同步查找）
   * @param {string[]} selectors - 选择器列表
   * @returns {Element|null}
   */
  findElement(selectors) {
    if (!selectors || selectors.length === 0) return null;
    
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch (e) {
        // 忽略无效选择器
      }
    }
    return null;
  }

  /**
   * 提取元素值
   * @param {Element} element - DOM 元素
   * @param {Object} options - 提取选项
   * @returns {any}
   */
  extractValue(element, { type, attribute }) {
    switch (type) {
      case 'text':
        return element.innerText?.trim() || '';
      case 'html':
        return this.extractHtml(element);
      case 'attr':
        return element.getAttribute(attribute) || '';
      case 'style':
        return this.extractStyle(element);
      case 'styleAll':
        return this.extractStyleAll(element);
      case 'attributes':
        return this.extractAttributes(element);
      default:
        return element.innerText?.trim() || '';
    }
  }

  /**
   * 提取 HTML 内容（通用）
   * 🔥 不包含任何平台特定逻辑，子类可覆盖
   * @param {Element} element - DOM 元素
   * @returns {string}
   */
  extractHtml(element) {
    return element.innerHTML || '';
  }

  /**
   * 提取 style 属性中的 URL
   */
  extractStyle(element) {
    const style = element.getAttribute('style') || '';
    const match = style.match(/url\(["']?(.*?)["']?\)/);
    return match ? match[1] : '';
  }

  /**
   * 批量提取 style 属性中的 URL
   */
  extractStyleAll(element) {
    const urls = [];
    const images = element.querySelectorAll('[style*="background-image"]');
    for (const img of images) {
      const url = this.extractStyle(img);
      if (url) urls.push(url);
    }
    return urls;
  }

  /**
   * 提取属性键值对（通用）
   * 🔥 使用通用表格解析，不包含任何平台特定选择器
   * 子类可覆盖以支持不同平台的属性结构
   * @param {Element} element - DOM 元素
   * @returns {Object}
   */
  extractAttributes(element) {
    const attrs = {};
    
    // 通用方式1：查找表格行
    const rows = element.querySelectorAll('tr');
    for (const row of rows) {
      const tds = row.querySelectorAll('td, th');
      if (tds.length >= 2) {
        const key = tds[0].innerText?.trim();
        const value = tds[1].innerText?.trim();
        if (key && value) attrs[key] = value;
      }
    }
    
    // 如果找到了属性，直接返回
    if (Object.keys(attrs).length > 0) {
      return attrs;
    }
    
    // 通用方式2：查找 dl/dt/dd 结构
    const dtElements = element.querySelectorAll('dt');
    for (const dt of dtElements) {
      const dd = dt.nextElementSibling;
      if (dd && dd.tagName === 'DD') {
        const key = dt.innerText?.trim();
        const value = dd.innerText?.trim();
        if (key && value) attrs[key] = value;
      }
    }
    
    return attrs;
  }

  /**
   * 提取 SKU（子类必须覆盖）
   * @param {Object} skuStrategy - SKU 策略配置
   * @returns {Promise<Array>}
   */
  async extractSKU(skuStrategy) {
    // 默认返回空数组，子类必须覆盖
    return [];
  }

  /**
   * 评估 fallback 值
   */
  evaluateFallback(fallback) {
    if (fallback === 'document.title') {
      return document.title;
    }
    if (typeof fallback === 'function') {
      return fallback();
    }
    return fallback ?? null;
  }

  /**
   * 将原始数据映射为标准格式
   * @param {Object} rawData - 原始数据
   * @param {Object} mappingConfig - 映射配置（可选，覆盖默认）
   * @returns {Object} 标准化数据
   */
  mapToStandard(rawData, mappingConfig = null) {
    const mapping = mappingConfig || this.mapping;
    const result = {
      platform: this.name,
      source_url: window.location.href,
      source_product_id: this.extractProductId(window.location.href),
    };
    
    // 应用映射
    for (const [sourceKey, targetKey] of Object.entries(mapping)) {
      if (rawData[sourceKey] !== undefined && rawData[sourceKey] !== null) {
        result[targetKey] = rawData[sourceKey];
      }
    }
    
    // 添加元数据
    result.collected_at = rawData._collected_at || new Date().toISOString();
    result.collected_by = 'plugin';
    
    return result;
  }

  /**
   * 从 URL 提取产品 ID（通用）
   * 子类可覆盖以支持不同 URL 格式
   */
  extractProductId(url) {
    const patterns = [
      /\/offer\/(\d+)\.html/,
      /\/product-detail\/([^\/\?]+)/,
      /\/product\/([^\/\?]+)/,
      /\/dp\/([A-Z0-9]{10})/,      // Amazon ASIN
      /\/item\/(\d+)/,              // 通用
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return '';
  }

  /**
   * 验证数据
   * @param {Object} data - 标准化数据
   * @param {Array} requiredFields - 必填字段列表（可选，覆盖默认）
   * @returns {Object} { valid: boolean, missing: string[] }
   */
  validate(data, requiredFields = null) {
    const required = requiredFields || this.validation.required || ['product_name', 'sku'];
    const missing = [];
    for (const field of required) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    }
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * 获取平台信息
   */
  getInfo() {
    return {
      name: this.name,
      selectors: this.selectors,
      mapping: this.mapping,
      strategies: this.strategies
    };
  }
}