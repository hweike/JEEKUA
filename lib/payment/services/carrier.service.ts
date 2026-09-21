// lib/payment/services/carrier.service.ts
import { supabase } from '@/lib/supabase/client';
import type { Carrier, CreateCarrierInput, UpdateCarrierInput } from '../types/carrier';

export const carrierService = {
  /**
   * 获取所有承运商（公共数据 + 租户自定义数据）
   */
  async getAll(siteId?: string): Promise<Carrier[]> {
    let query = supabase
      .from('carriers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (siteId) {
      query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
    } else {
      query = query.is('site_id', null);
    }

    const { data, error } = await query;

    if (error) throw new Error(`获取承运商列表失败: ${error.message}`);
    return data || [];
  },

  /**
   * ✅ 根据运输方式获取承运商（分页 + 搜索）- 简化版
   * 先获取全部数据，再在内存中过滤和分页
   */
  async getByShippingMethodPaginated(
    shippingMethod: string,
    siteId?: string,
    page: number = 0,
    pageSize: number = 20,
    searchTerm?: string
  ): Promise<{ items: Carrier[]; hasMore: boolean; total: number }> {
    try {
      // ✅ 简化：先获取所有匹配的承运商（使用更简单的查询）
      let query = supabase
        .from('carriers')
        .select('*')
        .eq('is_active', true);

      // 站点筛选
      if (siteId) {
        query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
      } else {
        query = query.is('site_id', null);
      }

      // ✅ 搜索关键词（使用 ilike）
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        // 使用单个 or 条件，避免复杂语法
        query = query.or(`name_cn.ilike.%${term}%,name_en.ilike.%${term}%`);
      }

      // 排序
      query = query.order('sort_order', { ascending: true });

      // ✅ 先不限制数量，获取所有匹配的数据
      const { data, error } = await query;

      if (error) {
        console.error('[carrierService] 查询失败:', error);
        return { items: [], hasMore: false, total: 0 };
      }

      let allItems = data || [];

      // ✅ 在内存中过滤运输方式
      if (shippingMethod) {
        allItems = allItems.filter(c => {
          const methods = c.shipping_methods || [];
          if (!Array.isArray(methods) || methods.length === 0) return true;
          return methods.includes(shippingMethod);
        });
      }

      // ✅ 在内存中分页
      const total = allItems.length;
      const start = page * pageSize;
      const end = start + pageSize;
      const items = allItems.slice(start, end);
      const hasMore = end < total;

      return { 
        items, 
        hasMore, 
        total 
      };
    } catch (error) {
      console.error('[carrierService] 获取承运商失败:', error);
      return { items: [], hasMore: false, total: 0 };
    }
  },

  /**
   * ✅ 根据运输方式获取承运商（全部，不分页）
   */
  async getByShippingMethod(shippingMethod: string, siteId?: string): Promise<Carrier[]> {
    try {
      const all = await this.getAll(siteId);
      return all.filter(c => {
        const methods = c.shipping_methods || [];
        if (!Array.isArray(methods) || methods.length === 0) return true;
        return methods.includes(shippingMethod);
      });
    } catch (error) {
      console.error('获取承运商失败:', error);
      return [];
    }
  },

  /**
   * 根据 key 获取承运商（优先返回租户自定义的，否则返回公共数据）
   */
  async getByKey(key: string, siteId?: string): Promise<Carrier | null> {
    let query = supabase
      .from('carriers')
      .select('*')
      .eq('key', key)
      .eq('is_active', true);

    if (siteId) {
      query = query.eq('site_id', siteId);
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`获取承运商失败: ${error.message}`);
      if (data) return data;
    }

    const { data, error } = await supabase
      .from('carriers')
      .select('*')
      .eq('key', key)
      .eq('is_active', true)
      .is('site_id', null)
      .maybeSingle();

    if (error) throw new Error(`获取承运商失败: ${error.message}`);
    return data || null;
  },

  /**
   * 根据中文名称或英文名称搜索承运商
   */
  async searchByName(searchTerm: string, siteId?: string): Promise<Carrier[]> {
    let query = supabase
      .from('carriers')
      .select('*')
      .eq('is_active', true)
      .or(`name_cn.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,name_hk.ilike.%${searchTerm}%`)
      .order('sort_order');

    if (siteId) {
      query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
    } else {
      query = query.is('site_id', null);
    }

    const { data, error } = await query;

    if (error) throw new Error(`搜索承运商失败: ${error.message}`);
    return data || [];
  },

  /**
   * 创建承运商（租户自定义）
   */
  async create(siteId: string, input: CreateCarrierInput): Promise<Carrier> {
    const { data, error } = await supabase
      .from('carriers')
      .insert({
        site_id: siteId,
        key: input.key,
        name_en: input.name_en,
        name_cn: input.name_cn,
        name_hk: input.name_hk || '',
        url: input.url || '',
        shipping_methods: input.shipping_methods || [],
        logo: input.logo || '',
        sort_order: input.sort_order || 0,
        is_active: input.is_active !== undefined ? input.is_active : true,
      })
      .select()
      .single();

    if (error) throw new Error(`创建承运商失败: ${error.message}`);
    return data;
  },

  /**
   * 更新承运商
   */
  async update(id: string, input: UpdateCarrierInput): Promise<Carrier> {
    const { data, error } = await supabase
      .from('carriers')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新承运商失败: ${error.message}`);
    return data;
  },

  /**
   * 删除承运商（软删除）
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('carriers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`删除承运商失败: ${error.message}`);
  },
};

export default carrierService;