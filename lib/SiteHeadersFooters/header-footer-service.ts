// lib/SiteHeadersFooters/header-footer-service.ts
import sql from '@/lib/db/admin';
import { DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG } from './config';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SITE_ID = '000001';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

      const isBusinessError =
        error.message?.includes('does not exist') ||
        error.message?.includes('relation') ||
        error.message?.includes('permission denied') ||
        error.message?.includes('Invalid API key');

      if (isBusinessError || attempt === retries) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export class HeaderFooterService {
  async getHeaderConfig(locale: string): Promise<any> {
    try {
      const rows = await sql<{ config: any }[]>`
        SELECT config FROM site_configs
        WHERE id = 'header'
          AND site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      return rows[0]?.config ?? null;
    } catch (error) {
      console.error(`获取页头配置失败 [${locale}]:`, error);
      return null;
    }
  }

  async saveHeaderConfig(locale: string, config: any): Promise<void> {
    await withRetry(
      async () => {
        await sql`
          INSERT INTO site_configs (id, site_id, locale, config, "updatedAt")
          VALUES ('header', ${DEFAULT_SITE_ID}, ${locale}, ${sql.json(config)}, ${new Date().toISOString()})
          ON CONFLICT (id, site_id, locale)
          DO UPDATE SET
            config = ${sql.json(config)},
            "updatedAt" = ${new Date().toISOString()}
        `;
      },
      MAX_RETRIES,
      RETRY_DELAY_MS,
      `保存页头配置 [${locale}]`
    );
  }

  async getFooterConfig(locale: string): Promise<any> {
    try {
      const rows = await sql<{ config: any }[]>`
        SELECT config FROM site_configs
        WHERE id = 'footer'
          AND site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      return rows[0]?.config ?? null;
    } catch (error) {
      console.error(`获取页脚配置失败 [${locale}]:`, error);
      return null;
    }
  }

  async saveFooterConfig(locale: string, config: any): Promise<void> {
    await withRetry(
      async () => {
        await sql`
          INSERT INTO site_configs (id, site_id, locale, config, "updatedAt")
          VALUES ('footer', ${DEFAULT_SITE_ID}, ${locale}, ${sql.json(config)}, ${new Date().toISOString()})
          ON CONFLICT (id, site_id, locale)
          DO UPDATE SET
            config = ${sql.json(config)},
            "updatedAt" = ${new Date().toISOString()}
        `;
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

    return configData;
  }
}

export const headerFooterService = new HeaderFooterService();