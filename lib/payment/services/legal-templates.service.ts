// lib/payment/services/legal-templates.service.ts
import { supabase } from '@/lib/supabase/client';

export interface LegalTemplate {
  id: string;
  site_id: string;
  name: string;
  content: string;
  description?: string;
  is_default: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateTemplateInput {
  name: string;
  content: string;
  description?: string;
  is_default?: boolean;
  sort_order?: number;
  created_by?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  description?: string;
  is_default?: boolean;
  sort_order?: number;
}

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export const legalTemplateService = {
  /**
   * 获取所有模板
   */
  async list(siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate[]> {
    const { data, error } = await supabase
      .from('legal_templates')
      .select('*')
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取模板列表失败:', error);
      throw new Error(`获取模板列表失败: ${error.message}`);
    }
    return data || [];
  },

  /**
   * 获取默认模板
   */
  async getDefault(siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate | null> {
    const { data, error } = await supabase
      .from('legal_templates')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_default', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('获取默认模板失败:', error);
      throw new Error(`获取默认模板失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * 根据ID获取模板
   */
  async getById(id: string, siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate | null> {
    const { data, error } = await supabase
      .from('legal_templates')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('获取模板详情失败:', error);
      throw new Error(`获取模板详情失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * 创建模板
   */
  async create(input: CreateTemplateInput, siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate> {
    // 如果设为默认，先取消其他默认
    if (input.is_default) {
      await supabase
        .from('legal_templates')
        .update({ is_default: false })
        .eq('site_id', siteId)
        .eq('is_default', true);
    }

    const insertData = {
      site_id: siteId,
      name: input.name,
      content: input.content,
      description: input.description || '',
      is_default: input.is_default || false,
      sort_order: input.sort_order || 0,
      created_by: input.created_by || '',
    };

    const { data, error } = await supabase
      .from('legal_templates')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('创建模板失败:', error);
      throw new Error(`创建模板失败: ${error.message}`);
    }
    return data;
  },

  /**
   * 更新模板
   */
  async update(id: string, input: UpdateTemplateInput, siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate> {
    // 如果设为默认，先取消其他默认
    if (input.is_default) {
      await supabase
        .from('legal_templates')
        .update({ is_default: false })
        .eq('site_id', siteId)
        .eq('is_default', true)
        .not('id', 'eq', id);
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.is_default !== undefined) updateData.is_default = input.is_default;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { data, error } = await supabase
      .from('legal_templates')
      .update(updateData)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新模板失败:', error);
      throw new Error(`更新模板失败: ${error.message}`);
    }
    return data;
  },

  /**
   * 删除模板（软删除）
   */
  async delete(id: string, siteId: string = DEFAULT_SITE_ID): Promise<void> {
    const { error } = await supabase
      .from('legal_templates')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) {
      console.error('删除模板失败:', error);
      throw new Error(`删除模板失败: ${error.message}`);
    }
  },

  /**
   * 批量创建默认模板（用于初始化）
   */
  async initializeDefaults(siteId: string = DEFAULT_SITE_ID): Promise<void> {
    // 检查是否已有模板
    const existing = await this.list(siteId);
    if (existing.length > 0) return;

    const defaultTemplates = [
      {
        name: '标准条款',
        content: '1. 付款方式：买方应在收到形式发票后3个工作日内支付全部款项。\n2. 交货时间：卖方应在收到预付款后15个工作日内安排发货。\n3. 质量标准：产品应符合双方确认的样品及规格书要求。\n4. 售后服务：卖方提供12个月的质量保证期。\n5. 争议解决：双方应友好协商解决争议，协商不成的，提交深圳国际仲裁院仲裁。',
        is_default: true,
        sort_order: 1,
      },
      {
        name: '贸易条款',
        content: '1. 贸易术语：FOB Shenzhen\n2. 付款方式：30%预付款 + 70%尾款（发货前付清）\n3. 包装要求：标准出口包装，适合海运\n4. 文件要求：商业发票、装箱单、原产地证、提单\n5. 保险：由买方自行投保',
        is_default: false,
        sort_order: 2,
      },
    ];

    for (const tpl of defaultTemplates) {
      await this.create(tpl, siteId);
    }
  },
};

export default legalTemplateService;