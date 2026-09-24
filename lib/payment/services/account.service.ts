// lib/payment/services/account.service.ts
import sql from '@/lib/db/admin';
import { generateShareToken } from '../utils/share-token';
import type {
  PaymentAccount,
  CreateAccountInput,
  UpdateAccountInput,
  AccountType,
  AccountFilters,
} from '../types/account';

export const accountService = {
  async list(siteId: string, filters?: AccountFilters): Promise<PaymentAccount[]> {
    const conditions: any[] = [
      sql`site_id = ${siteId}`,
      sql`is_active = true`,
    ];

    if (filters?.type) {
      conditions.push(sql`payment_type = ${filters.type}`);
    }
    if (filters?.method) {
      if (filters.method.includes(',')) {
        const methods = filters.method.split(',').map(m => m.trim());
        conditions.push(sql`payment_method IN ${sql(methods)}`);
      } else {
        conditions.push(sql`payment_method = ${filters.method}`);
      }
    }
    if (filters?.account_type) {
      if (filters.account_type === 'null' || filters.account_type === 'NULL') {
        conditions.push(sql`account_type IS NULL`);
      } else {
        conditions.push(sql`account_type = ${filters.account_type}`);
      }
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    try {
      return await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE ${whereClause}
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
  },

  async getById(siteId: string, id: string): Promise<PaymentAccount> {
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND id = ${id}
        LIMIT 1
      `;
      if (!rows[0]) throw new Error('Account not found');
      return rows[0];
    } catch (error: any) {
      console.error('获取账号详情失败:', error);
      throw new Error(`获取账号详情失败: ${error.message}`);
    }
  },

  async getDefault(siteId: string): Promise<PaymentAccount | null> {
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_default = true
          AND is_active = true
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error('获取默认账号失败:', error);
      throw new Error(`获取默认账号失败: ${error.message}`);
    }
  },

  async create(siteId: string, input: CreateAccountInput, operator: string): Promise<PaymentAccount> {
    // 1. 如果设为默认，先取消其他默认
    if (input.is_default) {
      try {
        await sql`
          UPDATE public.payment_accounts
          SET is_default = false
          WHERE site_id = ${siteId}
            AND is_default = true
        `;
      } catch (updateError: any) {
        console.error('取消默认账号失败:', updateError);
        throw new Error(`取消默认账号失败: ${updateError.message}`);
      }
    }

    // 2. 插入
    try {
      const rows = await sql<PaymentAccount[]>`
        INSERT INTO public.payment_accounts (
          site_id, account_type, payment_type, payment_method,
          display_name_zh, display_name_en, currency, is_default, is_active, sort_order,
          is_verified,
          beneficiary_name, beneficiary_account, country_region, swift_code,
          beneficiary_address, beneficiary_bank, beneficiary_bank_address,
          bank_code, branch_code, iban, attention, intermediary_bank,
          account_holder, account_identifier, qr_code_image, remark,
          paypal_email, paypal_client_id, paypal_client_secret, paypal_webhook_id
        ) VALUES (
          ${siteId}, ${input.account_type || null}, ${input.payment_type}, ${input.payment_method},
          ${input.display_name_zh || ''}, ${input.display_name_en || ''},
          ${input.currency || ['USD']}, ${input.is_default || false}, true, 0,
          ${input.is_verified || false},
          ${input.beneficiary_name || ''}, ${input.beneficiary_account || ''},
          ${input.country_region || ''}, ${input.swift_code || ''},
          ${input.beneficiary_address || ''}, ${input.beneficiary_bank || ''},
          ${input.beneficiary_bank_address || ''},
          ${input.bank_code || ''}, ${input.branch_code || ''},
          ${input.iban || ''}, ${input.attention || ''}, ${input.intermediary_bank || ''},
          ${input.account_holder || ''}, ${input.account_identifier || ''},
          ${input.qr_code_image || ''}, ${input.remark || ''},
          ${input.paypal_email || ''}, ${input.paypal_client_id || ''},
          ${input.paypal_client_secret || ''}, ${input.paypal_webhook_id || ''}
        )
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Insert returned no data');
      return rows[0];
    } catch (error: any) {
      console.error('创建账号失败:', error);
      throw new Error(`创建账号失败: ${error.message}`);
    }
  },

  async update(siteId: string, id: string, input: UpdateAccountInput, operator: string): Promise<PaymentAccount> {
    // 1. 如果设为默认，先取消其他默认（排除自己）
    if (input.is_default) {
      try {
        await sql`
          UPDATE public.payment_accounts
          SET is_default = false
          WHERE site_id = ${siteId}
            AND is_default = true
            AND id != ${id}
        `;
      } catch (updateError: any) {
        console.error('取消默认账号失败:', updateError);
        throw new Error(`取消默认账号失败: ${updateError.message}`);
      }
    }

    // 2. 动态 SET
    const setClauses: any[] = [sql`updated_at = ${new Date().toISOString()}`];
    const fields = [
      'account_type', 'payment_type', 'payment_method',
      'display_name_zh', 'display_name_en', 'currency', 'is_default', 'is_active', 'is_verified',
      'beneficiary_name', 'beneficiary_account', 'country_region', 'swift_code',
      'beneficiary_address', 'beneficiary_bank', 'beneficiary_bank_address',
      'bank_code', 'branch_code', 'iban', 'attention', 'intermediary_bank',
      'account_holder', 'account_identifier', 'qr_code_image', 'remark',
      'paypal_email', 'paypal_client_id', 'paypal_client_secret', 'paypal_webhook_id',
    ];
    for (const field of fields) {
      if ((input as any)[field] !== undefined) {
        setClauses.push(sql`${sql(field)} = ${(input as any)[field]}`);
      }
    }

    const setClause = setClauses.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
      sql``
    );

    // 3. 更新
    try {
      const rows = await sql<PaymentAccount[]>`
        UPDATE public.payment_accounts
        SET ${setClause}
        WHERE site_id = ${siteId}
          AND id = ${id}
        RETURNING *
      `;
      if (!rows[0]) throw new Error('Account not found');
      return rows[0];
    } catch (error: any) {
      console.error('更新账号失败:', error);
      throw new Error(`更新账号失败: ${error.message}`);
    }
  },

  async updateVerificationStatus(siteId: string, id: string, isVerified: boolean): Promise<void> {
    try {
      await sql`
        UPDATE public.payment_accounts
        SET is_verified = ${isVerified},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('更新验证状态失败:', error);
      throw new Error(`更新验证状态失败: ${error.message}`);
    }
  },

  async delete(siteId: string, id: string): Promise<void> {
    try {
      await sql`
        UPDATE public.payment_accounts
        SET is_active = false,
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('删除账号失败:', error);
      throw new Error(`删除账号失败: ${error.message}`);
    }
  },

  async setDefault(siteId: string, id: string): Promise<void> {
    // 1. 取消所有默认
    try {
      await sql`
        UPDATE public.payment_accounts
        SET is_default = false
        WHERE site_id = ${siteId}
          AND is_default = true
      `;
    } catch (clearError: any) {
      console.error('取消默认账号失败:', clearError);
      throw new Error(`取消默认账号失败: ${clearError.message}`);
    }

    // 2. 设置新默认
    try {
      await sql`
        UPDATE public.payment_accounts
        SET is_default = true
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('设置默认账号失败:', error);
      throw new Error(`设置默认账号失败: ${error.message}`);
    }
  },

  async getCopyText(siteId: string, id: string): Promise<string> {
    const account = await this.getById(siteId, id);

    const displayName = account.display_name_zh || account.display_name_en || 'Account';
    let text = `=== ${displayName} ===\n\n`;

    if (account.payment_method === 'tt') {
      text += `Beneficiary Name: ${account.beneficiary_name || '-'}\n`;
      text += `Beneficiary Account Number: ${account.beneficiary_account || '-'}\n`;
      text += `Country/Region: ${account.country_region || '-'}\n`;
      text += `Swift Code: ${account.swift_code || '-'}\n`;
      if (account.iban) text += `IBAN: ${account.iban}\n`;
      text += `Beneficiary Address: ${account.beneficiary_address || '-'}\n`;
      text += `Beneficiary Bank: ${account.beneficiary_bank || '-'}\n`;
      text += `Beneficiary Bank Address: ${account.beneficiary_bank_address || '-'}\n`;
      if (account.bank_code) text += `Bank Code: ${account.bank_code}\n`;
      if (account.branch_code) text += `Branch Code: ${account.branch_code}\n`;
      if (account.attention) text += `\nAttention: ${account.attention}\n`;
    } else if (account.payment_method === 'wechat' || account.payment_method === 'alipay') {
      text += `收款户名: ${account.account_holder || '-'}\n`;
      if (account.payment_method === 'alipay') {
        text += `账号: ${account.account_identifier || '-'}\n`;
      }
      if (account.remark) text += `备注: ${account.remark}\n`;
    } else if (account.payment_method === 'paypal') {
      text += `PayPal Email: ${account.paypal_email || '-'}\n`;
      text += `验证状态: ${account.is_verified ? '✅ 已验证' : '❌ 未验证'}\n`;
    }

    if (account.currency && Array.isArray(account.currency) && account.currency.length > 0) {
      text += `\nSupported Currencies: ${account.currency.join(', ')}\n`;
    }

    return text;
  },

  async generateShareLink(siteId: string, id: string): Promise<{ token: string; url: string }> {
    const token = generateShareToken();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
      await sql`
        UPDATE public.payment_accounts
        SET share_token = ${token},
            updated_at = ${new Date().toISOString()}
        WHERE site_id = ${siteId}
          AND id = ${id}
      `;
    } catch (error: any) {
      console.error('生成分享链接失败:', error);
      throw new Error(`生成分享链接失败: ${error.message}`);
    }

    return {
      token,
      url: `${baseUrl}/en/payment/account/share/${token}`,
    };
  },

  async getByShareToken(token: string): Promise<PaymentAccount | null> {
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE share_token = ${token}
          AND is_active = true
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error('获取分享账号失败:', error);
      throw new Error(`获取分享账号失败: ${error.message}`);
    }
  },

  async listByType(siteId: string, accountType: AccountType): Promise<PaymentAccount[]> {
    try {
      return await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND account_type = ${accountType}
          AND is_active = true
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
  },

  async listByCurrency(siteId: string, currency: string): Promise<PaymentAccount[]> {
    try {
      return await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_active = true
          AND currency @> ${sql.json([currency])}
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
  },

  async getDefaultByCurrency(siteId: string, currency: string): Promise<PaymentAccount | null> {
    // 1. 先找默认且支持该货币的
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_default = true
          AND is_active = true
          AND currency @> ${sql.json([currency])}
        LIMIT 1
      `;
      if (rows[0]) return rows[0];
    } catch {}

    // 2. Fallback：找第一个支持该货币的
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_active = true
          AND currency @> ${sql.json([currency])}
        ORDER BY sort_order ASC
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (fallbackError: any) {
      console.error('获取账号失败:', fallbackError);
      throw new Error(`获取账号失败: ${fallbackError.message}`);
    }
  },

  async updateSortOrder(siteId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      try {
        await sql`
          UPDATE public.payment_accounts
          SET sort_order = ${i},
              updated_at = ${new Date().toISOString()}
          WHERE site_id = ${siteId}
            AND id = ${ids[i]}
        `;
      } catch (error: any) {
        console.error(`更新排序失败 (id: ${ids[i]}):`, error);
        throw new Error(`更新排序失败: ${error.message}`);
      }
    }
  },

  async getAllActive(siteId: string): Promise<PaymentAccount[]> {
    try {
      return await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_active = true
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
  },

  async createPresetAccounts(siteId: string, operator: string): Promise<PaymentAccount[]> {
    const presetMethods = ['wechat', 'alipay', 'paypal'] as const;
    const results: PaymentAccount[] = [];

    for (const method of presetMethods) {
      const existing = await this.list(siteId, { method });
      if (existing.length > 0) {
        results.push(existing[0]);
        continue;
      }

      const input: CreateAccountInput = {
        account_type: undefined,
        payment_type: method === 'paypal' ? 'online_payment' : 'qr_code',
        payment_method: method,
        display_name_zh: method === 'wechat' ? '微信支付' : method === 'alipay' ? '支付宝' : 'PayPal',
        display_name_en: method === 'wechat' ? 'WeChat Pay' : method === 'alipay' ? 'Alipay' : 'PayPal',
        currency: ['USD', 'EUR', 'GBP', 'CNY'],
        is_default: false,
        is_verified: false,
      };

      const account = await this.create(siteId, input, operator);
      results.push(account);
    }

    return results;
  },

  async getVerifiedPayPalAccount(siteId: string): Promise<PaymentAccount | null> {
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND payment_method = 'paypal'
          AND is_active = true
          AND is_verified = true
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error('获取已验证 PayPal 账号失败:', error);
      throw new Error(`获取已验证 PayPal 账号失败: ${error.message}`);
    }
  },

  async getPresetAccount(
    siteId: string,
    method: 'wechat' | 'alipay' | 'paypal'
  ): Promise<PaymentAccount | null> {
    try {
      const rows = await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND payment_method = ${method}
          AND is_active = true
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      console.error(`获取 ${method} 账号失败:`, error);
      throw new Error(`获取 ${method} 账号失败: ${error.message}`);
    }
  },

  async getAllPresetAccounts(siteId: string): Promise<PaymentAccount[]> {
    try {
      return await sql<PaymentAccount[]>`
        SELECT * FROM public.payment_accounts
        WHERE site_id = ${siteId}
          AND is_active = true
          AND payment_method IN ('wechat', 'alipay', 'paypal')
        ORDER BY sort_order ASC
      `;
    } catch (error: any) {
      console.error('获取预设账号失败:', error);
      throw new Error(`获取预设账号失败: ${error.message}`);
    }
  },
};

export default accountService;