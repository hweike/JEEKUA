// src/adapters/china-1688-adapter.js
console.log('[China1688Adapter] 脚本开始加载...');

(function(window, document) {
  'use strict';

  const BaseAdapter = window.__adapters.BaseAdapter;
  if (!BaseAdapter) {
    console.error('[China1688Adapter] BaseAdapter 未找到');
    return;
  }

  const configLoader = window.__jeekuaConfig;

  class China1688Adapter extends BaseAdapter {
    get platformId() {
      return '1688';
    }

    async scrape() {
      console.log('[China1688Adapter] 开始采集...');

      // ⭐ 增加等待时间，确保页面完全加载
      await this.waitForImages(5000);
      await this.waitForSkuTable(5000);
      await this.waitForDescription(5000);

      // ⭐ 额外等待：确保动态内容加载完成
      await this.waitForPageReady(3000);

      // ⭐ 加载平台配置
      const config = await configLoader?.loadPlatformConfig('1688');
      if (!config) {
        console.error('[China1688Adapter] 配置加载失败');
        return this.getDefaultData();
      }

      console.log('[China1688Adapter] 配置字段:', Object.keys(config.fields || {}));

      const data = {
        platform: '1688',
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      const fields = config.fields || {};

      // ⭐ 遍历所有字段，根据类型提取
      for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        const type = fieldConfig.type || 'text';
        const selectors = fieldConfig.selectors || [];
        const fallback = fieldConfig.fallback;
        const attribute = fieldConfig.attribute;

        if (fieldName === 'gallery_images' || fieldName === 'galleryImages') {
          console.log(`[China1688Adapter] 执行 ${fieldName}, type: ${type}, selectors:`, selectors);
        }

        switch (type) {
          case 'text':
          case 'currency':
            data[fieldName] = this.extractText(selectors, fallback);
            break;
          case 'html':
            data[fieldName] = await this.extractHtml(selectors, fallback);
            break;
          case 'attr':
            data[fieldName] = this.extractSingleAttr(selectors, attribute, fallback);
            break;
          case 'attrAll':
            data[fieldName] = this.extractAllAttr(selectors, attribute, fallback);
            break;
          case 'styleAll':
            console.log(`[China1688Adapter] 执行 styleAll, 字段: ${fieldName}, 选择器:`, selectors);
            data[fieldName] = await this.extractStyleAll(selectors, fallback);
            console.log(`[China1688Adapter] styleAll 结果, 字段: ${fieldName}, 找到: ${data[fieldName]?.length || 0} 张`);
            break;
          case 'attributes':
            data[fieldName] = this.extractAttributes(selectors, fallback);
            break;
          case 'extractSkuTable':
            console.log(`[China1688Adapter] 执行 extractSkuTable, 字段: ${fieldName}`);
            data[fieldName] = await this.extractSkuTable(selectors);
            console.log(`[China1688Adapter] extractSkuTable 结果: ${data[fieldName]?.length || 0} 个 SKU`);
            break;
          default:
            data[fieldName] = this.extractText(selectors, fallback);
        }
      }

      // ============================================================
      // ⭐⭐⭐ 1688 平台强制设置货币为 CNY
      // ============================================================
      console.log('[China1688Adapter] 设置 1688 平台货币: CNY');
      data.currency = 'CNY';
      
      // 确保价格带有货币符号（用于后台 extractCurrency 识别）
      if (data.price && data.price !== '0' && data.price !== '未找到价格') {
        // 如果价格不包含 ¥ 符号，添加前缀
        if (!data.price.includes('¥') && !data.price.includes('CNY')) {
          data.price = '¥' + data.price;
          console.log('[China1688Adapter] 价格添加 ¥ 前缀:', data.price);
        }
      }
      console.log('[China1688Adapter] 最终价格:', data.price, '货币:', data.currency);

      // ⭐ 如果 gallery_images 为空，尝试备用方法
      if (!data.gallery_images || data.gallery_images.length === 0) {
        console.log('[China1688Adapter] gallery_images 为空，尝试备用方法...');
        data.gallery_images = await this.extractGalleryImagesBackup();
        console.log(`[China1688Adapter] 备用方法找到 ${data.gallery_images?.length || 0} 张图片`);
      }

      // ⭐ 如果 images 字段存在但为空，使用 gallery_images 填充
      if ((!data.images || data.images.length === 0) && data.gallery_images && data.gallery_images.length > 0) {
        data.images = data.gallery_images;
        console.log('[China1688Adapter] 使用 gallery_images 填充 images:', data.images.length);
      }

      // ⭐ 如果 main_image 为空，从 gallery_images 取第一张
      if (!data.main_image && data.gallery_images && data.gallery_images.length > 0) {
        data.main_image = data.gallery_images[0];
        console.log('[China1688Adapter] main_image 从 gallery_images 获取:', data.main_image.substring(0, 60));
      }

      // ⭐ 如果 description 为空，尝试备用方法
      if (!data.description || data.description.trim() === '') {
        console.log('[China1688Adapter] description 为空，尝试备用方法...');
        const descBackup = await this.extractDescriptionBackup();
        if (descBackup) {
          data.description = descBackup;
          console.log('[China1688Adapter] 备用描述提取成功，长度:', data.description.length);
        }
      }

      // ⭐ 处理字段映射 (field_mapping)
      if (config.field_mapping) {
        for (const [from, to] of Object.entries(config.field_mapping)) {
          if (data[from] !== undefined) {
            data[to] = data[from];
          }
        }
      }

      console.log('[China1688Adapter] 采集完成:', {
        title: data.title,
        price: data.price,
        main_image: data.main_image ? data.main_image.substring(0, 60) : '无',
        gallery_count: data.gallery_images?.length || 0,
        images_count: data.images?.length || 0,
        description_length: data.description?.length || 0,
        attributes_count: Object.keys(data.attributes || {}).length,
        sku_count: data.sku_list?.length || 0
      });
      return data;
    }

    // ============================================================
    // ⭐ 等待页面完全就绪
    // ============================================================

    async waitForPageReady(timeout = 3000) {
      console.log('[China1688Adapter] 等待页面完全就绪...');
      const start = Date.now();
      return new Promise((resolve) => {
        const checkReady = () => {
          if (document.readyState === 'complete') {
            console.log('[China1688Adapter] ✅ 页面完全就绪');
            resolve();
            return;
          }
          if (Date.now() - start > timeout) {
            console.log('[China1688Adapter] 页面就绪等待超时，继续执行');
            resolve();
          } else {
            setTimeout(checkReady, 200);
          }
        };
        checkReady();
      });
    }

    // ============================================================
    // ⭐ 等待 SKU 表格加载
    // ============================================================

    async waitForSkuTable(timeout = 5000) {
      console.log('[China1688Adapter] 等待 SKU 表格...');
      const start = Date.now();
      
      // ⭐ 尝试滚动到 SKU 区域触发加载
      try {
        const skuSection = document.querySelector('#skuSelection');
        if (skuSection) {
          skuSection.scrollIntoView({ behavior: 'smooth' });
          await new Promise(r => setTimeout(r, 800));
        }
      } catch (e) {}
      
      return new Promise((resolve) => {
        const checkSku = () => {
          const skuTable = document.querySelector('.gyp-pro-table .ant-table-tbody') ||
                           document.querySelector('.sku-attr-table .ant-table-tbody') ||
                           document.querySelector('#skuSelection .expand-view-item');
          
          if (skuTable && skuTable.querySelectorAll('tr, .expand-view-item').length > 0) {
            console.log('[China1688Adapter] ✅ SKU 表格已加载，行数:', skuTable.querySelectorAll('tr, .expand-view-item').length);
            resolve();
            return;
          }
          
          if (Date.now() - start > timeout) {
            console.log('[China1688Adapter] SKU 表格加载等待超时，继续执行');
            resolve();
          } else {
            setTimeout(checkSku, 300);
          }
        };
        checkSku();
      });
    }

    // ============================================================
    // ⭐ 等待描述加载
    // ============================================================

    async waitForDescription(timeout = 5000) {
      console.log('[China1688Adapter] 等待描述...');
      const start = Date.now();
      
      // ⭐ 尝试滚动到描述区域触发懒加载
      try {
        const descSection = document.querySelector('#description');
        if (descSection) {
          descSection.scrollIntoView({ behavior: 'smooth' });
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e) {}
      
      return new Promise((resolve) => {
        const checkDesc = () => {
          // ⭐ 通过类名 .html-description 查找（不依赖具体元素名）
          const htmlDesc = document.querySelector('.html-description');
          if (htmlDesc) {
            let content = '';
            if (htmlDesc.shadowRoot) {
              const detail = htmlDesc.shadowRoot.querySelector('#detail');
              if (detail) {
                content = detail.textContent.trim();
              } else {
                const match = htmlDesc.shadowRoot.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                if (match && match[1]) {
                  content = match[1].trim();
                }
              }
            } else {
              const template = htmlDesc.querySelector('template[shadowrootmode]');
              if (template) {
                const match = template.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                if (match && match[1]) {
                  content = match[1].trim();
                }
              }
            }
            if (content.length > 50) {
              console.log('[China1688Adapter] ✅ 描述已加载 (.html-description)，长度:', content.length);
              resolve();
              return;
            }
          }
          
          const desc = document.querySelector('#description .collapse-body');
          if (desc && desc.textContent.trim().length > 50) {
            console.log('[China1688Adapter] ✅ 描述已加载，长度:', desc.textContent.trim().length);
            resolve();
            return;
          }
          
          if (Date.now() - start > timeout) {
            console.log('[China1688Adapter] 描述加载等待超时，继续执行');
            resolve();
          } else {
            setTimeout(checkDesc, 300);
          }
        };
        checkDesc();
      });
    }

    // ============================================================
    // ⭐ 等待图片加载
    // ============================================================

    async waitForImages(timeout = 5000) {
      console.log('[China1688Adapter] 等待图片加载...');
      const start = Date.now();
      
      return new Promise((resolve) => {
        const checkImages = () => {
          const images = document.querySelectorAll('img');
          let loaded = 0;
          let total = 0;
          for (const img of images) {
            if (img.complete && img.naturalWidth > 0) {
              loaded++;
            }
            total++;
          }
          if (loaded > 0 || Date.now() - start > timeout) {
            console.log(`[China1688Adapter] 图片加载检查: ${loaded}/${total} 已加载`);
            resolve();
          } else {
            setTimeout(checkImages, 200);
          }
        };
        checkImages();
      });
    }

    // ============================================================
    // ⭐ 提取方法
    // ============================================================

    extractText(selectors, fallback) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            if (text) {
              console.log(`[China1688Adapter] ✅ text 命中: ${selector}`);
              return text;
            }
          }
        } catch (e) {}
      }
      return fallback || '';
    }

    // ============================================================
    // ⭐ 提取 HTML（通过 .html-description 类名查找，不依赖具体元素名）
    // ============================================================

    async extractHtml(selectors, fallback) {
      console.log('[China1688Adapter] extractHtml 开始执行, selectors:', selectors);
      
      for (const selector of selectors) {
        try {
          // ⭐⭐ 核心修复：通过类名 .html-description 查找（不依赖具体元素名）
          if (selector === '.html-description' || selector.includes('html-description')) {
            
            console.log('[China1688Adapter] 处理 .html-description 选择器:', selector);
            
            // 通过类名查找
            const htmlDesc = document.querySelector('.html-description');
            if (htmlDesc) {
              console.log('[China1688Adapter] 找到 .html-description 元素:', htmlDesc.tagName);
              let content = '';
              
              // ⭐ 方法1: 通过 shadowRoot 访问
              if (htmlDesc.shadowRoot) {
                console.log('[China1688Adapter] .html-description 有 shadowRoot');
                
                // 查找 #detail
                const detailEl = htmlDesc.shadowRoot.querySelector('#detail');
                if (detailEl) {
                  content = detailEl.innerHTML.trim();
                  console.log('[China1688Adapter] 从 shadowRoot #detail 提取，长度:', content.length);
                } else {
                  // 如果 #detail 没找到，从整个 shadowRoot 中匹配
                  const allContent = htmlDesc.shadowRoot.innerHTML;
                  const match = allContent.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                  if (match && match[1]) {
                    content = match[1].trim();
                    console.log('[China1688Adapter] 从 shadowRoot 匹配 #detail，长度:', content.length);
                  } else {
                    content = allContent.trim();
                    console.log('[China1688Adapter] 从 shadowRoot 全部内容，长度:', content.length);
                  }
                }
              } else {
                // ⭐ 方法2: 查找 template[shadowrootmode]
                console.log('[China1688Adapter] 没有 shadowRoot，查找 template');
                const template = htmlDesc.querySelector('template[shadowrootmode]');
                if (template) {
                  const templateContent = template.innerHTML;
                  const match = templateContent.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                  if (match && match[1]) {
                    content = match[1].trim();
                    console.log('[China1688Adapter] 从 template 匹配 #detail，长度:', content.length);
                  } else {
                    content = templateContent.trim();
                    console.log('[China1688Adapter] 从 template 全部内容，长度:', content.length);
                  }
                }
              }
              
              // 如果获取到内容，清理并返回
              if (content && content.length > 20) {
                content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
                content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
                content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
                content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
                content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
                content = content.replace(/\s+/g, ' ').trim();
                
                if (content.length > 20) {
                  console.log(`[China1688Adapter] ✅ 从 .html-description 提取描述，长度: ${content.length}`);
                  console.log('[China1688Adapter] 描述包含图片:', content.includes('<img') ? '是' : '否');
                  console.log('[China1688Adapter] 描述前200字符:', content.substring(0, 200));
                  return content;
                }
              }
            } else {
              console.log('[China1688Adapter] 未找到 .html-description 元素');
            }
            // 如果 .html-description 处理失败，继续尝试其他选择器
            continue;
          }
          
          // ⭐ 从 #description .collapse-body 查找
          if (selector === '#description .collapse-body' || selector === '.module-od-product-description .collapse-body') {
            const descBody = document.querySelector(selector);
            if (descBody) {
              console.log('[China1688Adapter] 从', selector, '查找');
              let content = '';
              
              // 查找内部的 .html-description
              const innerHtmlDesc = descBody.querySelector('.html-description');
              if (innerHtmlDesc && innerHtmlDesc.shadowRoot) {
                const detailEl = innerHtmlDesc.shadowRoot.querySelector('#detail');
                if (detailEl) {
                  content = detailEl.innerHTML.trim();
                  console.log('[China1688Adapter] 从 collapse-body 内 .html-description shadowRoot 提取，长度:', content.length);
                }
              }
              
              // 查找 template
              if (!content || content.length < 20) {
                const template = descBody.querySelector('template[shadowrootmode]');
                if (template) {
                  const match = template.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                  if (match && match[1]) {
                    content = match[1].trim();
                    console.log('[China1688Adapter] 从 collapse-body template 匹配 #detail，长度:', content.length);
                  }
                }
              }
              
              // 直接获取 collapse-body 内容
              if (!content || content.length < 20) {
                content = descBody.innerHTML.trim();
                console.log('[China1688Adapter] 从 collapse-body 直接提取，长度:', content.length);
              }
              
              if (content && content.length > 20) {
                content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
                content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
                content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
                content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
                content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
                content = content.replace(/\s+/g, ' ').trim();
                
                if (content.length > 20) {
                  console.log(`[China1688Adapter] ✅ 从 ${selector} 提取，长度: ${content.length}`);
                  console.log('[China1688Adapter] 描述包含图片:', content.includes('<img') ? '是' : '否');
                  return content;
                }
              }
            }
            continue;
          }
          
          // ⭐ 常规选择器处理（兼容旧版本）
          const el = document.querySelector(selector);
          console.log(`[China1688Adapter] 检查选择器: ${selector}, 找到元素:`, !!el);
          
          if (!el) continue;
          
          let content = '';
          
          // 检查元素是否有 shadowRoot
          if (el.shadowRoot) {
            const detailEl = el.shadowRoot.querySelector('#detail');
            if (detailEl) {
              content = detailEl.innerHTML.trim();
              console.log('[China1688Adapter] 从 el.shadowRoot #detail 提取，长度:', content.length);
            } else {
              content = el.shadowRoot.innerHTML.trim();
              console.log('[China1688Adapter] 从 el.shadowRoot 全部内容提取，长度:', content.length);
            }
          } else {
            content = el.innerHTML.trim();
            console.log('[China1688Adapter] 从 el.innerHTML 提取，长度:', content.length);
          }
          
          // 如果内容中包含 template，尝试提取
          if (content && content.includes('<template')) {
            const tempMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
            if (tempMatch) {
              const innerMatch = tempMatch[1].match(/<div id="detail">([\s\S]*?)<\/div>/i);
              if (innerMatch) {
                content = innerMatch[1].trim();
                console.log('[China1688Adapter] 从 template 内匹配 #detail，长度:', content.length);
              } else {
                content = tempMatch[1].trim();
                console.log('[China1688Adapter] 从 template 提取内容，长度:', content.length);
              }
            }
          }
          
          if (content && content.length > 20) {
            content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
            content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
            content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
            content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
            content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
            content = content.replace(/\s+/g, ' ').trim();
            
            if (content.length > 20) {
              console.log(`[China1688Adapter] ✅ html 命中: ${selector}, 长度: ${content.length}`);
              console.log(`[China1688Adapter] 描述包含图片:`, content.includes('<img') ? '是' : '否');
              console.log(`[China1688Adapter] 描述前200字符:`, content.substring(0, 200));
              return content;
            }
          }
        } catch (e) {
          console.warn(`[China1688Adapter] selector ${selector} 出错:`, e);
        }
      }
      
      // ⭐ 降级：从 meta description 获取
      try {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && metaDesc.content && metaDesc.content.length > 50) {
          console.log('[China1688Adapter] ✅ 从 meta description 获取描述，长度:', metaDesc.content.length);
          return metaDesc.content;
        }
      } catch (e) {}
      
      console.log('[China1688Adapter] ⚠️ 描述提取失败');
      return fallback || '';
    }

    extractSingleAttr(selectors, attribute, fallback) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const value = el.getAttribute(attribute);
            if (value) {
              console.log(`[China1688Adapter] ✅ attr 命中: ${selector}`);
              return value;
            }
          }
        } catch (e) {}
      }
      return fallback || '';
    }

    extractAllAttr(selectors, attribute, fallback) {
      const results = [];
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const value = el.getAttribute(attribute);
            if (value) {
              results.push(value);
            }
          }
          if (results.length > 0) {
            console.log(`[China1688Adapter] ✅ attrAll 命中: ${selector}, 找到 ${results.length} 个`);
            return results;
          }
        } catch (e) {}
      }
      return fallback || [];
    }

    // ⭐ 提取样式中的图片（1688 图片提取）
    async extractStyleAll(selectors, fallback) {
      console.log('[China1688Adapter] extractStyleAll 开始执行...');
      const images = [];
      const seen = new Set();

      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[China1688Adapter] 检查 selector: ${selector}, 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || 
                      el.getAttribute('src') ||
                      el.getAttribute('data-src') || 
                      el.getAttribute('data-original') || 
                      el.getAttribute('data-lazy') ||
                      el.getAttribute('data-srcset') ||
                      el.getAttribute('data-image');
            
            // 检查 background-image
            if (!src || src.startsWith('data:image')) {
              const style = el.getAttribute('style') || '';
              const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
              if (bgMatch && bgMatch[1]) {
                src = bgMatch[1];
              }
            }
            
            // 1688 缩略图转大图
            if (src && src.includes('_b.jpg')) {
              src = src.replace('_b.jpg', '.jpg');
            }
            if (src && src.includes('_sum.jpg')) {
              src = src.replace('_sum.jpg', '.jpg');
            }
            if (src && src.includes('_250x250.jpg')) {
              src = src.replace('_250x250.jpg', '.jpg');
            }
            
            if (src && !src.startsWith('data:image') && !seen.has(src)) {
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              if (!src.startsWith('http') && !src.startsWith('//')) {
                src = window.location.origin + '/' + src.replace(/^\.?\//, '');
              }
              // 只保留 http 链接
              if (src.startsWith('http')) {
                seen.add(src);
                images.push(src);
                console.log(`[China1688Adapter] 找到图片: ${src.substring(0, 80)}...`);
              }
            }
          }
          
          if (images.length > 0) {
            console.log(`[China1688Adapter] ✅ styleAll 命中: ${selector}, 找到 ${images.length} 张`);
            return images;
          }
        } catch (e) {
          console.warn(`[China1688Adapter] selector ${selector} 出错:`, e);
        }
      }
      console.log('[China1688Adapter] styleAll 未找到任何图片');
      return fallback || [];
    }

    // ============================================================
    // ⭐ SKU 表格提取（1688 特有）
    // ============================================================

    async extractSkuTable(selectors) {
      console.log('[China1688Adapter] 提取 SKU 信息...');
      const skuList = [];
      
      try {
        // ⭐ 方法1: 从 SKU 选择器提取（颜色 + 尺码组合）
        const colorButtons = document.querySelectorAll('#skuSelection .transverse-filter .sku-filter-button');
        const sizeItems = document.querySelectorAll('#skuSelection .expand-view-list .expand-view-item');
        
        console.log('[China1688Adapter] 找到颜色选项:', colorButtons.length);
        console.log('[China1688Adapter] 找到尺码选项:', sizeItems.length);
        
        // 如果有颜色和尺码，生成组合
        if (colorButtons.length > 0 && sizeItems.length > 0) {
          console.log('[China1688Adapter] 生成颜色+尺码组合...');
          
          // 提取颜色列表
          const colors = [];
          for (const btn of colorButtons) {
            const img = btn.querySelector('.label-image-wrap img');
            const nameEl = btn.querySelector('.label-name');
            const name = nameEl ? nameEl.textContent.trim() : '默认颜色';
            const image = img ? img.src || img.getAttribute('data-src') || '' : '';
            colors.push({ name, image: image.replace('_sum.jpg', '.jpg') });
          }
          
          // 提取尺码列表
          const sizes = [];
          for (const item of sizeItems) {
            const nameEl = item.querySelector('.item-label');
            const priceEl = item.querySelector('.item-price-stock');
            const stockEl = item.querySelector('.item-price-stock:last-child');
            
            const name = nameEl ? nameEl.textContent.trim() : '默认尺码';
            let price = '0';
            let stock = '0';
            
            if (priceEl) {
              const priceText = priceEl.textContent.trim();
              const match = priceText.match(/[\d.]+/);
              if (match) price = match[0];
            }
            if (stockEl) {
              const stockText = stockEl.textContent.trim();
              const match = stockText.match(/[\d,]+/);
              if (match) stock = match[0].replace(/,/g, '');
            }
            
            sizes.push({ name, price: parseFloat(price) || 0, stock: parseInt(stock) || 0 });
          }
          
          // 生成所有组合（笛卡尔积）
          for (const color of colors) {
            for (const size of sizes) {
              const skuName = color.name + ' + ' + size.name;
              skuList.push({
                name: skuName,
                price: size.price,
                stock: size.stock,
                image: color.image,
                specs: [color.name, size.name],
                sku_code: (color.name + '_' + size.name).replace(/\s+/g, '_').toUpperCase()
              });
            }
          }
          
          console.log('[China1688Adapter] 生成组合 SKU 数量:', skuList.length);
          
        } else if (sizeItems.length > 0) {
          // ⭐ 只有尺码，没有颜色
          console.log('[China1688Adapter] 只有尺码选项...');
          for (const item of sizeItems) {
            const nameEl = item.querySelector('.item-label');
            const priceEl = item.querySelector('.item-price-stock');
            const stockEl = item.querySelector('.item-price-stock:last-child');
            
            const name = nameEl ? nameEl.textContent.trim() : '默认尺码';
            let price = '0';
            let stock = '0';
            
            if (priceEl) {
              const priceText = priceEl.textContent.trim();
              const match = priceText.match(/[\d.]+/);
              if (match) price = match[0];
            }
            if (stockEl) {
              const stockText = stockEl.textContent.trim();
              const match = stockText.match(/[\d,]+/);
              if (match) stock = match[0].replace(/,/g, '');
            }
            
            skuList.push({
              name: name,
              price: parseFloat(price) || 0,
              stock: parseInt(stock) || 0,
              image: '',
              specs: [name],
              sku_code: name.replace(/\s+/g, '_').toUpperCase()
            });
          }
          
        } else if (colorButtons.length > 0) {
          // ⭐ 只有颜色，没有尺码
          console.log('[China1688Adapter] 只有颜色选项...');
          // 提取价格
          const priceEl = document.querySelector('.price-component .currency, .currency, [class*="price"]');
          let price = '0';
          if (priceEl) {
            const match = priceEl.textContent.trim().match(/[\d.]+/);
            if (match) price = match[0];
          }
          
          for (const btn of colorButtons) {
            const nameEl = btn.querySelector('.label-name');
            const img = btn.querySelector('.label-image-wrap img');
            const name = nameEl ? nameEl.textContent.trim() : '默认颜色';
            const image = img ? img.src || img.getAttribute('data-src') || '' : '';
            
            skuList.push({
              name: name,
              price: parseFloat(price) || 0,
              stock: 99999,
              image: image.replace('_sum.jpg', '.jpg'),
              specs: [name],
              sku_code: name.replace(/\s+/g, '_').toUpperCase()
            });
          }
        }
        
        // ⭐ 如果上面都没提取到，尝试从价格区域提取单个 SKU
        if (skuList.length === 0) {
          console.log('[China1688Adapter] 从价格区域提取单个 SKU...');
          const titleEl = document.querySelector('.title-content h1, .product-title h1, h1');
          const title = titleEl ? titleEl.textContent.trim() : '商品';
          
          const priceEl = document.querySelector('.price-component .currency, .currency, [class*="price"]');
          let price = '0';
          if (priceEl) {
            const match = priceEl.textContent.trim().match(/[\d.]+/);
            if (match) price = match[0];
          }
          
          if (price !== '0') {
            skuList.push({
              name: title.substring(0, 50),
              price: parseFloat(price) || 0,
              stock: 99999,
              image: '',
              specs: [],
              sku_code: 'DEFAULT_SKU'
            });
            console.log('[China1688Adapter] 从价格区域提取单个 SKU，价格:', price);
          }
        }
        
        console.log('[China1688Adapter] 最终提取到', skuList.length, '个 SKU');
        if (skuList.length > 0 && skuList.length <= 5) {
          console.log('[China1688Adapter] SKU 预览:', JSON.stringify(skuList.slice(0, 3), null, 2));
        }
        return skuList;
        
      } catch (e) {
        console.warn('[China1688Adapter] SKU 提取失败:', e);
        return skuList;
      }
    }

    // ============================================================
    // ⭐ 备用图片提取
    // ============================================================

    async extractGalleryImagesBackup() {
      console.log('[China1688Adapter] 执行备用图片提取...');
      const images = [];
      const seen = new Set();
      
      const allSelectors = [
        '.od-gallery-preview .preview-img',
        '.od-gallery-list .preview-img',
        '.od-picture-gallery-list .v-image-cover',
        '.od-gallery-preview img',
        '.preview-img',
        '.v-image-cover',
        '.od-scroller-item span',
        'img.preview-img'
      ];
      
      for (const selector of allSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[China1688Adapter] 备用选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || 
                      el.getAttribute('data-src') || 
                      el.getAttribute('data-original') ||
                      el.getAttribute('data-lazy');
            
            // 从 background-image 获取
            if (!src || src.startsWith('data:image')) {
              const bg = el.style.backgroundImage || el.getAttribute('style') || '';
              const match = bg.match(/url\(["']?(.*?)["']?\)/);
              if (match && match[1]) {
                src = match[1];
              }
            }
            
            if (src && !src.startsWith('data:image') && !seen.has(src)) {
              // 缩略图转大图
              if (src.includes('_b.jpg')) src = src.replace('_b.jpg', '.jpg');
              if (src.includes('_sum.jpg')) src = src.replace('_sum.jpg', '.jpg');
              if (src.includes('_250x250.jpg')) src = src.replace('_250x250.jpg', '.jpg');
              
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              if (src.startsWith('http')) {
                seen.add(src);
                images.push(src);
              }
            }
          }
          
          if (images.length > 0) {
            console.log(`[China1688Adapter] ✅ 备用方法找到 ${images.length} 张图片`);
            return images;
          }
        } catch (e) {
          console.warn(`[China1688Adapter] 备用选择器 "${selector}" 出错:`, e);
        }
      }
      
      console.log('[China1688Adapter] ⚠️ 备用方法未找到图片');
      return images;
    }

    // ============================================================
    // ⭐ 备用描述提取（通过 .html-description 类名查找）
    // ============================================================

    async extractDescriptionBackup() {
      console.log('[China1688Adapter] 执行备用描述提取...');
      
      // ⭐ 1. 通过类名 .html-description 查找（不依赖具体元素名）
      try {
        const htmlDesc = document.querySelector('.html-description');
        if (htmlDesc) {
          console.log('[China1688Adapter] 找到 .html-description 元素:', htmlDesc.tagName);
          let content = '';
          
          if (htmlDesc.shadowRoot) {
            console.log('[China1688Adapter] .html-description 有 shadowRoot');
            const detailEl = htmlDesc.shadowRoot.querySelector('#detail');
            if (detailEl) {
              content = detailEl.innerHTML.trim();
              console.log('[China1688Adapter] 从 shadowRoot #detail 获取，长度:', content.length);
            } else {
              const allContent = htmlDesc.shadowRoot.innerHTML;
              const match = allContent.match(/<div id="detail">([\s\S]*?)<\/div>/i);
              if (match && match[1]) {
                content = match[1].trim();
                console.log('[China1688Adapter] 从 shadowRoot 匹配 #detail，长度:', content.length);
              }
            }
          } else {
            console.log('[China1688Adapter] 没有 shadowRoot，查找 template');
            const template = htmlDesc.querySelector('template[shadowrootmode]');
            if (template) {
              const match = template.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
              if (match && match[1]) {
                content = match[1].trim();
                console.log('[China1688Adapter] 从 template 匹配 #detail，长度:', content.length);
              }
            }
          }
          
          if (content && content.length > 50) {
            content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
            content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
            console.log('[China1688Adapter] ✅ 从 .html-description 获取描述，长度:', content.length);
            console.log('[China1688Adapter] 描述包含图片:', content.includes('<img') ? '是' : '否');
            return content;
          }
        } else {
          console.log('[China1688Adapter] 未找到 .html-description 元素');
        }
      } catch (e) {
        console.warn('[China1688Adapter] Shadow DOM 提取失败:', e);
      }
      
      // ⭐ 2. 从描述容器提取
      const descSelectors = [
        '#description .collapse-body',
        '.module-od-product-description .collapse-body',
        '#description'
      ];
      
      for (const selector of descSelectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            console.log(`[China1688Adapter] 检查选择器: ${selector}, 找到元素`);
            let content = '';
            
            // 查找内部的 .html-description
            const innerHtmlDesc = el.querySelector('.html-description');
            if (innerHtmlDesc) {
              if (innerHtmlDesc.shadowRoot) {
                const detailEl = innerHtmlDesc.shadowRoot.querySelector('#detail');
                if (detailEl) {
                  content = detailEl.innerHTML.trim();
                  console.log('[China1688Adapter] 从 collapse-body 内的 .html-description shadowRoot 提取');
                }
              } else {
                const template = innerHtmlDesc.querySelector('template[shadowrootmode]');
                if (template) {
                  const match = template.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                  if (match) {
                    content = match[1].trim();
                    console.log('[China1688Adapter] 从 collapse-body 内的 .html-description template 提取');
                  }
                }
              }
            }
            
            // 查找 template
            if (!content || content.length < 50) {
              const template = el.querySelector('template[shadowrootmode]');
              if (template) {
                const match = template.innerHTML.match(/<div id="detail">([\s\S]*?)<\/div>/i);
                if (match) {
                  content = match[1].trim();
                  console.log('[China1688Adapter] 从 template 匹配 #detail');
                } else {
                  content = template.innerHTML.trim();
                }
              }
            }
            
            // 直接获取内容
            if (!content || content.length < 50) {
              const detailDiv = el.querySelector('#detail');
              if (detailDiv) {
                content = detailDiv.innerHTML.trim();
              } else {
                content = el.innerHTML.trim();
              }
            }
            
            if (content && content.length > 50) {
              content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
              content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
              console.log(`[China1688Adapter] ✅ 从 ${selector} 获取描述，长度:`, content.length);
              console.log('[China1688Adapter] 描述包含图片:', content.includes('<img') ? '是' : '否');
              return content;
            }
          }
        } catch (e) {
          console.warn(`[China1688Adapter] 选择器 ${selector} 出错:`, e);
        }
      }
      
      // ⭐ 3. 从 meta 标签获取
      try {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && metaDesc.content && metaDesc.content.length > 50) {
          console.log('[China1688Adapter] ✅ 从 meta description 获取描述，长度:', metaDesc.content.length);
          return metaDesc.content;
        }
      } catch (e) {}
      
      console.log('[China1688Adapter] ⚠️ 备用描述未找到');
      return '';
    }

    // ============================================================
    // ⭐ 属性提取（支持 1688 新 data-testid 结构）
    // ============================================================

    extractAttributes(selectors, fallback) {
      const attributes = {};
      console.log('[China1688Adapter] 提取属性, selectors:', selectors);

      for (const selector of selectors) {
        try {
          const rows = document.querySelectorAll(selector);
          console.log(`[China1688Adapter] 检查选择器 "${selector}", 找到 ${rows.length} 个元素`);
          
          for (const row of rows) {
            // ⭐ 方法1: 1688 新属性结构 (data-testid)
            let label = row.querySelector('[data-testid="module-attribute-name"]');
            let value = row.querySelector('[data-testid="module-attribute-value"]');
            
            if (label && value) {
              let key = label.getAttribute('title') || label.textContent.trim();
              let val = value.getAttribute('title') || value.textContent.trim();
              // 清理多余空白
              val = val.replace(/\s+/g, ' ').trim();
              key = key.replace(/\s+/g, ' ').trim();
              
              if (key && val) {
                attributes[key] = val;
                console.log(`[China1688Adapter] 提取属性 (data-testid): ${key} = ${val}`);
              }
              continue;
            }
            
            // ⭐ 方法2: 传统表格结构 (th/td)
            const th = row.querySelector('th, .label, .attr-label, .ant-descriptions-item-label');
            const td = row.querySelector('td, .value, .attr-value, .field-value, .ant-descriptions-item-content');
            
            if (th && td) {
              const key = th.textContent.trim();
              const val = td.textContent.trim();
              if (key && val) {
                attributes[key] = val;
                console.log(`[China1688Adapter] 从表格提取属性: ${key} = ${val}`);
              }
            }
            
            // ⭐ 方法3: 从 row 的 data 属性中提取
            const rowLabel = row.getAttribute('data-attr-name') || row.getAttribute('data-label');
            const rowValue = row.getAttribute('data-attr-value') || row.getAttribute('data-value');
            if (rowLabel && rowValue) {
              attributes[rowLabel] = rowValue;
              console.log(`[China1688Adapter] 从 data 属性提取: ${rowLabel} = ${rowValue}`);
            }
          }
          
          if (Object.keys(attributes).length > 0) {
            console.log(`[China1688Adapter] ✅ attributes 命中: ${selector}, 找到 ${Object.keys(attributes).length} 个`);
            return attributes;
          }
        } catch (e) {
          console.warn(`[China1688Adapter] selector ${selector} 出错:`, e);
        }
      }
      
      console.log('[China1688Adapter] 未提取到属性');
      return fallback || {};
    }

    // ============================================================
    // ⭐ 默认数据
    // ============================================================

    getDefaultData() {
      return {
        platform: '1688',
        url: window.location.href,
        title: '未找到标题',
        price: '0',
        currency: 'CNY',
        moq: '1',
        main_image: '',
        gallery_images: [],
        description: '',
        attributes: {},
        supplier: '',
        location: '',
        sku_list: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  window.__adapters.China1688Adapter = China1688Adapter;
  console.log('[China1688Adapter] 已挂载');

})(window, document);