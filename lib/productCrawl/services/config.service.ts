// lib/productCrawl/services/config.service.ts
import sql from '@/lib/db/admin';
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
  let data: { config: any; version: string | null; updated_at: string | null } | undefined;
  try {
    const rows = await sql<{ config: any; version: string | null; updated_at: string | null }[]>`
      SELECT config, version, updated_at FROM public.crawler_configs
      WHERE site_id = ${DEFAULT_SITE_ID}
      LIMIT 1
    `;
    data = rows[0];
  } catch (error: any) {
    console.error('查询爬虫配置失败:', error);
  }

  // 2. 如果有数据，返回
  if (data?.config) {
    return {
      ...data.config,
      version: data.version || getDefaultConfig().version,
      updated_at: data.updated_at || new Date().toISOString(),
    };
  }

  // 3. 初始化默认配置
  console.log('📝 数据库无配置，正在初始化默认配置...');
  await initCrawlerConfig();

  // 4. 重新查询
  console.log('📝 重新查询数据库配置...');
  try {
    const rows = await sql<{ config: any; version: string | null; updated_at: string | null }[]>`
      SELECT config, version, updated_at FROM public.crawler_configs
      WHERE site_id = ${DEFAULT_SITE_ID}
      LIMIT 1
    `;
    const newData = rows[0];
    if (!newData?.config) {
      console.error('❌ 初始化后查询配置失败');
      return getDefaultConfig();
    }
    console.log('✅ 配置初始化成功，版本:', newData.version);
    return {
      ...newData.config,
      version: newData.version || getDefaultConfig().version,
      updated_at: newData.updated_at || new Date().toISOString(),
    };
  } catch (newError: any) {
    console.error('❌ 初始化后查询配置失败:', newError);
    return getDefaultConfig();
  }
}

export async function initCrawlerConfig(): Promise<void> {
  const config = getDefaultConfig();

  try {
    await sql`
      INSERT INTO public.crawler_configs (site_id, config, version, updated_at)
      VALUES (${DEFAULT_SITE_ID}, ${sql.json(config)}, ${config.version}, ${new Date().toISOString()})
      ON CONFLICT (site_id)
      DO UPDATE SET
        config = EXCLUDED.config,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (error: any) {
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
  const newConfig = { ...config, version: newVersion, updated_at: now };

  try {
    await sql`
      INSERT INTO public.crawler_configs (site_id, config, version, updated_at, updated_by)
      VALUES (${DEFAULT_SITE_ID}, ${sql.json(newConfig)}, ${newVersion}, ${now}, ${operator || 'system'})
      ON CONFLICT (site_id)
      DO UPDATE SET
        config = EXCLUDED.config,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    `;
  } catch (error: any) {
    console.error('更新爬虫配置失败:', error);
    throw new Error(`更新配置失败: ${error.message}`);
  }
}

export async function getConfigVersion(): Promise<string> {
  try {
    const rows = await sql<{ version: string | null }[]>`
      SELECT version FROM public.crawler_configs
      WHERE site_id = ${DEFAULT_SITE_ID}
      LIMIT 1
    `;
    return rows[0]?.version || `v${Date.now()}`;
  } catch {
    return `v${Date.now()}`;
  }
}

export async function getPlatformConfig(platform: string): Promise<CrawlerPlatformConfig | null> {
  const config = await getCrawlerConfig();
  return config.platforms[platform] || null;
}