// src/adapters/alibaba-adapter.js
console.log('[AlibabaAdapter] 脚本开始加载...');

(function(window, document) {
  'use strict';

  const BaseAdapter = window.__adapters.BaseAdapter;
  if (!BaseAdapter) {
    console.error('[AlibabaAdapter] BaseAdapter 未找到');
    return;
  }

  const configLoader = window.__jeekuaConfig;

  class AlibabaAdapter extends BaseAdapter {
    get platformId() {
      return 'alibaba';
    }

    async scrape() {
      console.log('[AlibabaAdapter] 开始采集...');

      // ⭐ 等待页面关键元素加载
      await this.waitForImages(2000);
      
      // ⭐ 等待描述容器加载（解决采集不稳定问题）
      await this.waitForDescriptionContainer(3000);

      // ⭐ 新增：等待 SKU 容器加载（解决 Popup 变体缺失问题）
      await this.waitForSkuContainer(3000);

      // ⭐ 加载平台配置
      const config = await configLoader?.loadPlatformConfig('alibaba');
      if (!config) {
        console.error('[AlibabaAdapter] 配置加载失败');
        return this.getDefaultData();
      }

      console.log('[AlibabaAdapter] 配置字段:', Object.keys(config.fields || {}));

      const data = {
        platform: 'alibaba',
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
          console.log(`[AlibabaAdapter] 执行 ${fieldName}, type: ${type}, selectors:`, selectors);
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
            console.log(`[AlibabaAdapter] 执行 styleAll, 字段: ${fieldName}, 选择器:`, selectors);
            data[fieldName] = await this.extractStyleAll(selectors, fallback);
            console.log(`[AlibabaAdapter] styleAll 结果, 字段: ${fieldName}, 找到: ${data[fieldName]?.length || 0} 张`);
            break;
          case 'attributes':
            data[fieldName] = this.extractAttributes(selectors, fallback);
            break;
          default:
            data[fieldName] = this.extractText(selectors, fallback);
        }
      }

      // ⭐ 如果 gallery_images 为空，尝试备用方法
      if (!data.gallery_images || data.gallery_images.length === 0) {
        console.log('[AlibabaAdapter] gallery_images 为空，尝试备用方法...');
        data.gallery_images = await this.extractGalleryImagesBackup();
        console.log(`[AlibabaAdapter] 备用方法找到 ${data.gallery_images?.length || 0} 张图片`);
      }

      // ⭐ 如果 gallery_images 仍然为空或只有缩略图，尝试从主图区域提取大图
      if (!data.gallery_images || data.gallery_images.length === 0 || this.hasThumbnailOnly(data.gallery_images)) {
        console.log('[AlibabaAdapter] 尝试从主图区域提取大图...');
        const mainImages = this.extractMainImages();
        if (mainImages && mainImages.length > 0) {
          data.gallery_images = mainImages;
          console.log(`[AlibabaAdapter] 从主图区域提取到 ${data.gallery_images.length} 张大图`);
        } else {
          // 如果主图区域没有，尝试从缩略图转换
          console.log('[AlibabaAdapter] 主图区域未找到，尝试从缩略图转换...');
          const convertedImages = this.extractThumbnailsAsLarge();
          if (convertedImages && convertedImages.length > 0) {
            data.gallery_images = convertedImages;
            console.log(`[AlibabaAdapter] 从缩略图转换为大图 ${data.gallery_images.length} 张`);
          }
        }
      }

      // ⭐ 如果 images 字段存在但为空，使用 gallery_images 填充
      if ((!data.images || data.images.length === 0) && data.gallery_images && data.gallery_images.length > 0) {
        data.images = data.gallery_images;
        console.log('[AlibabaAdapter] 使用 gallery_images 填充 images:', data.images.length);
      }

      // ⭐ 如果 main_image 为空，从 gallery_images 取第一张
      if (!data.main_image && data.gallery_images && data.gallery_images.length > 0) {
        data.main_image = data.gallery_images[0];
        console.log('[AlibabaAdapter] main_image 从 gallery_images 获取:', data.main_image.substring(0, 60));
      }

      // ⭐ 如果 description 为空或只是 iframe，尝试备用方法
      if (!data.description || data.description.trim() === '' || data.description.includes('<iframe')) {
        console.log('[AlibabaAdapter] description 为空或包含 iframe，尝试备用方法...');
        const descBackup = await this.extractDescriptionBackup();
        if (descBackup) {
          data.description = descBackup;
          console.log('[AlibabaAdapter] 备用描述提取成功，长度:', data.description.length);
        }
      }

      // ⭐ 提取变体（SKU）信息
      console.log('[AlibabaAdapter] 提取变体信息...');
      const variantsResult = await this.extractVariants();
      const skuList = variantsResult.sku_list || [];
      const variants = variantsResult.variants || [];

      // ⭐ 优先使用 sku_list，如果没有则从 variants 生成
      if (skuList && skuList.length > 0) {
        data.sku_list = skuList;
        data.variants = variants;
        console.log(`[AlibabaAdapter] 提取到 ${data.sku_list.length} 个 SKU 组合`);
        if (data.sku_list.length > 0 && data.sku_list.length <= 10) {
          console.log('[AlibabaAdapter] SKU 组合预览:', JSON.stringify(data.sku_list.slice(0, 5), null, 2));
        }
      } else if (variants && variants.length > 0) {
        // ⭐ 从 variants 生成 sku_list（笛卡尔积）
        console.log(`[AlibabaAdapter] 从 ${variants.length} 个变体组生成 SKU 组合...`);
        data.sku_list = this.generateSkuCombinations(variants);
        data.variants = variants;
        console.log(`[AlibabaAdapter] 生成 ${data.sku_list.length} 个 SKU 组合`);
        if (data.sku_list.length > 0 && data.sku_list.length <= 10) {
          console.log('[AlibabaAdapter] SKU 组合预览:', JSON.stringify(data.sku_list.slice(0, 5), null, 2));
        }
      } else {
        console.log('[AlibabaAdapter] 未找到 SKU 信息');
        data.sku_list = [];
        data.variants = [];
      }

      // ⭐ 如果 sku_list 为空，但页面上有变体 DOM，尝试从 DOM 提取
      if (data.sku_list.length === 0 && data.variants.length === 0) {
        console.log('[AlibabaAdapter] 尝试从 DOM 提取变体...');
        const domResult = await this.extractVariantsFromDOM();
        if (domResult && domResult.variants && domResult.variants.length > 0) {
          data.variants = domResult.variants;
          data.sku_list = this.generateSkuCombinations(domResult.variants);
          console.log(`[AlibabaAdapter] 从 DOM 提取变体，生成 ${data.sku_list.length} 个 SKU 组合`);
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

      // ⭐ 最终确认日志
      console.log('[AlibabaAdapter] 最终 SKU 数据:');
      console.log(`  - sku_list 数量: ${data.sku_list?.length || 0}`);
      console.log(`  - variants 数量: ${data.variants?.length || 0}`);
      if (data.sku_list && data.sku_list.length > 0 && data.sku_list.length <= 5) {
        console.log('  - sku_list 预览:', JSON.stringify(data.sku_list, null, 2));
      }

      console.log('[AlibabaAdapter] 采集完成:', {
        title: data.title,
        price: data.price,
        main_image: data.main_image ? data.main_image.substring(0, 60) : '无',
        gallery_count: data.gallery_images?.length || 0,
        images_count: data.images?.length || 0,
        description_length: data.description?.length || 0,
        attributes_count: Object.keys(data.attributes || {}).length,
        sku_count: data.sku_list?.length || 0,
        variants_count: data.variants?.length || 0
      });
      return data;
    }

    // ============================================================
    // ⭐ 检查是否只有缩略图
    // ============================================================

    hasThumbnailOnly(images) {
      if (!Array.isArray(images) || images.length === 0) return true;
      const thumbnailPatterns = ['_80x80', '_50x50', '_100x100', '_120x120', '_200x200'];
      for (const img of images) {
        let isThumbnail = false;
        for (const pattern of thumbnailPatterns) {
          if (img.includes(pattern)) {
            isThumbnail = true;
            break;
          }
        }
        if (!isThumbnail) return false;
      }
      return true;
    }

    // ============================================================
    // ⭐ 等待描述容器加载（解决采集不稳定问题）
    // ============================================================

    async waitForDescriptionContainer(timeout = 3000) {
      console.log('[AlibabaAdapter] 等待描述容器...');
      const start = Date.now();
      return new Promise((resolve) => {
        const checkContainer = () => {
          const selectors = [
            '.product-description-content',
            '.module_product_specification',
            '#product-description',
            '[data-testid="product-description"]',
            '.product-description',
            '.description',
            '.detail-content'
          ];
          let container = null;
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
              container = el;
              break;
            }
          }
          
          if (container) {
            const text = container.textContent.trim();
            if (text.length > 20) {
              console.log('[AlibabaAdapter] ✅ 描述容器已加载，内容长度:', text.length);
              resolve();
              return;
            }
          }
          
          if (Date.now() - start > timeout) {
            console.log('[AlibabaAdapter] 描述容器加载等待超时');
            resolve();
          } else {
            setTimeout(checkContainer, 200);
          }
        };
        checkContainer();
      });
    }

    // ============================================================
    // ⭐ 等待 SKU 容器加载（解决 Popup 变体缺失问题）
    // ============================================================

    async waitForSkuContainer(timeout = 3000) {
      console.log('[AlibabaAdapter] 等待 SKU 容器...');
      const start = Date.now();
      return new Promise((resolve) => {
        const checkSku = () => {
          const skuContainer = document.querySelector('[data-testid="sku-info"]') ||
                               document.querySelector('[data-module="module_sku"]') ||
                               document.querySelector('.module_sku') ||
                               document.querySelector('[data-testid="sku-layout"]');
          
          if (skuContainer) {
            console.log('[AlibabaAdapter] ✅ SKU 容器已加载');
            resolve();
            return;
          }
          
          if (Date.now() - start > timeout) {
            console.log('[AlibabaAdapter] SKU 容器加载等待超时');
            resolve();
          } else {
            setTimeout(checkSku, 200);
          }
        };
        checkSku();
      });
    }

    // ============================================================
    // ⭐ 等待图片加载
    // ============================================================

    async waitForImages(timeout) {
      console.log('[AlibabaAdapter] 等待图片加载...');
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
            console.log(`[AlibabaAdapter] 图片加载检查: ${loaded}/${total} 已加载`);
            resolve();
          } else {
            setTimeout(checkImages, 200);
          }
        };
        checkImages();
      });
    }

    // ============================================================
    // ⭐ 提取方法（增强版）
    // ============================================================

    extractText(selectors, fallback) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent.trim();
            if (text) {
              console.log(`[AlibabaAdapter] ✅ text 命中: ${selector}`);
              return text;
            }
          }
        } catch (e) {}
      }
      return fallback || '';
    }

    async extractHtml(selectors, fallback) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            if (el.tagName === 'IFRAME') {
              console.log(`[AlibabaAdapter] 检测到 iframe: ${selector}`);
              const iframeContent = await this.extractIframeContent(el);
              if (iframeContent) {
                console.log(`[AlibabaAdapter] ✅ iframe 内容提取成功`);
                return iframeContent;
              }
              return el.src || '';
            }
            
            const html = el.innerHTML.trim();
            if (html) {
              console.log(`[AlibabaAdapter] ✅ html 命中: ${selector}`);
              return html;
            }
          }
        } catch (e) {}
      }
      return fallback || '';
    }

    // ⭐ ============================================================
    // ⭐ 核心修改：extractIframeContent - 在源头清理脚本内容
    // ⭐ ============================================================

    async extractIframeContent(iframe) {
      console.log('[AlibabaAdapter] 提取 iframe 内容...');
      
      // ⭐ 1. 尝试访问 iframe 内部内容（同源）
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const body = doc.body;
          if (body) {
            // ⭐ 优先查找描述容器
            const descSelectors = [
              '.product-description',
              '.description',
              '.detail-content',
              '.richtext-detail',
              '.product-description-content',
              '.product-detail-description',
              '[class*="desc"]',
              '[class*="description"]',
              '.rich-text'
            ];
            
            let targetElement = null;
            for (const selector of descSelectors) {
              const el = body.querySelector(selector);
              if (el) {
                targetElement = el;
                break;
              }
            }
            
            // 如果找到描述容器，使用它
            if (targetElement) {
              const clone = targetElement.cloneNode(true);
              // 移除脚本、样式、noscript
              clone.querySelectorAll('script, style, noscript').forEach(s => s.remove());
              // 移除内联事件
              clone.querySelectorAll('*').forEach(el => {
                const attrs = el.attributes;
                for (const attr of attrs) {
                  if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                  }
                }
              });
              // 移除空的 div 和 p
              let content = clone.innerHTML.trim();
              content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
              content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
              // 清理全局变量定义
              content = content.replace(/window\.__\w+\s*=\s*[^;]*;/g, '');
              content = content.replace(/window\.\w+Data\s*=\s*\{[\s\S]*?\};/g, '');
              content = content.replace(/#detail_decorate_root[\s\S]*?\{[\s\S]*?\}/g, '');
              content = content.replace(/var\s+\w+\s*=\s*\{[\s\S]*?\};/g, '');
              // 移除多余空白
              content = content.replace(/\s+/g, ' ').trim();
              
              if (content && content.length > 50) {
                console.log('[AlibabaAdapter] ✅ 从 iframe 描述容器提取成功，长度:', content.length);
                return content;
              }
            }
            
            // ⭐ 如果找不到描述容器，提取 body 内容并清理
            const clone = body.cloneNode(true);
            clone.querySelectorAll('script, style, noscript').forEach(s => s.remove());
            // 移除内联事件
            clone.querySelectorAll('*').forEach(el => {
              const attrs = el.attributes;
              for (const attr of attrs) {
                if (attr.name.startsWith('on')) {
                  el.removeAttribute(attr.name);
                }
              }
            });
            
            let content = clone.innerHTML.trim();
            // 清理全局变量定义
            content = content.replace(/window\.__\w+\s*=\s*[^;]*;/g, '');
            content = content.replace(/window\.\w+Data\s*=\s*\{[\s\S]*?\};/g, '');
            content = content.replace(/#detail_decorate_root[\s\S]*?\{[\s\S]*?\}/g, '');
            content = content.replace(/var\s+\w+\s*=\s*\{[\s\S]*?\};/g, '');
            // 移除空的 div 和 p
            content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
            content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
            content = content.replace(/\s+/g, ' ').trim();
            
            if (content && content.length > 50) {
              console.log('[AlibabaAdapter] ✅ 从 iframe body 提取成功，长度:', content.length);
              return content;
            }
          }
        }
      } catch (e) {
        console.log('[AlibabaAdapter] iframe 跨域，无法访问内部内容');
      }
      
      // ⭐ 2. 跨域 iframe：尝试 fetch
      if (iframe.src && (iframe.src.startsWith(window.location.origin) || iframe.src.startsWith('//'))) {
        try {
          const fullSrc = iframe.src.startsWith('//') ? 'https:' + iframe.src : iframe.src;
          console.log('[AlibabaAdapter] fetch iframe 内容:', fullSrc);
          const response = await fetch(fullSrc);
          if (response.ok) {
            const html = await response.text();
            // ⭐ 提取 body 内容
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch && bodyMatch[1]) {
              let content = bodyMatch[1];
              // 移除脚本、样式
              content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
              content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
              content = content.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
              // 清理全局变量
              content = content.replace(/window\.__\w+\s*=\s*[^;]*;/g, '');
              content = content.replace(/window\.\w+Data\s*=\s*\{[\s\S]*?\};/g, '');
              content = content.replace(/#detail_decorate_root[\s\S]*?\{[\s\S]*?\}/g, '');
              content = content.replace(/var\s+\w+\s*=\s*\{[\s\S]*?\};/g, '');
              // 移除空的 div 和 p
              content = content.replace(/<div[^>]*>\s*<\/div>/gi, '');
              content = content.replace(/<p[^>]*>\s*<\/p>/gi, '');
              content = content.replace(/\s+/g, ' ').trim();
              
              if (content && content.length > 50) {
                console.log('[AlibabaAdapter] ✅ 通过 fetch 提取成功，长度:', content.length);
                return content;
              }
            }
          }
        } catch (fetchErr) {
          console.log('[AlibabaAdapter] fetch 失败:', fetchErr.message);
        }
      }
      
      console.log('[AlibabaAdapter] ⚠️ iframe 内容提取失败');
      return null;
    }

    extractSingleAttr(selectors, attribute, fallback) {
      for (const selector of selectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const value = el.getAttribute(attribute);
            if (value) {
              console.log(`[AlibabaAdapter] ✅ attr 命中: ${selector}`);
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
            console.log(`[AlibabaAdapter] ✅ attrAll 命中: ${selector}, 找到 ${results.length} 个`);
            return results;
          }
        } catch (e) {}
      }
      return fallback || [];
    }

    async extractStyleAll(selectors, fallback) {
      console.log('[AlibabaAdapter] extractStyleAll 开始执行...');
      const images = [];
      const seen = new Set();

      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[AlibabaAdapter] 检查 selector: ${selector}, 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || 
                      el.getAttribute('src') ||
                      el.getAttribute('data-src') || 
                      el.getAttribute('data-original') || 
                      el.getAttribute('data-lazy') ||
                      el.getAttribute('data-srcset') ||
                      el.getAttribute('data-image') ||
                      el.getAttribute('data-url') ||
                      el.getAttribute('data-original-src');
            
            if (!src || src.startsWith('data:image')) {
              const style = el.getAttribute('style') || '';
              const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
              if (bgMatch && bgMatch[1]) {
                src = bgMatch[1];
              }
            }
            
            if (!src || src.startsWith('data:image')) {
              const picture = el.closest('picture');
              if (picture) {
                const source = picture.querySelector('source[srcset]');
                if (source) {
                  const srcset = source.getAttribute('srcset');
                  if (srcset) {
                    const firstSrc = srcset.split(',')[0].trim().split(' ')[0];
                    if (firstSrc) src = firstSrc;
                  }
                }
              }
            }
            
            if (src && !src.startsWith('data:image') && !seen.has(src)) {
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              if (!src.startsWith('http') && !src.startsWith('//')) {
                src = window.location.origin + '/' + src.replace(/^\.?\//, '');
              }
              seen.add(src);
              images.push(src);
              console.log(`[AlibabaAdapter] 找到图片: ${src.substring(0, 80)}...`);
            }
          }
          
          if (images.length > 0) {
            console.log(`[AlibabaAdapter] ✅ styleAll 命中: ${selector}, 找到 ${images.length} 张`);
            return images;
          }
        } catch (e) {
          console.warn(`[AlibabaAdapter] selector ${selector} 出错:`, e);
        }
      }
      console.log('[AlibabaAdapter] styleAll 未找到任何图片');
      return fallback || [];
    }

    // ============================================================
    // ⭐ 新增：从主图区域提取大图（优先方案）
    // ============================================================

    extractMainImages() {
      console.log('[AlibabaAdapter] 从主图区域提取大图...');
      const images = [];
      const seen = new Set();
      
      const mainImageSelectors = [
        '.main-image-tc-image-magnifier img',
        '.main-image-tc-media-content img',
        '.main-image-tc-main-image img',
        '[data-testid="product-image"] .main-image img',
        '.product-image-main img',
        '.main-image img',
        '.product-detail .main-image img',
        '.image-gallery-main img'
      ];
      
      for (const selector of mainImageSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[AlibabaAdapter] 主图选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || el.getAttribute('src');
            if (src && !seen.has(src) && !src.startsWith('data:image')) {
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              seen.add(src);
              images.push(src);
              console.log(`[AlibabaAdapter] 主图提取: ${src.substring(0, 80)}...`);
            }
          }
          
          if (images.length > 0) {
            console.log(`[AlibabaAdapter] ✅ 从主图区域提取到 ${images.length} 张大图`);
            return images;
          }
        } catch (e) {
          console.warn(`[AlibabaAdapter] 主图选择器 "${selector}" 出错:`, e);
        }
      }
      
      console.log('[AlibabaAdapter] 主图区域未找到图片');
      return images;
    }

    // ============================================================
    // ⭐ 新增：从缩略图列表提取并转换为大图（备用方案）
    // ============================================================

    extractThumbnailsAsLarge() {
      console.log('[AlibabaAdapter] 从缩略图提取并转换为大图...');
      const images = [];
      const seen = new Set();
      
      const thumbnailSelectors = [
        '.main-image-tc-thumbnail',
        '.main-image-tc-thumbnail img',
        '.thumbnail img',
        '.image-thumbnail img',
        '.product-thumbnail img',
        '.thumb-list img',
        '.swiper-slide img'
      ];
      
      for (const selector of thumbnailSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[AlibabaAdapter] 缩略图选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || el.getAttribute('src');
            
            if (!src) {
              const bg = el.style.backgroundImage || el.getAttribute('style') || '';
              const match = bg.match(/url\(["']?(.*?)["']?\)/);
              if (match) src = match[1];
            }
            
            if (src && !seen.has(src) && !src.startsWith('data:image')) {
              src = src.replace(/_\d+x\d+\.jpg/g, '_960x960q80.jpg');
              src = src.replace(/\.jpg_\d+x\d+\.jpg/g, '.jpg_960x960q80.jpg');
              
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              
              seen.add(src);
              images.push(src);
              console.log(`[AlibabaAdapter] 缩略图转换: ${src.substring(0, 80)}...`);
            }
          }
          
          if (images.length > 0) {
            console.log(`[AlibabaAdapter] ✅ 从缩略图转换为大图 ${images.length} 张`);
            return images;
          }
        } catch (e) {
          console.warn(`[AlibabaAdapter] 缩略图选择器 "${selector}" 出错:`, e);
        }
      }
      
      console.log('[AlibabaAdapter] 缩略图未找到');
      return images;
    }

    // ============================================================
    // ⭐ 备用图片提取方法
    // ============================================================

    async extractGalleryImagesBackup() {
      console.log('[AlibabaAdapter] 执行备用图片提取...');
      const images = [];
      const seen = new Set();
      
      const allSelectors = [
        '.main-image-tc-image-magnifier img',
        '.main-image-tc-thumbnail img',
        '.image-gallery-main img',
        '.main-image img',
        '[data-testid="product-image"] img',
        '.product-image img',
        '.gallery img',
        '.images img',
        '.swiper-slide img',
        '.carousel img',
        '.thumbnail img',
        '.product-gallery img',
        '.image-gallery img',
        '.slide img',
        'img[data-testid="main-image"]',
        'img[data-src*=".jpg"]',
        'img[data-original*=".jpg"]',
        'img[src*=".jpg"]',
        'img[src*=".png"]'
      ];
      
      for (const selector of allSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`[AlibabaAdapter] 备用选择器 "${selector}" 找到 ${elements.length} 个元素`);
          
          for (const el of elements) {
            let src = el.src || 
                      el.getAttribute('data-src') || 
                      el.getAttribute('data-original') || 
                      el.getAttribute('data-lazy') ||
                      el.getAttribute('data-image');
            
            if (!src && el.tagName !== 'IMG') {
              const innerImg = el.querySelector('img');
              if (innerImg) {
                src = innerImg.src || innerImg.getAttribute('data-src');
              }
            }
            
            if (src && !src.startsWith('data:image') && !seen.has(src)) {
              src = src.replace(/_\d+x\d+\.jpg/g, '_960x960q80.jpg');
              
              if (src.startsWith('//')) src = 'https:' + src;
              if (src.startsWith('/')) src = window.location.origin + src;
              seen.add(src);
              images.push(src);
            }
          }
          
          if (images.length > 0) {
            console.log(`[AlibabaAdapter] ✅ 备用方法找到 ${images.length} 张图片`);
            return images;
          }
        } catch (e) {
          console.warn(`[AlibabaAdapter] 备用选择器 "${selector}" 出错:`, e);
        }
      }
      
      console.log('[AlibabaAdapter] ⚠️ 备用方法未找到图片');
      return images;
    }

    // ⭐ ============================================================
    // ⭐ 增强的变体提取方法（优先 DOM，回退 detailData）
    // ⭐ ============================================================

    async extractVariants() {
      console.log('[AlibabaAdapter] 执行变体提取...');
      
      let variants = [];
      let skuList = [];
      
      try {
        // ⭐ 1. 优先从 DOM 提取（最可靠，Popup 和悬浮面板都能用）
        console.log('[AlibabaAdapter] 从 DOM 提取变体...');
        const domResult = await this.extractVariantsFromDOM();
        
        if (domResult && domResult.variants && domResult.variants.length > 0) {
          variants = domResult.variants;
          skuList = this.generateSkuCombinations(variants);
          console.log('[AlibabaAdapter] ✅ 从 DOM 提取到变体:', variants.length);
          console.log('[AlibabaAdapter] 生成 SKU 组合:', skuList.length);
          return { variants, sku_list: skuList };
        }
        
        // ⭐ 2. 如果 DOM 没有，尝试从 window.detailData 提取
        const detailData = window.detailData;
        if (detailData && detailData.product && detailData.product.sku) {
          console.log('[AlibabaAdapter] DOM 无数据，从 detailData 获取 SKU 数据');
          const skuData = detailData.product.sku;
          
          const skuAttrs = skuData.skuAttrs || [];
          const skuInfoMap = skuData.skuInfoMap || {};
          
          console.log('[AlibabaAdapter] SKU 属性数:', skuAttrs.length);
          console.log('[AlibabaAdapter] SKU 组合数:', Object.keys(skuInfoMap).length);
          
          // 构建变体属性列表
          variants = skuAttrs.map(attr => ({
            name: attr.name || '选项',
            values: (attr.values || []).map(v => ({
              value: v.name || '',
              image: v.image || '',
              selected: v.selected || false
            }))
          }));
          
          // 从 skuInfoMap 中提取真实的 SKU 组合
          if (Object.keys(skuInfoMap).length > 0) {
            console.log('[AlibabaAdapter] 从 skuInfoMap 提取 SKU 组合...');
            const seen = new Set();
            const skuCombinations = [];
            
            for (const [key, skuInfo] of Object.entries(skuInfoMap)) {
              const parts = key.split(';').filter(p => p && p.includes(':'));
              const combo = {};
              const comboValues = [];
              
              for (const part of parts) {
                const [attrId, valueId] = part.split(':');
                for (const attr of skuAttrs) {
                  if (String(attr.id) === attrId) {
                    const val = (attr.values || []).find(v => String(v.id) === valueId);
                    if (val) {
                      combo[attr.name] = val.name;
                      comboValues.push(val.name);
                    }
                    break;
                  }
                }
              }
              
              // 如果解析失败，尝试使用 skuInfo.attribute
              if (comboValues.length === 0 && skuInfo.attribute) {
                for (const [attrName, attrValue] of Object.entries(skuInfo.attribute || {})) {
                  combo[attrName] = attrValue;
                  comboValues.push(attrValue);
                }
              }
              
              const comboName = comboValues.join(' / ');
              const comboId = comboValues.map(v => v.replace(/\s+/g, '-').replace(/[()（）]/g, '')).join('-');
              
              if (!seen.has(comboName) && comboValues.length > 0) {
                seen.add(comboName);
                skuCombinations.push({
                  id: comboId || `sku-${skuCombinations.length + 1}`,
                  name: comboName,
                  sku_id: skuInfo.id || '',
                  price: skuInfo.price || null,
                  stock: skuInfo.stock || null,
                  sku_code: comboValues.map(v => v.replace(/\s+/g, '_').replace(/[()（）]/g, '')).join('_').toUpperCase(),
                  attributes: combo
                });
              }
            }
            
            if (skuCombinations.length > 0) {
              skuList = skuCombinations;
              console.log('[AlibabaAdapter] ✅ 从 detailData 提取到 SKU 组合:', skuList.length);
            }
          }
        }
        
        // ⭐ 3. 如果 variants 有数据但 skuList 为空，生成 skuList
        if (variants.length > 0 && skuList.length === 0) {
          skuList = this.generateSkuCombinations(variants);
          console.log('[AlibabaAdapter] 从 variants 生成 SKU 组合:', skuList.length);
        }
        
        console.log('[AlibabaAdapter] 最终结果 - 变体组:', variants.length, 'SKU 组合:', skuList.length);
        return { variants, sku_list: skuList };
        
      } catch (e) {
        console.error('[AlibabaAdapter] 提取变体失败:', e);
        // ⭐ 失败时再次尝试 DOM 提取
        try {
          const domResult = await this.extractVariantsFromDOM();
          if (domResult && domResult.variants && domResult.variants.length > 0) {
            return {
              variants: domResult.variants,
              sku_list: this.generateSkuCombinations(domResult.variants)
            };
          }
        } catch (domErr) {
          console.error('[AlibabaAdapter] DOM 提取也失败:', domErr);
        }
        return { variants: [], sku_list: [] };
      }
    }

    // ⭐ ============================================================
    // ⭐ 从 DOM 提取变体（增强版：增加等待和重试）
    // ⭐ ============================================================

    async extractVariantsFromDOM() {
      console.log('[AlibabaAdapter] 从 DOM 提取变体...');
      const variants = [];
      
      try {
        // 查找 SKU 容器
        const skuModule = document.querySelector('[data-testid="sku-info"]') ||
                          document.querySelector('[data-module="module_sku"]') ||
                          document.querySelector('.module_sku') ||
                          document.querySelector('[data-testid="sku-layout"]');
        
        if (!skuModule) {
          console.log('[AlibabaAdapter] 未找到 SKU 容器');
          return { variants: [] };
        }
        
        // ⭐ 查找所有变体分组
        const variantGroups = skuModule.querySelectorAll('[data-testid="sku-list"]');
        console.log(`[AlibabaAdapter] 找到 ${variantGroups.length} 个变体组`);
        
        for (const group of variantGroups) {
          // 获取变体组名称
          const titleEl = group.querySelector('[data-testid="sku-list-title"]');
          if (!titleEl) continue;
          
          const name = titleEl.textContent.trim();
          if (!name) continue;
          
          // ⭐ 获取该组下所有选项
          const values = [];
          
          // 图片类型选项（颜色）
          const imgItems = group.querySelectorAll('[data-testid="sku-list-item"] .double-bordered-box img');
          for (const img of imgItems) {
            const alt = img.getAttribute('alt') || '';
            const src = img.getAttribute('src') || '';
            // 检查是否选中
            const box = img.closest('.double-bordered-box');
            const isSelected = box && box.classList.contains('selected');
            values.push({
              value: alt || '颜色选项',
              image: src.startsWith('//') ? 'https:' + src : src,
              selected: isSelected
            });
          }
          
          // 文本类型选项（尺寸/欧码）
          const textItems = group.querySelectorAll('[data-testid="sku-list-item"] .double-bordered-box span');
          for (const span of textItems) {
            const text = span.textContent.trim();
            if (text) {
              const box = span.closest('.double-bordered-box');
              const isSelected = box && box.classList.contains('selected');
              values.push({
                value: text,
                image: '',
                selected: isSelected
              });
            }
          }
          
          // ⭐ 如果没有通过上述方式提取到，尝试更通用的方式
          if (values.length === 0) {
            const items = group.querySelectorAll('[data-testid="sku-list-item"]');
            for (const item of items) {
              const img = item.querySelector('img');
              const span = item.querySelector('.double-bordered-box span');
              const box = item.querySelector('.double-bordered-box');
              const isSelected = box && box.classList.contains('selected');
              
              if (img) {
                values.push({
                  value: img.getAttribute('alt') || '选项',
                  image: img.getAttribute('src') || '',
                  selected: isSelected
                });
              } else if (span) {
                values.push({
                  value: span.textContent.trim(),
                  image: '',
                  selected: isSelected
                });
              }
            }
          }
          
          if (values.length > 0) {
            variants.push({ name, values });
            console.log(`  - ${name}: ${values.length} 个选项`);
          }
        }
        
        console.log(`[AlibabaAdapter] 从 DOM 提取到 ${variants.length} 个变体组`);
        return { variants };
        
      } catch (e) {
        console.warn('[AlibabaAdapter] DOM 变体提取失败:', e);
        return { variants: [] };
      }
    }

    // ⭐ ============================================================
    // ⭐ 从变体属性生成 SKU 组合（笛卡尔积）- 修复版
    // ⭐ ============================================================

    generateSkuCombinations(variants) {
      if (!variants || variants.length === 0) return [];
      
      // 提取变体名称和值列表，过滤空值
      const variantNames = variants.map(v => v.name);
      const variantValues = variants.map(v => 
        v.values
          .map(item => item.value)
          .filter(val => val && val.trim() !== '')
      );
      
      // 如果有任何一组为空，返回空数组
      if (variantValues.some(arr => arr.length === 0)) {
        console.log('[AlibabaAdapter] 某些变体组为空，跳过生成');
        return [];
      }
      
      // 计算笛卡尔积
      const combinations = this.cartesianProduct(variantValues);
      
      return combinations.map((combination, index) => {
        const nameParts = variantNames.map((name, i) => `${name}: ${combination[i] || '未选择'}`);
        const id = combination.map(v => v ? v.replace(/\s+/g, '-').replace(/[()（）]/g, '') : 'unknown').join('-');
        const skuCode = combination.map(v => v ? v.replace(/\s+/g, '_').replace(/[()（）]/g, '') : 'UNKNOWN').join('_').toUpperCase();
        
        // 构建属性对象
        const attributes = {};
        variantNames.forEach((name, i) => {
          attributes[name] = combination[i] || '未选择';
        });
        
        return {
          id: id || `sku-${index + 1}`,
          name: nameParts.join(' / '),
          sku_code: skuCode || `SKU_${index + 1}`,
          price: null,
          stock: null,
          attributes: attributes
        };
      });
    }

    // ⭐ ============================================================
    // ⭐ 笛卡尔积计算（增加去重）
    // ⭐ ============================================================

    cartesianProduct(arrays) {
      if (!Array.isArray(arrays) || arrays.length === 0) return [];
      // 过滤空数组
      const filtered = arrays.filter(arr => Array.isArray(arr) && arr.length > 0);
      if (filtered.length === 0) return [];
      if (filtered.length === 1) return filtered[0].map(item => [item]);
      
      const result = filtered.reduce((acc, curr) => {
        const res = [];
        for (const a of acc) {
          for (const c of curr) {
            res.push([...a, c]);
          }
        }
        return res;
      }, [[]]);
      
      // 去重（基于组合的字符串表示）
      const seen = new Set();
      return result.filter(combo => {
        const key = combo.join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // ⭐ ============================================================
    // ⭐ 备用描述提取方法
    // ⭐ ============================================================

    async extractDescriptionBackup() {
      console.log('[AlibabaAdapter] 执行备用描述提取...');
      
      // ⭐ 1. 尝试从 iframe 中获取完整描述
      try {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          const src = iframe.src || '';
          if (src.includes('desc') || src.includes('description') || src.includes('detail') || src.includes('rich')) {
            console.log('[AlibabaAdapter] 找到描述 iframe:', src);
            const content = await this.extractIframeContent(iframe);
            if (content && content.length > 100) {
              console.log('[AlibabaAdapter] ✅ 从 iframe 获取到完整描述，长度:', content.length);
              return content;
            }
          }
        }
      } catch (e) {
        console.warn('[AlibabaAdapter] iframe 处理失败:', e);
      }
      
      // ⭐ 2. 尝试从描述容器中获取完整内容
      const descSelectors = [
        '.product-description',
        '.product-description-content',
        '.description',
        '.detail-content',
        '.product-detail-description',
        '.module_product_specification .richtext-detail',
        '#product-description',
        '[data-testid="product-description"]',
        '.product-description-text',
        '.description-content',
        '.product-detail',
        '.product-description-container',
        '.rich-text-detail',
        '.product-specification'
      ];
      
      for (const selector of descSelectors) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            const iframe = el.querySelector('iframe');
            if (iframe) continue;
            
            let content = el.textContent.trim();
            if (content && content.length > 50) {
              content = content.replace(/\s+/g, ' ').trim();
              console.log(`[AlibabaAdapter] ✅ 从选择器 ${selector} 获取到描述，长度: ${content.length}`);
              return content;
            }
          }
        } catch (e) {
          console.warn(`[AlibabaAdapter] 选择器 ${selector} 出错:`, e);
        }
      }
      
      // ⭐ 3. 尝试从 meta 标签获取
      try {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && metaDesc.content && metaDesc.content.length > 50) {
          console.log('[AlibabaAdapter] ✅ 从 meta description 获取到描述，长度:', metaDesc.content.length);
          return metaDesc.content;
        }
      } catch (e) {}
      
      try {
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && ogDesc.content && ogDesc.content.length > 50) {
          console.log('[AlibabaAdapter] ✅ 从 og:description 获取到描述，长度:', ogDesc.content.length);
          return ogDesc.content;
        }
      } catch (e) {}
      
      console.log('[AlibabaAdapter] ⚠️ 备用描述未找到');
      return '';
    }

    extractAttributes(selectors, fallback) {
  const attributes = {};
  console.log('[AlibabaAdapter] 提取属性, selectors:', selectors);

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`[AlibabaAdapter] 检查选择器 "${selector}", 找到 ${elements.length} 个元素`);
      
      for (const el of elements) {
        // ⭐ 方法1: 处理 Alibaba 国际站新结构 (data-testid="module-attribute-row")
        // 结构: div[data-testid="module-attribute-row"] 包含 name 和 value
        if (el.hasAttribute && el.hasAttribute('data-testid') && 
            el.getAttribute('data-testid') === 'module-attribute-row') {
          
          const nameEl = el.querySelector('[data-testid="module-attribute-name"]');
          const valueEl = el.querySelector('[data-testid="module-attribute-value"]');
          
          if (nameEl && valueEl) {
            // 获取属性名（从 title 属性或文本内容）
            let key = nameEl.getAttribute('title') || 
                      nameEl.textContent.trim() ||
                      nameEl.querySelector('[data-attribute-lineclamp="true"]')?.textContent?.trim() ||
                      '';
            
            // 获取属性值（从 title 属性或文本内容）
            let val = valueEl.getAttribute('title') || 
                      valueEl.textContent.trim() ||
                      valueEl.querySelector('[data-attribute-lineclamp="true"]')?.textContent?.trim() ||
                      '';
            
            // 清理值（移除多余的换行和空格）
            val = val.replace(/\s+/g, ' ').trim();
            key = key.replace(/\s+/g, ' ').trim();
            
            if (key && val) {
              attributes[key] = val;
              console.log(`[AlibabaAdapter] 提取属性: ${key} = ${val}`);
            }
          }
          continue;
        }
        
        // ⭐ 方法2: 处理 Alibaba 国际站 grid 结构 (id-grid-cols-[2fr_3fr])
        // 结构: div.id-grid-cols-[2fr_3fr] 包含 name 和 value
        if (el.className && typeof el.className === 'string' && 
            el.className.includes('id-grid-cols-[')) {
          
          // 查找所有行
          const rows = el.querySelectorAll('[data-testid="module-attribute-row"]');
          if (rows.length > 0) {
            for (const row of rows) {
              const nameEl = row.querySelector('[data-testid="module-attribute-name"]');
              const valueEl = row.querySelector('[data-testid="module-attribute-value"]');
              
              if (nameEl && valueEl) {
                let key = nameEl.getAttribute('title') || 
                          nameEl.textContent.trim() ||
                          nameEl.querySelector('[data-attribute-lineclamp="true"]')?.textContent?.trim() ||
                          '';
                
                let val = valueEl.getAttribute('title') || 
                          valueEl.textContent.trim() ||
                          valueEl.querySelector('[data-attribute-lineclamp="true"]')?.textContent?.trim() ||
                          '';
                
                val = val.replace(/\s+/g, ' ').trim();
                key = key.replace(/\s+/g, ' ').trim();
                
                if (key && val) {
                  attributes[key] = val;
                  console.log(`[AlibabaAdapter] 从 grid 提取属性: ${key} = ${val}`);
                }
              }
            }
            if (Object.keys(attributes).length > 0) {
              return attributes;
            }
          }
        }
        
        // ⭐ 方法3: 处理传统表格结构 (th/td 或 label/value)
        // 处理 th/td 结构
        const label = el.querySelector('th, .label, .attr-label, [data-testid="attribute-label"]');
        const value = el.querySelector('td, .value, .attr-value, [data-testid="attribute-value"], .field-value');
        
        if (label && value) {
          const key = label.textContent.trim();
          const val = value.textContent.trim();
          if (key && val) {
            attributes[key] = val;
            console.log(`[AlibabaAdapter] 从表格提取属性: ${key} = ${val}`);
          }
        }
      }
      
      if (Object.keys(attributes).length > 0) {
        console.log(`[AlibabaAdapter] ✅ attributes 命中: ${selector}, 找到 ${Object.keys(attributes).length} 个`);
        return attributes;
      }
    } catch (e) {
      console.warn(`[AlibabaAdapter] selector ${selector} 出错:`, e);
    }
  }
  
  console.log('[AlibabaAdapter] 未提取到属性，返回空对象');
  return fallback || {};
}

    getDefaultData() {
      return {
        platform: 'alibaba',
        url: window.location.href,
        title: '未找到标题',
        price: '未找到价格',
        currency: 'USD',
        moq: '1',
        main_image: '',
        gallery_images: [],
        description: '',
        attributes: {},
        supplier: '',
        location: '',
        sku_list: [],
        variants: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  window.__adapters.AlibabaAdapter = AlibabaAdapter;
  console.log('[AlibabaAdapter] 已挂载');

})(window, document);