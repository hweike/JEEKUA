// lib/productCrawl/services/config.service.ts
import { supabase } from '@/lib/supabase/client';
import type { CrawlerConfig, CrawlerPlatformConfig } from '@/lib/productCrawl/types';

const DEFAULT_SITE_ID = '000001';

// ============================================================
// 默认配置生成函数（动态版本号）
// 🔥 每次调用生成新的时间戳版本号，确保唯一性
// ============================================================
function getDefaultConfig(): CrawlerConfig {
  return {
    version: `v${Date.now()}`,
    updated_at: new Date().toISOString(),
    platforms: {
      alibaba: {
        name: '阿里巴巴国际站',
        domain_patterns: ['*.alibaba.com'],
        login_required: true,
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
               // 🔥 新增：产品规格描述
                '.module_product_specification .richtext-detail',
                '.module_product_specification #J-rich-text-description',
                '.module_product_specification',
                '.rich-text-description',
                // 原有选择器
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
        },
        field_mapping: {
          supplier: 'brand'
        }
      },
      '1688': {
        name: '1688',
        domain_patterns: ['*.1688.com'],
        login_required: true,
        fields: {
          title: {
            selectors: ['.d-title', '.offer-title', '.product-title'],
            type: 'text',
            fallback: 'document.title'
          },
          price: {
            selectors: ['.price-now', '.price', '.offer-price'],
            type: 'text',
            fallback: ''
          },
          currency: {
            selectors: ['.price-now'],
            type: 'currency',
            fallback: 'CNY'
          },
          moq: {
            selectors: ['.moq', '.min-order', '.order-number'],
            type: 'text',
            fallback: '1'
          },
          main_image: {
            selectors: ['.main-image img', '.product-image img', '.offer-image img'],
            type: 'attr',
            attribute: 'src',
            fallback: ''
          },
          gallery_images: {
            selectors: ['.gallery img', '.thumbnails img'],
            type: 'attrAll',
            attribute: 'src',
            fallback: []
          },
          description: {
            selectors: [
              '.detail-content',
              '.description',
              '.product-desc',
              '.offer-detail'
            ],
            type: 'html',
            fallback: ''
          },
          attributes: {
            selectors: ['.attributes-table tr', '.specification tr'],
            type: 'attributes',
            fallback: {}
          },
          supplier: {
            selectors: ['.company-name', '.seller-name', '.shop-name'],
            type: 'text',
            fallback: ''
          },
          location: {
            selectors: ['.location', '.province', '.company-address'],
            type: 'text',
            fallback: ''
          }
        }
      }
    }
  };
}

// ============================================================
// 核心服务函数
// ============================================================

export async function getCrawlerConfig(): Promise<CrawlerConfig> {
  // 1. 查询数据库
  const { data, error } = await supabase
    .from('crawler_configs')
    .select('config, version, updated_at')
    .eq('site_id', DEFAULT_SITE_ID)
    .maybeSingle();

  // 2. 如果有数据，返回
  if (data?.config) {
    return {
      ...data.config,
      version: data.version || getDefaultConfig().version,
      updated_at: data.updated_at || new Date().toISOString()
    };
  }

  // 3. 数据库无配置，初始化默认配置
  console.log('📝 数据库无配置，正在初始化默认配置...');
  await initCrawlerConfig();
  
  // 4. 重新查询数据库，返回最新写入的配置
  console.log('📝 重新查询数据库配置...');
  const { data: newData, error: newError } = await supabase
    .from('crawler_configs')
    .select('config, version, updated_at')
    .eq('site_id', DEFAULT_SITE_ID)
    .maybeSingle();

  if (newError || !newData?.config) {
    console.error('❌ 初始化后查询配置失败:', newError);
    return getDefaultConfig();
  }

  console.log('✅ 配置初始化成功，版本:', newData.version);
  return {
    ...newData.config,
    version: newData.version || getDefaultConfig().version,
    updated_at: newData.updated_at || new Date().toISOString()
  };
}

export async function initCrawlerConfig(): Promise<void> {
  const config = getDefaultConfig();
  
  const { error } = await supabase
    .from('crawler_configs')
    .upsert({
      site_id: DEFAULT_SITE_ID,
      config: config,
      version: config.version,
      updated_at: new Date().toISOString()
    }, { onConflict: 'site_id' });

  if (error) {
    console.error('初始化爬虫配置失败:', error);
    throw new Error(`初始化配置失败: ${error.message}`);
  }
}

export async function updateCrawlerConfig(
  config: CrawlerConfig,
  operator?: string
): Promise<void> {
  const now = new Date().toISOString();
  const newVersion = `v${Date.now()}`;

  const { error } = await supabase
    .from('crawler_configs')
    .upsert({
      site_id: DEFAULT_SITE_ID,
      config: { ...config, version: newVersion, updated_at: now },
      version: newVersion,
      updated_at: now,
      updated_by: operator || 'system'
    }, { onConflict: 'site_id' });

  if (error) {
    console.error('更新爬虫配置失败:', error);
    throw new Error(`更新配置失败: ${error.message}`);
  }
}

export async function getConfigVersion(): Promise<string> {
  const { data, error } = await supabase
    .from('crawler_configs')
    .select('version')
    .eq('site_id', DEFAULT_SITE_ID)
    .maybeSingle();

  if (error || !data?.version) {
    return `v${Date.now()}`;
  }

  return data.version;
}

export async function getPlatformConfig(platform: string): Promise<CrawlerPlatformConfig | null> {
  const config = await getCrawlerConfig();
  return config.platforms[platform] || null;
}