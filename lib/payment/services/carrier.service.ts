// lib/payment/services/carrier.service.ts
import sql from '@/lib/db/admin';
import type { Carrier, CreateCarrierInput, UpdateCarrierInput } from '../types/carrier';

export const carrierService = {
  /**
   * 获取所有承运商（公共数据 + 租户自定义）
   */
  async getAll(siteId?: string): Promise<Carrier[]> {
    const conditions: any[] = [sql`is_active = true`];

    if (siteId) {
      conditions.push(sql`(site_id IS NULL OR site_id = ${siteId})`);
    } else {
      conditions.push(sql`site_id IS NULL`);
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    try {
      return await sql<Carrier[]>`
        SELECT * FROM public.carriers
        WHERE ${whereClause}
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      throw new Error(`获取承运商列表失败: ${error.message}`);
    }
  },

  /**
   * ✅ 根据运输方式获取承运商（分页 + 搜索）
   */
  async getByShippingMethodPaginated(
    shippingMethod: string,
    siteId?: string,
    page: number = 0,
    pageSize: number = 20,
    searchTerm?: string
  ): Promise<{ items: Carrier[]; hasMore: boolean; total: number }> {
    try {
      const conditions: any[] = [sql`is_active = true`];

      if (siteId) {
        conditions.push(sql`(site_id IS NULL OR site_id = ${siteId})`);
      } else {
        conditions.push(sql`site_id IS NULL`);
      }

      if (searchTerm && searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        conditions.push(sql`(name_cn ILIKE ${term} OR name_en ILIKE ${term})`);
      }

      const whereClause = conditions.reduce(
        (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
        sql``
      );

      let allItems = await sql<Carrier[]>`
        SELECT * FROM public.carriers
        WHERE ${whereClause}
        ORDER BY sort_order ASC
      `;

      // 内存中过滤运输方式
      if (shippingMethod) {
        allItems = allItems.filter(c => {
          const methods = (c as any).shipping_methods || [];
          if (!Array.isArray(methods) || methods.length === 0) return true;
          return methods.includes(shippingMethod);
        });
      }

      const total = allItems.length;
      const start = page * pageSize;
      const end = start + pageSize;
      const items = allItems.slice(start, end);
      const hasMore = end < total;

      return { items, hasMore, total };
    } catch (error) {
      console.error('[carrierService] 获取承运商失败:', error);
      return { items: [], hasMore: false, total: 0 };
    }
  },

  /**
   * 根据运输方式获取承运商（全部）
   */
  async getByShippingMethod(shippingMethod: string, siteId?: string): Promise<Carrier[]> {
    try {
      const all = await this.getAll(siteId);
      return all.filter(c => {
        const methods = (c as any).shipping_methods || [];
        if (!Array.isArray(methods) || methods.length === 0) return true;
        return methods.includes(shippingMethod);
      });
    } catch (error) {
      console.error('获取承运商失败:', error);
      return [];
    }
  },

  /**
   * 根据 key 获取承运商（优先租户自定义，否则公共）
   */
  async getByKey(key: string, siteId?: string): Promise<Carrier | null> {
    // 1. 先查租户自定义
    if (siteId) {
      try {
        const rows = await sql<Carrier[]>`
          SELECT * FROM public.carriers
          WHERE key = ${key}
            AND is_active = true
            AND site_id = ${siteId}
          LIMIT 1
        `;
        if (rows[0]) return rows[0];
      } catch (error: any) {
        throw new Error(`获取承运商失败: ${error.message}`);
      }
    }

    // 2. Fallback 到公共
    try {
      const rows = await sql<Carrier[]>`
        SELECT * FROM public.carriers
        WHERE key = ${key}
          AND is_active = true
          AND site_id IS NULL
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      throw new Error(`获取承运商失败: ${error.message}`);
    }
  },

  /**
   * 根据中文/英文/香港名称搜索
   */
  async searchByName(searchTerm: string, siteId?: string): Promise<Carrier[]> {
    const term = `%${searchTerm}%`;
    const conditions: any[] = [
      sql`is_active = true`,
      sql`(name_cn ILIKE ${term} OR name_en ILIKE ${term} OR name_hk ILIKE ${term})`,
    ];

    if (siteId) {
      conditions.push(sql`(site_id IS NULL OR site_id = ${siteId})`);
    } else {
      conditions.push(sql`site_id IS NULL`);
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    try {
      return await sql<Carrier[]>`
        SELECT * FROM public.carriers
        WHERE ${whereClause}
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      throw new Error(`搜索承运商失败: ${error.message}`);
    }
  },

  /**
   * 创建承运商（租户自定义）
   */
  async create(siteId: string, input: CreateCarrierInput): Promise<Carrier> {
    try {
      const rows = await sql<Carrier[]>`
        INSERT INTO public.carriers (
          site_id, key, name_en, name_cn, name_hk, url,
          shipping_methods, logo, sort_order, is_active
        ) VALUES (
          ${siteId}, ${input.key}, ${input.name_en}, ${input.name_cn},
          ${input.name_hk || ''}, ${input.url || ''},
          ${sql.json(input.shipping_methods || [])}, ${input.logo || ''},
          ${input.sort_order || 0}, ${input.is_active !== undefined ? input.is_active : true}
        )
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Insert returned no data');
      return rows[0];
    } catch (error: any) {
      throw new Error(`创建承运商失败: ${error.message}`);
    }
  },

  /**
   * 更新承运商
   */
  async update(id: string, input: UpdateCarrierInput): Promise<Carrier> {
    // 动态 SET
    const setClauses: any[] = [sql`updated_at = ${new Date().toISOString()}`];
    const jsonbFields = new Set(['shipping_methods']);

    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (jsonbFields.has(key)) {
        setClauses.push(sql`${sql(key)} = ${sql.json(value)}`);
      } else {
        setClauses.push(sql`${sql(key)} = ${value}`);
      }
    }

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    try {
      const rows = await sql<Carrier[]>`
        UPDATE public.carriers
        SET ${setClause}
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Carrier not found');
      return rows[0];
    } catch (error: any) {
      throw new Error(`更新承运商失败: ${error.message}`);
    }
  },

  /**
   * 删除承运商（软删除）
   */
  async delete(id: string): Promise<void> {
    try {
      await sql`
        UPDATE public.carriers
        SET is_active = false
        WHERE id = ${id}
      `;
    } catch (error: any) {
      throw new Error(`删除承运商失败: ${error.message}`);
    }
  },
};

export default carrierService;