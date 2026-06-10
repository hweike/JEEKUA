

// ========== 内置转换函数 ==========
const transforms = {
  text: (el) => el?.innerText?.trim() || '',
  html: (el) => el?.innerHTML || '',
  attr: (el, attr) => el?.getAttribute(attr) || '',
  extractFirstNumber: (str) => {
    const match = str?.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  },
  extractNumber: (str) => parseFloat(str?.replace(/[^0-9.-]/g, '')) || 0,
  parseInt: (str) => parseInt(str, 10) || 0,
  // 价格区间提取：返回 { min, max } 或单个数字
  extractPriceRange: (str) => {
    const numbers = str?.match(/\d+(?:\.\d+)?/g) || [];
    if (numbers.length === 0) return { min: 0, max: 0 };
    if (numbers.length === 1) return { min: parseFloat(numbers[0]), max: parseFloat(numbers[0]) };
    const floats = numbers.map(parseFloat);
    return { min: Math.min(...floats), max: Math.max(...floats) };
  },
};

// ========== 工具函数：等待元素出现 ==========
function waitForElement(selector, timeout = 5000, interval = 200) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      resolve(document.querySelector(selector));
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// ========== 支持 Shadow DOM 的查询 ==========
function querySelectorAllInShadow(root, selector, useShadow = false) {
  if (!useShadow) return root.querySelectorAll(selector);
  // 递归查找 shadow root
  let results = [];
  const traverse = (node) => {
    if (node.shadowRoot) {
      traverse(node.shadowRoot);
      node.shadowRoot.querySelectorAll(selector).forEach(el => results.push(el));
    }
    node.querySelectorAll(selector).forEach(el => results.push(el));
    node.querySelectorAll('*').forEach(child => {
      if (child.shadowRoot) traverse(child.shadowRoot);
    });
  };
  traverse(root);
  return results;
}

// ========== 滚动页面（帮助动态加载内容） ==========
async function scrollToLoad(options = { maxScrolls: 3, interval: 500 }) {
  const { maxScrolls, interval } = options;
  let previousHeight = document.body.scrollHeight;
  for (let i = 0; i < maxScrolls; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, interval));
    const newHeight = document.body.scrollHeight;
    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
  }
  window.scrollTo(0, 0); // 回滚到顶部
}

// ========== 提取引擎（增强版） ==========
async function extractByRule(rule) {
  const result = { platform: rule.platform, source_url: location.href };
  const extractors = rule.extractors || {};

  // 全局配置：是否等待元素、是否滚动加载等（可放在 rule.global）
  const globalConfig = rule.global || {};
  const defaultWaitTimeout = globalConfig.waitTimeout || 3000;
  const defaultScrollBeforeExtract = globalConfig.scrollToLoad || false;

  // 如果需要滚动加载，先执行（适合动态分页）
  if (defaultScrollBeforeExtract) {
    await scrollToLoad(globalConfig.scrollOptions);
  }

  for (const [key, config] of Object.entries(extractors)) {
    const {
      selector, method, attribute, transform, index, skipFirst,
      pattern, key: kvKey, fields, waitTimeout = defaultWaitTimeout,
      useShadow = false, fallback, scrollToLoad: fieldScroll = false
    } = config;

    // 特殊处理：从 URL 中提取
    if (selector === 'url') {
      if (method === 'regex' && pattern) {
        const match = location.href.match(new RegExp(pattern));
        result[key] = match ? match[1] : '';
      }
      continue;
    }

    // 处理 meta 标签
    if (method === 'meta') {
      const meta = document.querySelector(`meta[${attribute || 'name'}="${selector}"]`);
      result[key] = meta ? meta.getAttribute('content') : '';
      continue;
    }

    // 等待元素出现（针对动态加载）
    let elements = [];
    const selectors = Array.isArray(selector) ? selector : [selector];
    for (const sel of selectors) {
      if (waitTimeout > 0) {
        const el = await waitForElement(sel, waitTimeout);
        if (el) elements = [el];
        else continue;
      } else {
        elements = querySelectorAllInShadow(document, sel, useShadow);
        if (elements.length) break;
      }
      if (elements.length) break;
    }

    if (!elements.length) {
      // 处理 fallback
      if (fallback) {
        if (typeof fallback === 'function') result[key] = fallback();
        else if (fallback === 'document.title') result[key] = document.title;
        else if (typeof fallback === 'string') result[key] = fallback;
        else result[key] = null;
      } else {
        console.warn(`字段 ${key} 未找到元素，选择器: ${selectors.join(', ')}`);
        result[key] = null;
      }
      continue;
    }

    // 处理属性数组（如图片列表）
    if (method === 'attr' && (skipFirst || index !== undefined)) {
      const items = Array.from(elements).map(el => transforms.attr(el, attribute));
      if (skipFirst) result[key] = items.slice(1);
      else if (index !== undefined) result[key] = items[index] || '';
      else result[key] = items;
      continue;
    }

    // 处理键值对（单一属性，如品牌）
    if (method === 'keyValue' && kvKey) {
      let found = false;
      for (let el of elements) {
        const keyEl = el.querySelector('.attr-name, .key');
        const valEl = el.querySelector('.attr-value, .value');
        if (keyEl?.innerText?.includes(kvKey)) {
          result[key] = valEl?.innerText?.trim() || '';
          found = true;
          break;
        }
      }
      if (!found) result[key] = '';
      continue;
    }

    // 处理所有键值对（规格参数）
    if (method === 'keyValuePairs') {
      const pairs = {};
      for (let el of elements) {
        const keyEl = el.querySelector('.attr-name, .key');
        const valEl = el.querySelector('.attr-value, .value');
        if (keyEl && valEl) {
          pairs[keyEl.innerText.trim()] = valEl.innerText.trim();
        }
      }
      result[key] = pairs;
      continue;
    }

    // 处理表格行（变种）
    if (method === 'tableRow' && fields) {
      const rows = Array.from(elements);
      const items = rows.map(row => {
        const item = {};
        for (const [fieldName, fieldConfig] of Object.entries(fields)) {
          const { selector: subSel, method: subMethod, attribute: subAttr, transform: subTransform, asArray, useShadow: subShadow = false } = fieldConfig;
          let subElements = querySelectorAllInShadow(row, subSel, subShadow);
          if (!subElements.length) {
            item[fieldName] = null;
            continue;
          }
          if (asArray) {
            item[fieldName] = Array.from(subElements).map(el => transforms.text(el));
          } else {
            let value = subMethod === 'attr' ? transforms.attr(subElements[0], subAttr) : transforms.text(subElements[0]);
            if (subTransform && transforms[subTransform]) value = transforms[subTransform](value);
            item[fieldName] = value;
          }
        }
        return item;
      });
      result[key] = items;
      continue;
    }

    // 默认：获取第一个元素的文本或属性
    const firstEl = elements[0];
    let value = method === 'attr' ? transforms.attr(firstEl, attribute) : transforms.text(firstEl);
    if (transform && transforms[transform]) value = transforms[transform](value);
    result[key] = value;
  }
  return result;
}

// ========== 规则加载（支持本地规则文件 + 远程缓存） ==========
function getRuleFileForHost(hostname) {
  if (hostname.includes('1688.com')) return '1688.json';
  if (hostname.includes('alibaba.com')) return 'alibaba.json';
  if (hostname.includes('jd.com')) return 'jd.json';
  // 可扩展其他平台
  return null;
}

async function loadRule(ruleFile) {
  // 优先从本地存储获取缓存的规则（支持热更新）
  const cacheKey = `rule_${ruleFile}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) {
    console.log('使用缓存的规则:', ruleFile);
    return cached[cacheKey];
  }

  // 从扩展内置文件加载
  try {
    const url = chrome.runtime.getURL(`rules/${ruleFile}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rule = await response.json();
    // 缓存规则
    await chrome.storage.local.set({ [cacheKey]: rule });
    console.log('规则加载成功:', ruleFile);
    return rule;
  } catch (err) {
    console.error('加载规则失败:', ruleFile, err);
    return null;
  }
}

// ========== 更新规则（从后端拉取，可选） ==========
async function updateRulesFromBackend() {
  try {
    const API_BASE = 'http://localhost:3000'; // 替换为实际后端地址
    const response = await fetch(`${API_BASE}/api/crawler/rules`);
    if (!response.ok) return;
    const allRules = await response.json();
    // allRules 结构: { "1688.json": {...}, "alibaba.json": {...} }
    for (const [file, rule] of Object.entries(allRules)) {
      await chrome.storage.local.set({ [`rule_${file}`]: rule });
    }
    console.log('规则已从后端更新');
  } catch (err) {
    console.warn('更新规则失败', err);
  }
}

// ========== 主流程 ==========
let extractedData = null;
let extractionPromise = null;

(async () => {
  // 临时：直接返回模拟数据，测试 popup 到后端的链路
  extractedData = {
    title: "测试商品标题",
    source_url: location.href,
    platform: "1688",
    price: 99.99,
    main_image_url: "https://example.com/test.jpg"
  };
  console.log('✅ 使用模拟数据', extractedData);
})();

  // 可选：每次页面加载时尝试从后端更新规则（非必须，可注释）
  // updateRulesFromBackend().catch(console.warn);

  extractionPromise = loadRule(ruleFile).then(rule => {
    if (rule) return extractByRule(rule);
    return null;
  });
  extractedData = await extractionPromise;
  if (extractedData) {
    console.log('✅ 采集数据已就绪', extractedData);
  } else {
    console.warn('⚠️ 数据提取失败，请检查规则或页面结构');
  }
})();

// ========== 监听 popup 消息 ==========
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extract') {
    if (extractedData) {
      sendResponse(extractedData);
    } else if (extractionPromise) {
      extractionPromise.then(data => sendResponse(data));
    } else {
      sendResponse({ error: '数据未就绪，请刷新页面后重试' });
    }
    return true; // 异步响应
  }
});