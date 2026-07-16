// =====================================================
// SEO 数据管理服务
// 职责：管理 page_seo_data 表的 CRUD，以及分析/AI生成的编排
// 调用方式：import { seoService } from '@/lib/seo/services'
// =====================================================

import { supabase } from '@/lib/supabase/client';
import type { PageSeoData, GenerationStatus, GenerateSeoInput } from '../types';
import { GENERATION_STATUS } from '../constants';
import { strategiesService } from './strategies.service';
import { AnalyzerService } from './analyzer.service';
import type { AnalyzedContent } from '../types';
import { syncService } from './sync.service';

const DEFAULT_SITE_ID = '000001';

type PageRow = {
  type: string;
  title: string;
  content_summary?: string;
};

export class SeoService {
  private analyzer: AnalyzerService;

  constructor() {
    this.analyzer = new AnalyzerService({
      maxSummaryLength: 200,
      maxKeywords: 10,
    });
  }

  /**
   * 将数据库行转换为 PageSeoData
   */
  private mapToPageSeoData(row: any): PageSeoData {
    return {
      id: row.id,
      site_id: row.site_id,
      page_id: row.page_id,
      locale: row.locale,
      page_type: row.page_type,
      analyzed_keywords: row.analyzed_keywords,
      analyzed_summary: row.analyzed_summary,
      seo_title: row.seo_title,
      seo_description: row.seo_description,
      seo_keywords: row.seo_keywords,
      generation_status: row.generation_status,
      source_locale: row.source_locale,
      source_analysis_ref: row.source_analysis_ref,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * 获取或创建页面的 SEO 工作区数据
   */
  async getPageSeoData(
    siteId: string,
    pageId: string,
    locale: string
  ): Promise<PageSeoData> {
    const { data, error } = await (supabase
      .from('page_seo_data') as any)
      .select('*')
      .eq('site_id', siteId)
      .eq('page_id', pageId)
      .eq('locale', locale)
      .maybeSingle();

    if (error) throw new Error(`查询 page_seo_data 失败: ${error.message}`);
    if (data) return this.mapToPageSeoData(data);

    const { data: page, error: pageError } = await (supabase
      .from('pages') as any)
      .select('type, title')
      .eq('site_id', siteId)
      .eq('id', pageId)
      .eq('locale', locale)
      .maybeSingle();

    if (pageError || !page) {
      console.warn(`页面不存在或获取失败: ${pageId}`);
      return {
        site_id: siteId,
        page_id: pageId,
        locale: locale,
        page_type: 'unknown',
        generation_status: 'pending',
        analyzed_keywords: [],
        analyzed_summary: '',
        seo_title: '',
        seo_description: '',
        seo_keywords: [],
      };
    }

    const pageType = page.type || 'unknown';
    const newRecord = {
      site_id: siteId,
      page_id: pageId,
      locale: locale,
      page_type: pageType,
      generation_status: GENERATION_STATUS.PENDING,
    };

    const { data: inserted, error: insertError } = await (supabase
      .from('page_seo_data') as any)
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      console.warn(`插入 page_seo_data 失败: ${insertError.message}`);
      return {
        site_id: siteId,
        page_id: pageId,
        locale: locale,
        page_type: pageType,
        generation_status: 'pending',
        analyzed_keywords: [],
        analyzed_summary: '',
        seo_title: '',
        seo_description: '',
        seo_keywords: [],
      };
    }

    return this.mapToPageSeoData(inserted);
  }

  /**
   * 更新分析结果（状态 -> analyzed）
   */
  async updateAnalyzedData(
    siteId: string,
    pageId: string,
    locale: string,
    updates: {
      analyzed_keywords?: string[];
      analyzed_summary?: string;
    }
  ): Promise<PageSeoData> {
    const maxRetries = 3;
    let lastError: any;

    const { data: page, error: pageError } = await (supabase
      .from('pages') as any)
      .select('type')
      .eq('site_id', siteId)
      .eq('id', pageId)
      .eq('locale', locale)
      .maybeSingle();

    const pageType = page?.type || 'unknown';

    const payload = {
      site_id: siteId,
      page_id: pageId,
      locale: locale,
      page_type: pageType,
      ...updates,
      generation_status: GENERATION_STATUS.ANALYZED,
      updated_at: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await (supabase
          .from('page_seo_data') as any)
          .upsert(payload, {
            onConflict: 'site_id, page_id, locale',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (error) throw error;
        return this.mapToPageSeoData(data);
      } catch (err: any) {
        lastError = err;
        console.warn(`updateAnalyzedData 尝试 ${attempt}/${maxRetries} 失败:`, err.message);
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error('updateAnalyzedData 所有重试均失败:', lastError);
    throw new Error(`更新分析数据失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 更新 AI 生成的草稿（状态 -> ai_generated）
   */
  async updateDraft(
    siteId: string,
    pageId: string,
    locale: string,
    draft: {
      seo_title?: string;
      seo_description?: string;
      seo_keywords?: string[];
    }
  ): Promise<PageSeoData> {
    const payload = {
      ...draft,
      generation_status: GENERATION_STATUS.AI_GENERATED,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase
      .from('page_seo_data') as any)
      .update(payload)
      .eq('site_id', siteId)
      .eq('page_id', pageId)
      .eq('locale', locale)
      .select()
      .single();

    if (error) throw new Error(`更新草稿失败: ${error.message}`);
    return this.mapToPageSeoData(data);
  }

  /**
 * 确认发布：将草稿写入 pages 表（状态 -> approved）
 * ✅ 同时更新 page_seo_data 的 seo 字段，保持草稿与正式数据一致
 * 并同步到业务表和 MD/JSON 文件
 */
async approveSeo(
  siteId: string,
  pageId: string,
  locale: string
): Promise<void> {
  // 1. 获取草稿
  const { data: seoData, error: fetchError } = await (supabase
    .from('page_seo_data') as any)
    .select('seo_title, seo_description, seo_keywords')
    .eq('site_id', siteId)
    .eq('page_id', pageId)
    .eq('locale', locale)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`获取草稿失败: ${fetchError.message}`);
  }

  if (!seoData) {
    console.warn(`页面 ${pageId} (${locale}) 没有草稿数据，跳过发布`);
    return;
  }

  // 2. 将 seo_keywords 数组转换为逗号分隔的字符串（pages 表是 TEXT 类型）
  const keywordsText = Array.isArray(seoData.seo_keywords)
    ? seoData.seo_keywords.filter(Boolean).join(', ')
    : seoData.seo_keywords || '';

  // 3. 更新 pages 表（正式数据）
  const { error: updateError } = await (supabase
    .from('pages') as any)
    .update({
      seo_title: seoData.seo_title,
      seo_description: seoData.seo_description,
      seo_keywords: keywordsText,
      updatedAt: new Date().toISOString(),
    })
    .eq('site_id', siteId)
    .eq('id', pageId)
    .eq('locale', locale);

  if (updateError) throw new Error(`更新 pages 表失败: ${updateError.message}`);

  // 4. ✅ 同时更新 page_seo_data 的 seo 字段（保持草稿与正式数据一致）
  //    状态变为 approved
  const { error: statusError } = await (supabase
    .from('page_seo_data') as any)
    .update({
      seo_title: seoData.seo_title,
      seo_description: seoData.seo_description,
      seo_keywords: seoData.seo_keywords,
      generation_status: GENERATION_STATUS.APPROVED,
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', siteId)
    .eq('page_id', pageId)
    .eq('locale', locale);

  if (statusError) throw new Error(`更新状态失败: ${statusError.message}`);

  // 5. 同步到业务表和 MD/JSON 文件（内部捕获异常）
  try {
    await syncService.syncAfterApprove(siteId, pageId, locale);
  } catch (syncError) {
    console.error(`同步失败 (${pageId}, ${locale}):`, syncError);
  }
}

  /**
   * 分析页面内容并更新 page_seo_data
   */
  async analyzeAndUpdate(
    siteId: string,
    pageId: string,
    locale: string,
    content: string
  ): Promise<AnalyzedContent> {
    await this.getPageSeoData(siteId, pageId, locale);
    const result = this.analyzer.analyze(content);
    await this.updateAnalyzedData(siteId, pageId, locale, {
      analyzed_keywords: result.keywords,
      analyzed_summary: result.summary,
    });
    return result;
  }

  /**
   * 从 products 表获取产品基本信息（自身数据）
   */
  private async getProductBasicInfo(
    siteId: string,
    fullProductId: string,
    locale: string
  ): Promise<{
    product: any;
    isVariant: boolean;
    parentProductId: string | null;
    actualProductId: string;
  }> {
    let product = null;
    let isVariant = false;
    let parentProductId: string | null = null;
    let actualProductId = fullProductId;

    if (fullProductId.includes('/')) {
      const parts = fullProductId.split('/');
      const variantId = parts[parts.length - 1];
      actualProductId = variantId;

      const { data, error } = await (supabase
        .from('products') as any)
        .select('*')
        .eq('site_id', siteId)
        .eq('productId', variantId)
        .eq('locale', locale)
        .maybeSingle();

      if (!error && data) {
        product = data;
        isVariant = true;
        parentProductId = data.parent_product_id || parts[0];
      } else {
        const parentId = parts[0];
        const { data: parentData, error: parentError } = await (supabase
          .from('products') as any)
          .select('*')
          .eq('site_id', siteId)
          .eq('productId', parentId)
          .eq('locale', locale)
          .maybeSingle();

        if (!parentError && parentData) {
          product = parentData;
          isVariant = true;
          parentProductId = parentId;
        }
      }
    } else {
      const { data, error } = await (supabase
        .from('products') as any)
        .select('*')
        .eq('site_id', siteId)
        .eq('productId', fullProductId)
        .eq('locale', locale)
        .maybeSingle();

      if (!error && data) {
        product = data;
        actualProductId = fullProductId;
      }
    }

    if (!product) {
      const { data: page } = await (supabase
        .from('pages') as any)
        .select('title')
        .eq('site_id', siteId)
        .eq('id', `product:${fullProductId}`)
        .eq('locale', locale)
        .maybeSingle();

      if (page) {
        product = { product_name: page.title };
      }
    }

    return { product, isVariant, parentProductId, actualProductId };
  }

  /**
   * 构建产品分析内容
   */
  private async buildProductAnalysisContent(
    siteId: string,
    pageId: string,
    locale: string,
    pageContentSummary: string | null,
    pageTitle: string
  ): Promise<{ content: string; keywords: string[] }> {
    const fullProductId = pageId.replace('product:', '');
    const { product, isVariant, parentProductId, actualProductId } =
      await this.getProductBasicInfo(siteId, fullProductId, locale);

    let brand = product?.brand || '';
    if (!brand) {
      try {
        const siteSettings = await strategiesService.getSiteSettings(siteId);
        brand = siteSettings.companyName || siteSettings.siteName || '';
      } catch (e) {
        console.warn('获取站点品牌失败:', e);
      }
    }

    let productKeywords: string[] = [];
    if (product?.attributes) {
      try {
        const attrs = typeof product.attributes === 'string'
          ? JSON.parse(product.attributes)
          : product.attributes;
        if (typeof attrs === 'object' && attrs !== null) {
          productKeywords = this.analyzer.extractProductKeywords(attrs);
        }
      } catch (e) {
        console.warn('解析 attributes 失败:', e);
      }
    }

    if (brand && !productKeywords.includes(brand)) {
      productKeywords.unshift(brand);
    }
    if (product?.sku && !productKeywords.includes(product.sku)) {
      productKeywords.unshift(product.sku);
    }

    const productName = product?.product_name || pageTitle || '';
    if (productName) {
      const nameParts = productName.split(/[\s\-]+/).filter(p => p.length > 2);
      nameParts.forEach(p => {
        if (!productKeywords.includes(p)) {
          productKeywords.push(p);
        }
      });
    }

    productKeywords = productKeywords.slice(0, 15);

    const lines: string[] = [];
    lines.push('【产品信息】');
    const name = product?.product_name || pageTitle || '未命名产品';
    lines.push(`产品名称: ${name}`);
    if (brand) lines.push(`品牌: ${brand}`);
    lines.push(`产品ID: ${actualProductId}`);
    if (product?.sku) lines.push(`型号/SKU: ${product.sku}`);

    const availabilityMap: Record<string, string> = {
      in_stock: '有货',
      out_of_stock: '缺货',
      preorder: '可预订',
    };
    if (product?.availability) {
      const status = availabilityMap[product.availability] || product.availability;
      lines.push(`库存状态: ${status}`);
    }
    if (product?.min_order_quantity !== undefined && product?.min_order_quantity !== null) {
      lines.push(`最小起订量: ${product.min_order_quantity}`);
    }

    if (product?.attributes) {
      try {
        const attrs = typeof product.attributes === 'string'
          ? JSON.parse(product.attributes)
          : product.attributes;
        if (typeof attrs === 'object' && attrs !== null) {
          const entries = Object.entries(attrs).filter(
            ([_, v]) => v !== null && v !== undefined && v !== ''
          );
          if (entries.length > 0) {
            lines.push('规格参数:');
            for (const [key, value] of entries) {
              lines.push(`  - ${key}: ${value}`);
            }
          }
        }
      } catch (e) {
        console.warn('解析 attributes 失败:', e);
      }
    }

    if (pageContentSummary && pageContentSummary.trim()) {
      lines.push('');
      lines.push('【产品简述】');
      lines.push(pageContentSummary.trim());
    }

    let descTargetProductId: string | null = null;
    if (isVariant && parentProductId) {
      descTargetProductId = `product:${parentProductId}`;
      lines.push('');
      lines.push(`(此产品是父产品 "${parentProductId}" 的变体，以下描述信息继承自父产品)`);
    } else {
      descTargetProductId = pageId;
    }

    const { data: contentData, error: contentError } = await (supabase
      .from('page_contents') as any)
      .select('full_content')
      .eq('page_id', descTargetProductId)
      .eq('site_id', siteId)
      .eq('locale', locale)
      .maybeSingle();

    let fullContent = '';
    if (!contentError && contentData?.full_content) {
      fullContent = contentData.full_content;
    }
    if (fullContent) {
      lines.push('');
      lines.push('【产品描述】');
      lines.push(fullContent);
    }

    return {
      content: lines.join('\n'),
      keywords: productKeywords,
    };
  }

  /**
   * 从数据库获取页面内容并自动分析
   */
  async analyzePage(
    siteId: string,
    pageId: string,
    locale: string
  ): Promise<AnalyzedContent> {
    const { data: page, error } = await (supabase
      .from('pages') as any)
      .select('type, title, content_summary')
      .eq('site_id', siteId)
      .eq('id', pageId)
      .eq('locale', locale)
      .maybeSingle();

    if (error) throw new Error(`获取页面信息失败: ${error.message}`);
    if (!page) {
      return { keywords: [], summary: '', wordCount: 0 };
    }

    let content = '';
    let extractedKeywords: string[] | undefined = undefined;

    if (page.type === 'product') {
      const result = await this.buildProductAnalysisContent(
        siteId,
        pageId,
        locale,
        page.content_summary,
        page.title
      );
      content = result.content;
      extractedKeywords = result.keywords;
    } else {
      const contentTypes = ['blogPost', 'doc', 'page', 'video'];
      if (contentTypes.includes(page.type)) {
        const { data: contentData, error: contentError } = await (supabase
          .from('page_contents') as any)
          .select('full_content')
          .eq('page_id', pageId)
          .eq('site_id', siteId)
          .eq('locale', locale)
          .maybeSingle();

        if (!contentError && contentData?.full_content) {
          content = contentData.full_content;
        }
        if (!content && page.content_summary) {
          content = page.content_summary;
        }
        if (!content) {
          content = page.title || '';
        }
      } else {
        content = page.title || '';
      }
    }

    const analysisResult = await this.analyzeAndUpdate(siteId, pageId, locale, content);

    if (page.type === 'product' && extractedKeywords && extractedKeywords.length > 0) {
      await this.updateAnalyzedData(siteId, pageId, locale, {
        analyzed_keywords: extractedKeywords,
        analyzed_summary: analysisResult.summary,
      });
      return {
        ...analysisResult,
        keywords: extractedKeywords,
      };
    }

    return analysisResult;
  }

  /**
   * 获取 AnalyzerService 实例
   */
  getAnalyzer(): AnalyzerService {
    return this.analyzer;
  }

  /**
   * 构建 AI 生成所需的完整输入
   */
  async buildGenerateInput(
    siteId: string,
    pageId: string,
    locale: string,
    sourceLocale: string
  ): Promise<GenerateSeoInput> {
    // 1. 获取页面基本信息
    const { data: page, error: pageError } = await (supabase
      .from('pages') as any)
      .select('title, content_summary')
      .eq('site_id', siteId)
      .eq('id', pageId)
      .eq('locale', sourceLocale)
      .maybeSingle();

    let pageTitle: string;
    let contentSummary: string | undefined;

    if (pageError || !page) {
      console.warn(`页面 ${pageId} 在 pages 表中不存在 (locale=${sourceLocale})，使用备用标题`);
      pageTitle = pageId;
    } else {
      pageTitle = page.title;
      contentSummary = page.content_summary;
    }

    // 2. 获取 SEO 工作区数据
    const seoData = await this.getPageSeoData(siteId, pageId, sourceLocale);

    // 如果 page_type 是 unknown，尝试从 pageId 前缀提取类型
    let pageType = seoData.page_type;
    if (pageType === 'unknown' && pageId.includes(':')) {
      const extractedType = pageId.split(':')[0];
      const supportedTypes = [
        'home', 'product', 'productLine', 'productCollection', 'page',
        'blog', 'blogCategory', 'blogPost', 'docLibrary', 'doc',
        'videoCategory', 'video', 'inquiry', 'policy'
      ];
      if (supportedTypes.includes(extractedType)) {
        pageType = extractedType;
        console.log(`从 pageId 提取类型: ${extractedType}`);
      }
    }

    // 3. 获取站点设置
    const siteSettings = await strategiesService.getSiteSettings(siteId);

    const globalConfig = {
      site_id: siteId,
      site_name: siteSettings.siteName || '我的网站',
      brand_name: siteSettings.companyName || siteSettings.siteName || '我的品牌',
      site_url: siteSettings.websiteUrl || 'https://example.com',
      default_locale: siteSettings.defaultLocale || 'en',
      supported_locales: [],
      target_audience: siteSettings.targetAudience || '',
      core_values: Array.isArray(siteSettings.brand) ? siteSettings.brand : [],
    };

    // 4. 获取策略
    let strategy = await strategiesService.getStrategy(pageType, siteId);
    if (!strategy) {
      // 回退到 'page' 策略
      strategy = await strategiesService.getStrategy('page', siteId);
      if (!strategy) {
        throw new Error(`未找到页面类型 ${pageType} 的策略，且默认 page 策略也不存在`);
      }
      console.warn(`使用回退策略: page (原类型 ${pageType})`);
    }

    return {
      site_id: siteId,
      page_id: pageId,
      page_type: pageType,
      locale: locale,
      source_locale: sourceLocale,
      page_title: pageTitle,
      analyzed_keywords: seoData.analyzed_keywords,
      analyzed_summary: seoData.analyzed_summary || contentSummary || '',
      globalConfig,
      strategy,
    };
  }
}

export const seoService = new SeoService();