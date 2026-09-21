// src/platforms/alibaba/alibaba.js

/**
 * 阿里巴巴国际站平台适配器
 * 
 * 🔥 包含阿里特定的选择器和逻辑
 * v2.2 - 添加完整 selectors 配置
 */

import { PlatformAdapter } from '../../core/platform-adapter.js';

export class AlibabaAdapter extends PlatformAdapter {
  static platformName = 'alibaba';
  
  static domainPatterns = [
    'alibaba.com',
    '*.alibaba.com'
  ];

  /**
   * 构造函数
   * @param {Object} config - 平台配置
   */
  constructor(config = {}) {
    super(config);
    this.name = 'alibaba';
    
    // 🔥 添加完整的 selectors 配置
    this.selectors = {
      fields: {
        title: {  
        selectors: ['h1', '[data-testid="product-title"]', '.product-title'],
        type: 'text',
        fallback: 'document.title'
        },
        price: {
          selectors: [
            '[data-testid="product-price"] .price-item span:first-child',
            '.price-item .id-flex .id-items-center span',
            '.price-item'
          ],
          type: 'text',
          fallback: ''
        },
        currency: {
          selectors: ['[data-testid="product-price"]'],
          type: 'currency',
          fallback: 'USD'
        },
        moq: {
          selectors: [
            '.min-order-quantity',
            '.moq',
            '[data-testid="moq"]',
            '.price-item + .id-text-\\[#767676\\]'
          ],
          type: 'text',
          fallback: '1'
        },
        main_image: {
          selectors: [
            '.main-image-tc-image-magnifier.current-main-image img',
            '.main-image-tc-image-magnifier img',
            '.image-gallery-main img',
            '.product-view img'
          ],
          type: 'attr',
          attribute: 'src',
          fallback: ''
        },
        gallery_images: {
          selectors: [
            '.main-image-tc-thumbnail',
            '.image-gallery-thumbs img',
            '.thumbnails img'
          ],
          type: 'styleAll',
          fallback: []
        },
        description: {
          selectors: [
            '.module_product_specification .richtext-detail',
            '.module_product_specification #J-rich-text-description',
            '.module_product_specification',
            '.rich-text-description',
            '.module_structure_description .id-whitespace-pre-line',
            '[data-testid="module-structure-description"] .id-whitespace-pre-line',
            '.module_structure_descption_productDescription',
            '.module-structure-description',
            '.product-description-content',
            '.product-description',
            '.detail-content',
            '[data-testid="product-detail-text-sort"]',
            '.module_structure_description',
            '#product-description',
            '.offer-detail'
          ],
          type: 'html',
          fallback: ''
        },
        attributes: {
          selectors: [
            '[data-testid="module-attribute-row"]',
            '[data-testid="module-attribute-group-grid"]'
          ],
          type: 'attributes',
          fallback: {}
        },
        supplier: {
          selectors: [
            '.three-col-mini-company-card .id-truncate',
            '[data-testid="three-column-mini-company-card"] .id-truncate',
            '.company-name',
            '.seller-name'
          ],
          type: 'text',
          fallback: ''
        },
        location: {
          selectors: [
            '.three-col-mini-company-card .id-text-xs',
            '[data-testid="three-column-mini-company-card"] .id-text-xs',
            '.business-location',
            '.location'
          ],
          type: 'text',
          fallback: ''
        }
      }
    };
    
    // 阿里特定的配置
    this.skuStrategy = this.strategies.sku || {
      type: 'multi-spec',
      specGroups: [
        {
          selector: '[data-testid="sku-list"]',
          titleSelector: '[data-testid="sku-list-title"]',
          itemSelector: '[data-testid="non-last-sku-item-three-column"]',
          nameSelector: 'span, img[alt]'
        }
      ]
    };
  }

  /**
   * 初始化适配器
   */
  init(remoteConfig) {
    // 🔥 使用父类的 getPlatformConfig
    const config = this.constructor.getPlatformConfig(remoteConfig);
    this.config = config;
    // 🔥 如果传入的配置有 selectors，使用传入的；否则使用构造函数的默认值
    this.selectors = config.selectors || this.selectors || {};
    this.mapping = config.mapping || {};
    this.validation = config.validation || {};
    this.strategies = config.strategies || {};
    // 更新 skuStrategy
    this.skuStrategy = this.strategies.sku || {
      type: 'multi-spec',
      specGroups: [
        {
          selector: '[data-testid="sku-list"]',
          titleSelector: '[data-testid="sku-list-title"]',
          itemSelector: '[data-testid="non-last-sku-item-three-column"]',
          nameSelector: 'span, img[alt]'
        }
      ]
    };
    return this;
  }

  /**
   * 主采集方法（覆盖父类）
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
   * 提取 HTML 内容（阿里特定）
   */
  extractHtml(element) {
    const iframe = element.querySelector('iframe[src*="descIframe"], iframe[src*="description"]');
    if (iframe) {
      const content = this.extractIframeContent(iframe);
      if (content) return content;
      return iframe.outerHTML;
    }
    return element.innerHTML || '';
  }

  /**
   * 提取 iframe 内容
   */
  extractIframeContent(iframe) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const contentSelectors = [
          '.content',
          '.description-content',
          '.product-description',
          '.richtext',
          '.rich-text',
          '.module_product_specification',
          '#J-rich-text-description',
          'body'
        ];
        for (const sel of contentSelectors) {
          const el = doc.querySelector(sel);
          if (el && el.innerText?.trim()?.length > 10) {
            return el.innerHTML;
          }
        }
        if (doc.body && doc.body.innerHTML?.trim()) {
          return doc.body.innerHTML;
        }
      }
    } catch (e) {
      console.warn('无法访问 iframe 内容 (跨域):', e.message);
    }
    return null;
  }

  /**
   * 提取属性键值对（阿里特定）
   */
  extractAttributes(element) {
    const attrs = {};
    
    // 阿里特定方式1：module-attribute-row
    const rows = element.querySelectorAll('[data-testid="module-attribute-row"]');
    if (rows.length > 0) {
      for (const row of rows) {
        const nameEl = row.querySelector('[data-testid="module-attribute-name"]');
        const valueEl = row.querySelector('[data-testid="module-attribute-value"]');
        if (nameEl && valueEl) {
          const key = nameEl.innerText?.trim();
          const value = valueEl.innerText?.trim();
          if (key && value) attrs[key] = value;
        }
      }
      console.log('📋 提取到属性数量 (阿里):', Object.keys(attrs).length);
      return attrs;
    }
    
    // 阿里特定方式2：three-column-key-attributes
    const container = document.querySelector('[data-testid="three-column-key-attributes"]');
    if (container) {
      const items = container.querySelectorAll('[data-testid="three-column-key-attributes-row"]');
      for (const item of items) {
        const nameEl = item.querySelector('[data-testid="module-attribute-name"]');
        const valueEl = item.querySelector('[data-testid="module-attribute-value"]');
        if (nameEl && valueEl) {
          const key = nameEl.innerText?.trim();
          const value = valueEl.innerText?.trim();
          if (key && value) attrs[key] = value;
        }
      }
      console.log('📋 提取到属性数量 (阿里 three-column):', Object.keys(attrs).length);
      return attrs;
    }
    
    // 降级：使用父类的通用方法
    console.log('📋 阿里特定属性未找到，使用通用方法');
    return super.extractAttributes(element);
  }

  /**
   * 提取 SKU（阿里特定）
   */
  async extractSKU(skuStrategy) {
    const strategy = skuStrategy || this.skuStrategy;
    const skuList = [];

    try {
      const skuGroups = [];
      const skuLists = document.querySelectorAll('[data-testid="sku-list"]');
      
      for (const list of skuLists) {
        const titleEl = list.querySelector('[data-testid="sku-list-title"]');
        const title = titleEl?.innerText?.trim() || '';
        const items = list.querySelectorAll('[data-testid="non-last-sku-item-three-column"]');
        const options = [];
        
        for (const item of items) {
          const span = item.querySelector('span');
          const img = item.querySelector('img');
          let value = '';
          if (span) {
            value = span.innerText.trim();
          } else if (img) {
            value = img.getAttribute('alt') || '';
          }
          if (value) {
            options.push({
              value: value,
              selected: item.querySelector('.selected, .double-bordered-box.selected') !== null
            });
          }
        }
        
        if (title && options.length > 0) {
          skuGroups.push({ name: title, options });
        }
      }
      
      console.log('🔍 检测到 SKU 规格:', skuGroups);
      
      if (skuGroups.length === 0) {
        const skuSelectors = [
          '[data-testid="sku-item"]',
          '.sku-item',
          '.sku-selector-item',
          '.spec-item'
        ];
        let skuElements = [];
        for (const selector of skuSelectors) {
          const els = document.querySelectorAll(selector);
          if (els.length > 0) {
            skuElements = els;
            break;
          }
        }
        for (const el of skuElements) {
          const nameEl = el.querySelector('.sku-name, .spec-name, .label, .spec-value');
          const priceEl = el.querySelector('.sku-price, .price, .spec-price');
          if (nameEl) {
            const priceText = priceEl ? priceEl.innerText?.trim() || '' : '';
            const priceRange = this.extractPriceRange(priceText);
            skuList.push({
              id: el.getAttribute('data-sku-id') || el.getAttribute('data-id') || '',
              name: nameEl.innerText?.trim() || '',
              price: priceRange.min || 0,
              stock: 0
            });
          }
        }
        return skuList;
      }
      
      // 单规格
      if (skuGroups.length === 1) {
        const group = skuGroups[0];
        for (const option of group.options) {
          skuList.push({
            id: option.value,
            name: option.value,
            price: 0,
            stock: 0
          });
        }
        console.log('✅ 生成单规格变体列表:', skuList.length, '项');
        return skuList;
      }
      
      // 多规格：笛卡尔积
      const cartesianProduct = (groups, index = 0, current = {}) => {
        if (index >= groups.length) {
          const name = Object.values(current).join(' / ');
          skuList.push({
            id: name,
            name: name,
            price: 0,
            stock: 0
          });
          return;
        }
        const group = groups[index];
        for (const option of group.options) {
          current[group.name] = option.value;
          cartesianProduct(groups, index + 1, current);
        }
      };
      cartesianProduct(skuGroups);
      
      console.log('✅ 生成多规格变体列表:', skuList.length, '项');
      
    } catch (err) {
      console.warn('阿里 SKU 提取失败:', err.message);
    }
    
    return skuList;
  }

  /**
   * 提取价格区间
   */
  extractPriceRange(text) {
    if (!text) return { min: 0, max: 0 };
    const numbers = text.match(/\d+(?:\.\d+)?/g) || [];
    if (numbers.length === 0) return { min: 0, max: 0 };
    if (numbers.length === 1) {
      const val = parseFloat(numbers[0]);
      return { min: val, max: val };
    }
    const floats = numbers.map(parseFloat);
    return { min: Math.min(...floats), max: Math.max(...floats) };
  }

  /**
   * 提取自定义字段（阿里特定）
   */
  async extractCustomFields(signal) {
    const data = {};
    
    const attrContainer = document.querySelector('[data-testid="module-attribute-row"]');
    if (attrContainer) {
      data.attributes = this.extractAttributes(attrContainer);
    }
    
    const supplierEl = document.querySelector('.three-col-mini-company-card .id-truncate');
    if (supplierEl) {
      data.supplier = supplierEl.innerText?.trim() || '';
    }
    
    const locationEl = document.querySelector('.three-col-mini-company-card .id-text-xs');
    if (locationEl) {
      data.location = locationEl.innerText?.trim() || '';
    }
    
    return data;
  }
}