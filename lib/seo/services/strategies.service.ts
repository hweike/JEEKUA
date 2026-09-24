// lib/seo/services/strategies.service.ts
import sql from '@/lib/db/admin';
import type { SeoStrategy } from '../types';
import { getSettings } from '@/lib/Basicsettings/settings';

const DEFAULT_SITE_ID = '000001';

export class StrategiesService {
  async getStrategies(siteId: string = DEFAULT_SITE_ID): Promise<SeoStrategy[]> {
    try {
      return await sql<SeoStrategy[]>`
        SELECT * FROM public.seo_strategies
        WHERE site_id IS NULL
        ORDER BY page_type ASC
      `;
    } catch (error: any) {
      throw new Error(`获取策略列表失败: ${error.message}`);
    }
  }

  async getStrategy(pageType: string, siteId: string = DEFAULT_SITE_ID): Promise<SeoStrategy | null> {
    // 1. 先查自定义
    try {
      const rows = await sql<SeoStrategy[]>`
        SELECT * FROM public.seo_strategies
        WHERE site_id = ${siteId}
          AND page_type = ${pageType}
        LIMIT 1
      `;
      if (rows[0]) return rows[0];
    } catch (customError: any) {
      throw new Error(`查询自定义策略失败: ${customError.message}`);
    }

    // 2. 再查全局
    try {
      const rows = await sql<SeoStrategy[]>`
        SELECT * FROM public.seo_strategies
        WHERE site_id IS NULL
          AND page_type = ${pageType}
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (globalError: any) {
      throw new Error(`查询全局策略失败: ${globalError.message}`);
    }
  }

  async saveStrategy(strategy: SeoStrategy, siteId: string = DEFAULT_SITE_ID): Promise<SeoStrategy> {
    if (!strategy.page_type) throw new Error('page_type 是必填字段');
    if (!strategy.label) throw new Error('label 是必填字段');
    if (!strategy.fields) throw new Error('fields 是必填字段');

    let fields = strategy.fields;
    if (typeof fields === 'string') {
      try { fields = JSON.parse(fields); }
      catch (e) { throw new Error('fields 格式错误，无法解析'); }
    }

    const finalSiteId = strategy.site_id ?? siteId;
    const { id, ...rest } = strategy;

    const payload = {
      ...rest,
      fields,
      site_id: finalSiteId,
      updated_at: new Date().toISOString(),
    };

    try {
      const rows = await sql<SeoStrategy[]>`
        INSERT INTO public.seo_strategies ${sql(payload)}
        ON CONFLICT (site_id, page_type)
        DO UPDATE SET ${sql(payload, 'label', 'fields', 'updated_at')}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Upsert returned no data');
      return rows[0];
    } catch (error: any) {
      console.error('Upsert 错误:', error);
      throw new Error(`保存策略失败: ${error.message}`);
    }
  }

  async getSiteSettings(siteId: string = DEFAULT_SITE_ID) {
    return await getSettings();
  }
}

export const strategiesService = new StrategiesService();