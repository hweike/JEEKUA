// lib/seo/services/seo.service.ts
// =====================================================
// SEO 数据管理服务
// =====================================================

import sql from '@/lib/db/admin';
import type { PageSeoData, GenerateSeoInput, AnalyzedContent } from '../types';
import { GENERATION_STATUS, PAGE_TYPES } from '../constants';
import { strategiesService } from './strategies.service';
import { AnalyzerService } from './analyzer.service';
import { syncService } from './sync.service';

const DEFAULT_SITE_ID = '000001';

export class SeoService {
  private analyzer: AnalyzerService;

  constructor() {
    this.analyzer = new AnalyzerService({
      maxSummaryLength: 200,
      maxKeywords: 10,
    });
  }

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
    let existing: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.page_seo_data
        WHERE site_id = ${siteId}
          AND page_id = ${pageId}
          AND locale = ${locale}
        LIMIT 1
      `;
      existing = rows[0];
    } catch (error: any) {
      throw new Error(`查询 page_seo_data 失败: ${error.message}`);
    }
    if (existing) return this.mapToPageSeoData(existing);

    // 查 pages 表
    let page: { type: string | null; title: string | null } | undefined;
    try {
      const rows = await sql<{ type: string | null; title: string | null }[]>`
        SELECT type, title FROM public.pages
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${locale}
        LIMIT 1
      `;
      page = rows[0];
    } catch {}

    if (!page) {
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

    try {
      const rows = await sql<any[]>`
        INSERT INTO public.page_seo_data (
          site_id, page_id, locale, page_type, generation_status
        ) VALUES (
          ${siteId}, ${pageId}, ${locale}, ${pageType}, ${GENERATION_STATUS.PENDING}
        )
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Insert returned no data');
      return this.mapToPageSeoData(rows[0]);
    } catch (insertError: any) {
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

    // 查 page type
    let pageType = 'unknown';
    try {
      const rows = await sql<{ type: string | null }[]>`
        SELECT type FROM public.pages
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${locale}
        LIMIT 1
      `;
      pageType = rows[0]?.type || 'unknown';
    } catch {}

    const now = new Date().toISOString();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const rows = await sql<any[]>`
          INSERT INTO public.page_seo_data (
            site_id, page_id, locale, page_type,
            analyzed_keywords, analyzed_summary,
            generation_status, updated_at
          ) VALUES (
            ${siteId}, ${pageId}, ${locale}, ${pageType},
            ${updates.analyzed_keywords ?? []},
            ${updates.analyzed_summary ?? ''},
            ${GENERATION_STATUS.ANALYZED}, ${now}
          )
          ON CONFLICT (site_id, page_id, locale)
          DO UPDATE SET
            page_type = EXCLUDED.page_type,
            analyzed_keywords = EXCLUDED.analyzed_keywords,
            analyzed_summary = EXCLUDED.analyzed_summary,
            generation_status = EXCLUDED.generation_status,
            updated_at = EXCLUDED.updated_at
          RETURNING *
        `;
        if (!rows[0]) throw new Error('Upsert returned no data');
        return this.mapToPageSeoData(rows[0]);
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
    const setClauses: any[] = [
      sql`generation_status = ${GENERATION_STATUS.AI_GENERATED}`,
      sql`updated_at = ${new Date().toISOString()}`,
    ];
    if (draft.seo_title !== undefined) setClauses.push(sql`seo_title = ${draft.seo_title}`);
    if (draft.seo_description !== undefined) setClauses.push(sql`seo_description = ${draft.seo_description}`);
    if (draft.seo_keywords !== undefined) setClauses.push(sql`seo_keywords = ${draft.seo_keywords}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    try {
      const rows = await sql<any[]>`
        UPDATE public.page_seo_data
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND page_id = ${pageId}
          AND locale = ${locale}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Page SEO data not found');
      return this.mapToPageSeoData(rows[0]);
    } catch (error: any) {
      throw new Error(`更新草稿失败: ${error.message}`);
    }
  }

  /**
   * 确认发布：将草稿写入 pages 表（状态 -> approved）
   */
  async approveSeo(
    siteId: string,
    pageId: string,
    locale: string
  ): Promise<void> {
    // 1. 获取草稿
    let seoData: any;
    try {
      const rows = await sql<any[]>`
        SELECT seo_title, seo_description, seo_keywords FROM public.page_seo_data
        WHERE site_id = ${siteId}
          AND page_id = ${pageId}
          AND locale = ${locale}
        LIMIT 1
      `;
      seoData = rows[0];
    } catch (fetchError: any) {
      throw new Error(`获取草稿失败: ${fetchError.message}`);
    }

    if (!seoData) {
      console.warn(`页面 ${pageId} (${locale}) 没有草稿数据，跳过发布`);
      return;
    }

    // 2. seo_keywords 数组转字符串
    const keywordsText = Array.isArray(seoData.seo_keywords)
      ? seoData.seo_keywords.filter(Boolean).join(', ')
      : seoData.seo_keywords || '';

    // 3. 更新 pages 表
    try {
      await sql`
        UPDATE public.pages
        SET seo_title = ${seoData.seo_title},
            seo_description = ${seoData.seo_description},
            seo_keywords = ${keywordsText},
            "updatedAt" = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${locale}
      `;
    } catch (updateError: any) {
      throw new Error(`更新 pages 表失败: ${updateError.message}`);
    }

    // 4. 更新 page_seo_data 状态
    try {
      await sql`
        UPDATE public.page_seo_data
        SET seo_title = ${seoData.seo_title},
            seo_description = ${seoData.seo_description},
            seo_keywords = ${seoData.seo_keywords},
            generation_status = ${GENERATION_STATUS.APPROVED},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND page_id = ${pageId}
          AND locale = ${locale}
      `;
    } catch (statusError: any) {
      throw new Error(`更新状态失败: ${statusError.message}`);
    }

    // 5. 同步到业务表和 MD/JSON 文件
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
   * 从 products 表获取产品基本信息
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
    let product: any = null;
    let isVariant = false;
    let parentProductId: string | null = null;
    let actualProductId = fullProductId;

    if (fullProductId.includes('/')) {
      const parts = fullProductId.split('/');
      const variantId = parts[parts.length - 1];
      actualProductId = variantId;

      try {
        const rows = await sql<any[]>`
          SELECT * FROM public.products
          WHERE site_id = ${siteId}
            AND "productId" = ${variantId}
            AND locale = ${locale}
          LIMIT 1
        `;
        if (rows[0]) {
          product = rows[0];
          isVariant = true;
          parentProductId = rows[0].parent_product_id || parts[0];
        } else {
          const parentId = parts[0];
          const parentRows = await sql<any[]>`
            SELECT * FROM public.products
            WHERE site_id = ${siteId}
              AND "productId" = ${parentId}
              AND locale = ${locale}
            LIMIT 1
          `;
          if (parentRows[0]) {
            product = parentRows[0];
            isVariant = true;
            parentProductId = parentId;
          }
        }
      } catch {}
    } else {
      try {
        const rows = await sql<any[]>`
          SELECT * FROM public.products
          WHERE site_id = ${siteId}
            AND "productId" = ${fullProductId}
            AND locale = ${locale}
          LIMIT 1
        `;
        if (rows[0]) {
          product = rows[0];
          actualProductId = fullProductId;
        }
      } catch {}
    }

    if (!product) {
      try {
        const rows = await sql<{ title: string | null }[]>`
          SELECT title FROM public.pages
          WHERE site_id = ${siteId}
            AND id = ${'product:' + fullProductId}
            AND locale = ${locale}
          LIMIT 1
        `;
        if (rows[0]) {
          product = { product_name: rows[0].title };
        }
      } catch {}
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
      const nameParts = productName.split(/[\s\-]+/).filter((p: string) => p.length > 2);
      nameParts.forEach((p: string) => {
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

    let fullContent = '';
    try {
      const rows = await sql<{ full_content: string | null }[]>`
        SELECT full_content FROM public.page_contents
        WHERE page_id = ${descTargetProductId}
          AND site_id = ${siteId}
          AND locale = ${locale}
        LIMIT 1
      `;
      if (rows[0]?.full_content) fullContent = rows[0].full_content;
    } catch {}

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
    let page: { type: string; title: string; content_summary: string | null } | undefined;
    try {
      const rows = await sql<{ type: string; title: string; content_summary: string | null }[]>`
        SELECT type, title, content_summary FROM public.pages
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${locale}
        LIMIT 1
      `;
      page = rows[0];
    } catch (error: any) {
      throw new Error(`获取页面信息失败: ${error.message}`);
    }

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
        try {
          const rows = await sql<{ full_content: string | null }[]>`
            SELECT full_content FROM public.page_contents
            WHERE page_id = ${pageId}
              AND site_id = ${siteId}
              AND locale = ${locale}
            LIMIT 1
          `;
          if (rows[0]?.full_content) content = rows[0].full_content;
        } catch {}

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
    let page: { title: string; content_summary: string | null } | undefined;
    try {
      const rows = await sql<{ title: string; content_summary: string | null }[]>`
        SELECT title, content_summary FROM public.pages
        WHERE site_id = ${siteId}
          AND id = ${pageId}
          AND locale = ${sourceLocale}
        LIMIT 1
      `;
      page = rows[0];
    } catch {}

    let pageTitle: string;
    let contentSummary: string | undefined;

    if (!page) {
      console.warn(`页面 ${pageId} 在 pages 表中不存在 (locale=${sourceLocale})，使用备用标题`);
      pageTitle = pageId;
    } else {
      pageTitle = page.title;
      contentSummary = page.content_summary ?? undefined;
    }

    // 2. 获取 SEO 工作区数据
    const seoData = await this.getPageSeoData(siteId, pageId, sourceLocale);

    let pageType = seoData.page_type;
    if (pageType === 'unknown' && pageId.includes(':')) {
      const extractedType = pageId.split(':')[0];
      if (PAGE_TYPES.includes(extractedType as any)) {
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