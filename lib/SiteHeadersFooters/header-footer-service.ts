// lib/SiteHeadersFooters/header-footer-service.ts
import { supabase } from '@/lib/supabase/client';
import { DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG } from './config';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = '000001';

// 重试配置
const MAX_RETRIES = 3;         // 最多重试次数
const RETRY_DELAY_MS = 1000;   // 重试间隔（毫秒）

/**
 * 带重试的异步函数包装器
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS,
  label: string = '操作'
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(`[${label}] 第 ${attempt}/${retries} 次失败:`, error.message);

      // 业务错误不重试
      const isBusinessError =
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('permission denied') ||
        error.message?.includes('Invalid API key');

      if (isBusinessError || attempt === retries) {
        throw error;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export class HeaderFooterService {
  async getHeaderConfig(locale: string): Promise<any> {
    const { data, error } = await supabase
      .from('site_configs')
      .select('config')
      .eq('id', 'header')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (error) {
      console.error(`获取页头配置失败 [${locale}]:`, error);
      return null;
    }
    return data?.config ?? null;
  }

  async saveHeaderConfig(locale: string, config: any): Promise<void> {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('site_configs')
          .upsert(
            {
              id: 'header',
              site_id: DEFAULT_SITE_ID,
              locale,
              config,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'id, site_id, locale' }
          );

        if (error) throw new Error(error.message);
      },
      MAX_RETRIES,
      RETRY_DELAY_MS,
      `保存页头配置 [${locale}]`
    );
  }

  async getFooterConfig(locale: string): Promise<any> {
    const { data, error } = await supabase
      .from('site_configs')
      .select('config')
      .eq('id', 'footer')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (error) {
      console.error(`获取页脚配置失败 [${locale}]:`, error);
      return null;
    }
    return data?.config ?? null;
  }

  async saveFooterConfig(locale: string, config: any): Promise<void> {
    await withRetry(
      async () => {
        const { error } = await supabase
          .from('site_configs')
          .upsert(
            {
              id: 'footer',
              site_id: DEFAULT_SITE_ID,
              locale,
              config,
              updatedAt: new Date().toISOString(),
            },
            { onConflict: 'id, site_id, locale' }
          );

        if (error) throw new Error(error.message);
      },
      MAX_RETRIES,
      RETRY_DELAY_MS,
      `保存页脚配置 [${locale}]`
    );
  }

  async initConfig(type: 'header' | 'footer', locale: string): Promise<any> {
    const storage = getPrivateStorage();
    const sampleKey = `SiteHeadersFooters/samples/${type}_sample.json`;
    let configData: any;

    try {
      // ✅ 修复类型错误：storage.read 返回 string | Buffer
      const contentResult = await storage.read(sampleKey, 'utf8');
      const contentStr =
        typeof contentResult === 'string'
          ? contentResult
          : contentResult.toString('utf8');

      const raw = JSON.parse(contentStr);

      if (Array.isArray(raw) && raw.length > 0 && raw[0].config) {
        const configStr = raw[0].config;
        configData = typeof configStr === 'string' ? JSON.parse(configStr) : configStr;
      } else if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        configData = raw;
      } else {
        throw new Error('无法识别的样本格式');
      }
    } catch (error: any) {
      console.error(`读取样本文件失败 (${sampleKey}):`, error.message);
      configData = type === 'header' ? DEFAULT_HEADER_CONFIG : DEFAULT_FOOTER_CONFIG;
    }

    const saveMethod = type === 'header' ? this.saveHeaderConfig : this.saveFooterConfig;
    await saveMethod.call(this, locale, configData);

    // 返回写入的配置（供前端直接使用）
    return configData;
  }
}

export const headerFooterService = new HeaderFooterService();