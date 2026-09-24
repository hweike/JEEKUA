// app/api/payment/account/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }  // ✅ 改为 Promise
) {
  try {
    // ✅ 使用 await 解包
    const { token } = await params;
    const account = await accountService.getByShareToken(token);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or expired' },
        { status: 404 }
      );
    }

    // 返回公开信息（字段需要与前端使用的字段名一致）
    return NextResponse.json({
      success: true,
      data: {
        // ✅ 使用正确的字段名（原代码用了 display_name，但数据库中可能是 display_name_zh/display_name_en）
        id: account.id,
        site_id: account.site_id,
        account_type: account.account_type,
        payment_type: account.payment_type,
        payment_method: account.payment_method,
        display_name_zh: account.display_name_zh,
        display_name_en: account.display_name_en,
        currency: account.currency,
        is_active: account.is_active,
        is_default: account.is_default,
        sort_order: account.sort_order,
        // TT 银行信息
        beneficiary_name: account.beneficiary_name,
        beneficiary_account: account.beneficiary_account,
        swift_code: account.swift_code,
        iban: account.iban,
        country_region: account.country_region,
        beneficiary_bank: account.beneficiary_bank,
        beneficiary_address: account.beneficiary_address,
        beneficiary_bank_address: account.beneficiary_bank_address,
        bank_code: account.bank_code,
        branch_code: account.branch_code,
        attention: account.attention,
        intermediary_bank: account.intermediary_bank,
        // 微信/支付宝信息
        account_holder: account.account_holder,
        account_identifier: account.account_identifier,
        qr_code_image: account.qr_code_image,
        remark: account.remark,
        // PayPal 信息
        paypal_email: account.paypal_email,
        is_verified: account.is_verified,
      },
    });
  } catch (error: any) {
    console.error('Share account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get account' },
      { status: 500 }
    );
  }
}