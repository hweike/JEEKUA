// lib/payment/services/account.service.ts
import { supabase } from '@/lib/supabase/client';
import { generateShareToken } from '../utils/share-token';
import type { 
  PaymentAccount, 
  CreateAccountInput, 
  UpdateAccountInput,
  AccountType,
  AccountFilters 
} from '../types/account';

export const accountService = {
  /**
   * 获取账号列表
   * ✅ 修复：正确处理 account_type 为 NULL 的情况
   */
  async list(siteId: string, filters?: AccountFilters): Promise<PaymentAccount[]> {
    let query = supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('sort_order');

    if (filters?.type) {
      query = query.eq('payment_type', filters.type);
    }
    if (filters?.method) {
      // 支持逗号分隔的多个值: 'wechat,alipay'
      if (filters.method.includes(',')) {
        const methods = filters.method.split(',').map(m => m.trim());
        query = query.in('payment_method', methods);
      } else {
        query = query.eq('payment_method', filters.method);
      }
    }
    // ✅ 修复：正确处理 account_type 为 NULL 的情况
    if (filters?.account_type) {
      // 如果查询 'null' 字符串，表示查询预设账号（account_type IS NULL）
      if (filters.account_type === 'null' || filters.account_type === 'NULL') {
        query = query.is('account_type', null);
      } else {
        query = query.eq('account_type', filters.account_type);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
    return data || [];
  },

  /**
   * 获取账号详情
   */
  async getById(siteId: string, id: string): Promise<PaymentAccount> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('id', id)
      .single();

    if (error) {
      console.error('获取账号详情失败:', error);
      throw new Error(`获取账号详情失败: ${error.message}`);
    }
    return data;
  },

  /**
   * 获取默认账号
   */
  async getDefault(siteId: string): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('获取默认账号失败:', error);
      throw new Error(`获取默认账号失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * 创建账号
   */
  async create(siteId: string, input: CreateAccountInput, operator: string): Promise<PaymentAccount> {
    // 如果设为默认，先取消其他默认
    if (input.is_default) {
      const { error: updateError } = await supabase
        .from('payment_accounts')
        .update({ is_default: false })
        .eq('site_id', siteId)
        .eq('is_default', true);

      if (updateError) {
        console.error('取消默认账号失败:', updateError);
        throw new Error(`取消默认账号失败: ${updateError.message}`);
      }
    }

    // 构建插入数据
    const insertData: any = {
      site_id: siteId,
      // ✅ account_type 只在 TT 银行账号时需要，预设账号可以为 null
      account_type: input.account_type || null,
      payment_type: input.payment_type,
      payment_method: input.payment_method,
      display_name_zh: input.display_name_zh || '',
      display_name_en: input.display_name_en || '',
      currency: input.currency || ['USD'],
      is_default: input.is_default || false,
      is_active: true,
      sort_order: 0,
      // ✅ 添加 is_verified 字段，默认为 false
      is_verified: input.is_verified || false,
      // TT 银行字段
      beneficiary_name: input.beneficiary_name || '',
      beneficiary_account: input.beneficiary_account || '',
      country_region: input.country_region || '',
      swift_code: input.swift_code || '',
      beneficiary_address: input.beneficiary_address || '',
      beneficiary_bank: input.beneficiary_bank || '',
      beneficiary_bank_address: input.beneficiary_bank_address || '',
      bank_code: input.bank_code || '',
      branch_code: input.branch_code || '',
      iban: input.iban || '',
      attention: input.attention || '',
      intermediary_bank: input.intermediary_bank || '',
      // 微信/支付宝 字段
      account_holder: input.account_holder || '',
      account_identifier: input.account_identifier || '',
      qr_code_image: input.qr_code_image || '',
      remark: input.remark || '',
      // PayPal 字段
      paypal_email: input.paypal_email || '',
      paypal_client_id: input.paypal_client_id || '',
      paypal_client_secret: input.paypal_client_secret || '',
      paypal_webhook_id: input.paypal_webhook_id || '',
    };

    const { data, error } = await supabase
      .from('payment_accounts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('创建账号失败:', error);
      throw new Error(`创建账号失败: ${error.message}`);
    }
    return data;
  },

  /**
   * 更新账号
   */
  async update(siteId: string, id: string, input: UpdateAccountInput, operator: string): Promise<PaymentAccount> {
    // 如果设为默认，先取消其他默认（排除自己）
    if (input.is_default) {
      const { error: updateError } = await supabase
        .from('payment_accounts')
        .update({ is_default: false })
        .eq('site_id', siteId)
        .eq('is_default', true)
        .not('id', 'eq', id);

      if (updateError) {
        console.error('取消默认账号失败:', updateError);
        throw new Error(`取消默认账号失败: ${updateError.message}`);
      }
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // 只更新传入的字段
    if (input.account_type !== undefined) updateData.account_type = input.account_type;
    if (input.payment_type !== undefined) updateData.payment_type = input.payment_type;
    if (input.payment_method !== undefined) updateData.payment_method = input.payment_method;
    if (input.display_name_zh !== undefined) updateData.display_name_zh = input.display_name_zh;
    if (input.display_name_en !== undefined) updateData.display_name_en = input.display_name_en;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.is_default !== undefined) updateData.is_default = input.is_default;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    // ✅ 添加 is_verified 字段更新
    if (input.is_verified !== undefined) updateData.is_verified = input.is_verified;

    // TT 银行字段
    if (input.beneficiary_name !== undefined) updateData.beneficiary_name = input.beneficiary_name;
    if (input.beneficiary_account !== undefined) updateData.beneficiary_account = input.beneficiary_account;
    if (input.country_region !== undefined) updateData.country_region = input.country_region;
    if (input.swift_code !== undefined) updateData.swift_code = input.swift_code;
    if (input.beneficiary_address !== undefined) updateData.beneficiary_address = input.beneficiary_address;
    if (input.beneficiary_bank !== undefined) updateData.beneficiary_bank = input.beneficiary_bank;
    if (input.beneficiary_bank_address !== undefined) updateData.beneficiary_bank_address = input.beneficiary_bank_address;
    if (input.bank_code !== undefined) updateData.bank_code = input.bank_code;
    if (input.branch_code !== undefined) updateData.branch_code = input.branch_code;
    if (input.iban !== undefined) updateData.iban = input.iban;
    if (input.attention !== undefined) updateData.attention = input.attention;
    if (input.intermediary_bank !== undefined) updateData.intermediary_bank = input.intermediary_bank;

    // 微信/支付宝 字段
    if (input.account_holder !== undefined) updateData.account_holder = input.account_holder;
    if (input.account_identifier !== undefined) updateData.account_identifier = input.account_identifier;
    if (input.qr_code_image !== undefined) updateData.qr_code_image = input.qr_code_image;
    if (input.remark !== undefined) updateData.remark = input.remark;

    // PayPal 字段
    if (input.paypal_email !== undefined) updateData.paypal_email = input.paypal_email;
    if (input.paypal_client_id !== undefined) updateData.paypal_client_id = input.paypal_client_id;
    if (input.paypal_client_secret !== undefined) updateData.paypal_client_secret = input.paypal_client_secret;
    if (input.paypal_webhook_id !== undefined) updateData.paypal_webhook_id = input.paypal_webhook_id;

    const { data, error } = await supabase
      .from('payment_accounts')
      .update(updateData)
      .eq('site_id', siteId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新账号失败:', error);
      throw new Error(`更新账号失败: ${error.message}`);
    }
    return data;
  },

  /**
   * ✅ 新增：更新验证状态
   */
  async updateVerificationStatus(siteId: string, id: string, isVerified: boolean): Promise<void> {
    const { error } = await supabase
      .from('payment_accounts')
      .update({ 
        is_verified: isVerified,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) {
      console.error('更新验证状态失败:', error);
      throw new Error(`更新验证状态失败: ${error.message}`);
    }
  },

  /**
   * 删除账号（软删除）
   */
  async delete(siteId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('payment_accounts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) {
      console.error('删除账号失败:', error);
      throw new Error(`删除账号失败: ${error.message}`);
    }
  },

  /**
   * 设为默认
   */
  async setDefault(siteId: string, id: string): Promise<void> {
    // 先取消当前默认
    const { error: clearError } = await supabase
      .from('payment_accounts')
      .update({ is_default: false })
      .eq('site_id', siteId)
      .eq('is_default', true);

    if (clearError) {
      console.error('取消默认账号失败:', clearError);
      throw new Error(`取消默认账号失败: ${clearError.message}`);
    }

    // 设置新的默认
    const { error } = await supabase
      .from('payment_accounts')
      .update({ is_default: true })
      .eq('site_id', siteId)
      .eq('id', id);

    if (error) {
      console.error('设置默认账号失败:', error);
      throw new Error(`设置默认账号失败: ${error.message}`);
    }
  },

  /**
   * 获取复制文本（格式化）
   */
  async getCopyText(siteId: string, id: string): Promise<string> {
    const account = await this.getById(siteId, id);
    
    // ✅ 使用 display_name_zh 或 display_name_en，如果都为空则显示 'Account'
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
      // ✅ 添加验证状态显示
      text += `验证状态: ${account.is_verified ? '✅ 已验证' : '❌ 未验证'}\n`;
    }
    
    if (account.currency && Array.isArray(account.currency) && account.currency.length > 0) {
      text += `\nSupported Currencies: ${account.currency.join(', ')}\n`;
    }
    
    return text;
  },

  /**
   * 生成分享链接
   */
  async generateShareLink(siteId: string, id: string): Promise<{ token: string; url: string }> {
  const token = generateShareToken();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const { error } = await supabase
    .from('payment_accounts')
    .update({ 
      share_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', siteId)
    .eq('id', id);

  if (error) {
    console.error('生成分享链接失败:', error);
    throw new Error(`生成分享链接失败: ${error.message}`);
  }

  // ✅ 默认使用英文 locale
  return {
    token,
    url: `${baseUrl}/en/payment/account/share/${token}`,
  };
  },

  /**
   * 通过分享 Token 获取账号（公开访问）
   */
  async getByShareToken(token: string): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('share_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('获取分享账号失败:', error);
      throw new Error(`获取分享账号失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * 根据账号类型获取账号列表
   */
  async listByType(siteId: string, accountType: AccountType): Promise<PaymentAccount[]> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('account_type', accountType)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
    return data || [];
  },

  /**
   * 根据货币获取匹配的账号
   */
  async listByCurrency(siteId: string, currency: string): Promise<PaymentAccount[]> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .contains('currency', [currency])
      .order('sort_order');

    if (error) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
    return data || [];
  },

  /**
   * 获取默认账号（按货币匹配）
   */
  async getDefaultByCurrency(siteId: string, currency: string): Promise<PaymentAccount | null> {
    // 先找默认账号中支持该货币的
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_default', true)
      .eq('is_active', true)
      .contains('currency', [currency])
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('获取默认账号失败:', error);
      throw new Error(`获取默认账号失败: ${error.message}`);
    }
    if (data) return data;

    // 如果没有找到，返回第一个支持该货币的账号
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .contains('currency', [currency])
      .order('sort_order')
      .limit(1)
      .maybeSingle();

    if (fallbackError && fallbackError.code !== 'PGRST116') {
      console.error('获取账号失败:', fallbackError);
      throw new Error(`获取账号失败: ${fallbackError.message}`);
    }
    return fallbackData || null;
  },

  /**
   * 批量更新账号排序
   */
  async updateSortOrder(siteId: string, ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from('payment_accounts')
        .update({ 
          sort_order: i, 
          updated_at: new Date().toISOString() 
        })
        .eq('site_id', siteId)
        .eq('id', ids[i]);
      
      if (error) {
        console.error(`更新排序失败 (id: ${ids[i]}):`, error);
        throw new Error(`更新排序失败: ${error.message}`);
      }
    }
  },

  /**
   * 获取站点所有活跃账号
   */
  async getAllActive(siteId: string): Promise<PaymentAccount[]> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('获取账号列表失败:', error);
      throw new Error(`获取账号列表失败: ${error.message}`);
    }
    return data || [];
  },

  /**
   * 批量创建预设账号（微信/支付宝/PayPal）
   * account_type 设为 null，因为预设账号不需要此字段
   */
  async createPresetAccounts(siteId: string, operator: string): Promise<PaymentAccount[]> {
    const presetMethods = ['wechat', 'alipay', 'paypal'] as const;
    const results: PaymentAccount[] = [];

    for (const method of presetMethods) {
      // 检查是否已存在
      const existing = await this.list(siteId, { method });
      if (existing.length > 0) {
        results.push(existing[0]);
        continue;
      }

      // 创建预设账号 - account_type 设为 undefined
      const input: CreateAccountInput = {
        account_type: undefined,  // ✅ 预设账号不需要 account_type
        payment_type: method === 'paypal' ? 'online_payment' : 'qr_code',
        payment_method: method,
        display_name_zh: method === 'wechat' ? '微信支付' : method === 'alipay' ? '支付宝' : 'PayPal',
        display_name_en: method === 'wechat' ? 'WeChat Pay' : method === 'alipay' ? 'Alipay' : 'PayPal',
        currency: ['USD', 'EUR', 'GBP', 'CNY'],
        is_default: false,
        // ✅ 预设账号默认未验证
        is_verified: false,
      };

      const account = await this.create(siteId, input, operator);
      results.push(account);
    }

    return results;
  },

  /**
   * ✅ 新增：获取已验证的 PayPal 账号
   */
  async getVerifiedPayPalAccount(siteId: string): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('payment_method', 'paypal')
      .eq('is_active', true)
      .eq('is_verified', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('获取已验证 PayPal 账号失败:', error);
      throw new Error(`获取已验证 PayPal 账号失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * ✅ 新增：获取预设账号（微信/支付宝/PayPal）
   */
  async getPresetAccount(siteId: string, method: 'wechat' | 'alipay' | 'paypal'): Promise<PaymentAccount | null> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('payment_method', method)
      .eq('is_active', true)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error(`获取 ${method} 账号失败:`, error);
      throw new Error(`获取 ${method} 账号失败: ${error.message}`);
    }
    return data || null;
  },

  /**
   * ✅ 新增：获取所有预设账号（微信/支付宝/PayPal）
   */
  async getAllPresetAccounts(siteId: string): Promise<PaymentAccount[]> {
    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .in('payment_method', ['wechat', 'alipay', 'paypal'])
      .order('sort_order');

    if (error) {
      console.error('获取预设账号失败:', error);
      throw new Error(`获取预设账号失败: ${error.message}`);
    }
    return data || [];
  },
};

export default accountService;