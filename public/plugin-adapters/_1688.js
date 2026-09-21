// src/platforms/_1688/_1688.js

/**
 * 1688 平台适配器
 * 
 * v2.0 - 移除静态 import，完全自包含
 */
export class _1688Adapter {
  static platformName = '1688';
  
  static domainPatterns = [
    '1688.com',
    '*.1688.com'
  ];

  /**
   * 构造函数
   * @param {Object} config - 平台配置
   */
  constructor(config = {}) {
    this.config = config;
    this.name = '1688';
    this.selectors = config.selectors || {};
    this.mapping = config.mapping || {};
    this.validation = config.validation || {};
    this.strategies = config.strategies || {};
  }

  /**
   * 检测当前页面是否匹配该平台
   */
  static match(url) {
    for (const pattern of this.domainPatterns) {
      if (pattern.startsWith('*.')) {
        const domain = pattern.replace('*.', '');
        if (url.includes(domain)) return true;
      } else if (url.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取平台配置
   */
  static getPlatformConfig(remoteConfig) {
    const config = remoteConfig?.platforms?.[this.platformName];
    if (!config) {
      throw new Error(`平台 ${this.platformName} 配置缺失`);
    }
    return config;
  }

  /**
   * 初始化适配器
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
   * 主采集方法
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
    
    // 2. 提取 SKU
    if (this.strategies.sku) {
      data.sku_list = await this.extractSKU(this.strategies.sku);
    }
    
    // 3. 提取自定义字段
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
   */
  async extractField(fieldConfig) {
    const { selectors = [], type = 'text', attribute = 'src', fallback = null } = fieldConfig;
    
    const element = this.findElement(selectors);
    if (!element) {
      return this.evaluateFallback(fallback);
    }
    
    return this.extractValue(element, { type, attribute });
  }

  /**
   * 查找元素
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
   * 提取 HTML 内容
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
   * 提取属性键值对
   */
  extractAttributes(element) {
    const attrs = {};
    
    const rows = element.querySelectorAll('tr');
    for (const row of rows) {
      const tds = row.querySelectorAll('td, th');
      if (tds.length >= 2) {
        const key = tds[0].innerText?.trim();
        const value = tds[1].innerText?.trim();
        if (key && value) attrs[key] = value;
      }
    }
    
    if (Object.keys(attrs).length > 0) {
      return attrs;
    }
    
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
   * 提取 SKU（1688 特定）
   */
  async extractSKU(skuStrategy) {
    const skuList = [];

    try {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('skuMap') || content.includes('skuList')) {
          const match = content.match(/(?:skuMap|skuList)\s*[:=]\s*(\{[^}]+\})/);
          if (match) {
            const data = JSON.parse(match[1]);
            if (data.skuList) {
              return data.skuList.map(sku => ({
                id: sku.skuId || '',
                name: sku.specName || '',
                price: sku.price || 0,
                stock: sku.stock || 0
              }));
            }
          }
        }
      }
    } catch (err) {
      console.warn('1688 SKU 提取失败:', err.message);
    }
    
    return skuList;
  }

  /**
   * 提取自定义字段（1688 特定）
   */
  async extractCustomFields(signal) {
    const data = {};
    
    const attrTables = document.querySelectorAll('.attributes-table, .specification, .spec-table');
    const attrs = {};
    for (const table of attrTables) {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const tds = row.querySelectorAll('td, th');
        if (tds.length >= 2) {
          const key = tds[0].innerText?.trim();
          const value = tds[1].innerText?.trim();
          if (key && value) attrs[key] = value;
        }
      }
    }
    if (Object.keys(attrs).length > 0) {
      data.attributes = attrs;
    }
    
    return data;
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
   */
  mapToStandard(rawData, mappingConfig = null) {
    const mapping = mappingConfig || this.mapping;
    const result = {
      platform: this.name,
      source_url: window.location.href,
      source_product_id: this.extractProductId(window.location.href),
    };
    
    for (const [sourceKey, targetKey] of Object.entries(mapping)) {
      if (rawData[sourceKey] !== undefined && rawData[sourceKey] !== null) {
        result[targetKey] = rawData[sourceKey];
      }
    }
    
    result.collected_at = rawData._collected_at || new Date().toISOString();
    result.collected_by = 'plugin';
    
    return result;
  }

  /**
   * 从 URL 提取产品 ID
   */
  extractProductId(url) {
    const patterns = [
      /\/offer\/(\d+)\.html/,
      /\/product-detail\/([^\/\?]+)/,
      /\/product\/([^\/\?]+)/,
      /\/item\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return '';
  }

  /**
   * 验证数据
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