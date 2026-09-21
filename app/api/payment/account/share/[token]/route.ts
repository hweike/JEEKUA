// app/api/payment/account/share/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const account = await accountService.getByShareToken(params.token);

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found or expired' },
        { status: 404 }
      );
    }

    // 返回公开信息
    return NextResponse.json({
      success: true,
      data: {
        display_name: account.display_name,
        currency: account.currency,
        payment_method: account.payment_method,
        // TT 银行信息
        beneficiary_name: account.beneficiary_name,
        beneficiary_account: account.beneficiary_account,
        swift_code: account.swift_code,
        iban: account.iban,
        country_region: account.country_region,
        beneficiary_bank: account.beneficiary_bank,
        beneficiary_bank_address: account.beneficiary_bank_address,
        bank_code: account.bank_code,
        branch_code: account.branch_code,
        attention: account.attention,
        // PayPal 信息
        paypal_email: account.paypal_email,
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