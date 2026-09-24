// lib/payment/services/legal-templates.service.ts
import sql from '@/lib/db/admin';

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
  async list(siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate[]> {
    try {
      return await sql<LegalTemplate[]>`
        SELECT * FROM public.legal_templates
        WHERE site_id = ${siteId}
          AND deleted_at IS NULL
        ORDER BY sort_order ASC, created_at DESC
      `;
    } catch (error: any) {
      console.error('获取模板列表失败:', error);
      throw new Error(`获取模板列表失败: ${error.message}`);
    }
  },

  async getDefault(siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate | null> {
    try {
      const rows = await sql<LegalTemplate[]>`
        SELECT * FROM public.legal_templates
        WHERE site_id = ${siteId}
          AND is_default = true
          AND deleted_at IS NULL
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error('获取默认模板失败:', error);
      throw new Error(`获取默认模板失败: ${error.message}`);
    }
  },

  async getById(id: string, siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate | null> {
    try {
      const rows = await sql<LegalTemplate[]>`
        SELECT * FROM public.legal_templates
        WHERE site_id = ${siteId}
          AND id = ${id}
          AND deleted_at IS NULL
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error('获取模板详情失败:', error);
      throw new Error(`获取模板详情失败: ${error.message}`);
    }
  },

  async create(input: CreateTemplateInput, siteId: string = DEFAULT_SITE_ID): Promise<LegalTemplate> {
    // 1. 如果设为默认，先取消其他默认
    if (input.is_default) {
      try {
        await sql`
          UPDATE public.legal_templates
          SET is_default = false
          WHERE site_id = ${siteId}
            AND is_default = true
        `;
      } catch {}
    }

    // 2. 插入
    try {
      const rows = await sql<LegalTemplate[]>`
        INSERT INTO public.legal_templates (
          site_id, name, content, description, is_default, sort_order, created_by
        ) VALUES (
          ${siteId}, ${input.name}, ${input.content},
          ${input.description || ''}, ${input.is_default || false},
          ${input.sort_order || 0}, ${input.created_by || ''}
        )
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Insert returned no data');
      return rows[0];
    } catch (error: any) {
      console.error('创建模板失败:', error);
      throw new Error(`创建模板失败: ${error.message}`);
    }
  },

  async update(
    id: string,
    input: UpdateTemplateInput,
    siteId: string = DEFAULT_SITE_ID
  ): Promise<LegalTemplate> {
    // 1. 如果设为默认，先取消其他默认（排除自己）
    if (input.is_default) {
      try {
        await sql`
          UPDATE public.legal_templates
          SET is_default = false
          WHERE site_id = ${siteId}
            AND is_default = true
            AND id != ${id}
        `;
      } catch {}
    }

    // 2. 动态 SET
    const setClauses: any[] = [sql`updated_at = ${new Date().toISOString()}`];
    if (input.name !== undefined) setClauses.push(sql`name = ${input.name}`);
    if (input.content !== undefined) setClauses.push(sql`content = ${input.content}`);
    if (input.description !== undefined) setClauses.push(sql`description = ${input.description}`);
    if (input.is_default !== undefined) setClauses.push(sql`is_default = ${input.is_default}`);
    if (input.sort_order !== undefined) setClauses.push(sql`sort_order = ${input.sort_order}`);

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    // 3. 更新
    try {
      const rows = await sql<LegalTemplate[]>`
        UPDATE public.legal_templates
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Template not found');
      return rows[0];
    } catch (error: any) {
      console.error('更新模板失败:', error);
      throw new Error(`更新模板失败: ${error.message}`);
    }
  },

  async delete(id: string, siteId: string = DEFAULT_SITE_ID): Promise<void> {
    try {
      await sql`
        UPDATE public.legal_templates
        SET deleted_at = ${new Date().toISOString()},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('删除模板失败:', error);
      throw new Error(`删除模板失败: ${error.message}`);
    }
  },

  async initializeDefaults(siteId: string = DEFAULT_SITE_ID): Promise<void> {
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

    for (const tpl of tpls) {
      await this.create(tpl, siteId);
    }
  },
};

export default legalTemplateService;