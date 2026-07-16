// lib/seo/services/strategies.service.ts

import { supabase } from '@/lib/supabase/client';
import type { SeoStrategy } from '../types';
import { getSettings } from '@/lib/Basicsettings/settings';

const DEFAULT_SITE_ID = '000001';

export class StrategiesService {
  async getStrategies(siteId: string = DEFAULT_SITE_ID): Promise<SeoStrategy[]> {
    const { data, error } = await supabase
      .from('seo_strategies')
      .select('*')
      .is('site_id', null)
      .order('page_type');
    if (error) throw new Error(`获取策略列表失败: ${error.message}`);
    return data || [];
  }

  async getStrategy(pageType: string, siteId: string = DEFAULT_SITE_ID): Promise<SeoStrategy | null> {
    const { data: custom, error: customError } = await supabase
      .from('seo_strategies')
      .select('*')
      .eq('site_id', siteId)
      .eq('page_type', pageType)
      .maybeSingle();
    if (customError) throw new Error(`查询自定义策略失败: ${customError.message}`);
    if (custom) return custom;

    const { data: global, error: globalError } = await supabase
      .from('seo_strategies')
      .select('*')
      .is('site_id', null)
      .eq('page_type', pageType)
      .maybeSingle();
    if (globalError) throw new Error(`查询全局策略失败: ${globalError.message}`);
    return global;
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

    const { data, error } = await supabase
      .from('seo_strategies')
      .upsert(payload, {
        onConflict: 'site_id, page_type',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert 错误:', error);
      throw new Error(`保存策略失败: ${error.message}`);
    }
    return data;
  }

  /**
   * 从 sites_settings 表获取站点设置（用于 AI 上下文）
   */
  async getSiteSettings(siteId: string = DEFAULT_SITE_ID) {
    return await getSettings(); // 使用已有的 getSettings 函数
  }
}

export const strategiesService = new StrategiesService();