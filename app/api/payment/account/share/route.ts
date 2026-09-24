// app/api/payment/accounts/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';

/**
 * ✅ 公开的收款账号列表 API
 * 供分享页面使用，不需要管理员认证
 * 只返回公开信息（不包含敏感字段）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id') || '000001';
    
    // ✅ 获取所有活跃账号
    const accounts = await accountService.getAllActive(siteId);
    
    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    
    // ✅ 只返回公开字段（过滤敏感信息）
    const publicAccounts = accounts.map(a => ({
      id: a.id,
      site_id: a.site_id,
      account_type: a.account_type,
      payment_type: a.payment_type,
      payment_method: a.payment_method,
      display_name_zh: a.display_name_zh,
      display_name_en: a.display_name_en,
      currency: a.currency,
      is_default: a.is_default,
      sort_order: a.sort_order,
      // TT 银行字段
      beneficiary_name: a.beneficiary_name,
      beneficiary_account: a.beneficiary_account,
      country_region: a.country_region,
      swift_code: a.swift_code,
      beneficiary_address: a.beneficiary_address,
      beneficiary_bank: a.beneficiary_bank,
      beneficiary_bank_address: a.beneficiary_bank_address,
      bank_code: a.bank_code,
      branch_code: a.branch_code,
      iban: a.iban,
      attention: a.attention,
      intermediary_bank: a.intermediary_bank,
      // 微信/支付宝字段
      account_holder: a.account_holder,
      account_identifier: a.account_identifier,
      qr_code_image: a.qr_code_image,
      remark: a.remark,
      // PayPal 字段
      paypal_email: a.paypal_email,
      is_verified: a.is_verified,
    }));
    
    return NextResponse.json({
      success: true,
      data: publicAccounts,
    });
  } catch (error: any) {
    console.error('[API] 获取公开账号列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取失败' },
      { status: 500 }
    );
  }
}