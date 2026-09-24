// app/api/admin/payment/paypal/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { getSiteId } from '@/lib/utils/request';

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, client_secret, webhook_id, account_id, action } = body;

    // ============================================================
    // 1. 处理"重置验证状态"操作
    // ============================================================
    if (action === 'reset') {
      if (!account_id) {
        return NextResponse.json(
          { success: false, error: '缺少 account_id 参数' },
          { status: 400 }
        );
      }

      const siteId = await getSiteId(request);

      try {
        await sql`
          UPDATE public.payment_accounts
          SET is_verified = false,
              updated_at = ${new Date().toISOString()}
          WHERE site_id = ${siteId}
            AND id = ${account_id}
        `;
      } catch (resetError: any) {
        console.error('重置验证状态失败:', resetError);
        return NextResponse.json(
          { success: false, error: '重置验证状态失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          is_verified: false,
          message: '验证状态已重置，请重新验证',
        },
      });
    }

    // ============================================================
    // 2. 处理"验证连接"操作
    // ============================================================

    if (!client_id || !client_secret) {
      return NextResponse.json(
        { success: false, error: '请提供 Client ID 和 Client Secret' },
        { status: 400 }
      );
    }

    // 检查是否已认证
    if (account_id) {
      const siteId = await getSiteId(request);
      let existingAccount: { is_verified: boolean | null } | undefined;
      try {
        const rows = await sql<{ is_verified: boolean | null }[]>`
          SELECT is_verified FROM public.payment_accounts
          WHERE site_id = ${siteId}
            AND id = ${account_id}
          LIMIT 1
        `;
        existingAccount = rows[0];
      } catch (fetchError: any) {
        console.error('查询账号失败:', fetchError);
      }

      if (existingAccount?.is_verified) {
        return NextResponse.json(
          {
            success: false,
            error: '该账号已验证通过。如需重新验证，请先点击"重置验证"按钮。',
            code: 'ALREADY_VERIFIED',
          },
          { status: 400 }
        );
      }
    }

    // 3. 获取 Access Token（核心验证）
    const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('PayPal Token 获取失败:', tokenData);
      return NextResponse.json(
        {
          success: false,
          error: tokenData.error_description || '获取 Access Token 失败，请检查 Client ID 和 Client Secret 是否正确',
        },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    // 4. 获取账户信息（可选）
    let accountInfo: any = null;
    try {
      const userInfoResponse = await fetch(`${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=paypal`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (userInfoResponse.ok) {
        accountInfo = await userInfoResponse.json();
      } else {
        console.warn('获取账户信息失败（不影响验证）:', await userInfoResponse.text());
      }
    } catch (error) {
      console.warn('获取账户信息异常（不影响验证）:', error);
    }

    // 5. 验证 Webhook（如果有）
    let webhookValid = false;
    if (webhook_id) {
      try {
        const webhookResponse = await fetch(
          `${PAYPAL_API_BASE}/v1/notifications/webhooks/${webhook_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        webhookValid = webhookResponse.ok;
      } catch (error) {
        console.warn('Webhook 验证异常:', error);
      }
    }

    // 6. 更新数据库验证状态
    let dbUpdateSuccess = false;
    if (account_id) {
      try {
        const siteId = await getSiteId(request);
        await sql`
          UPDATE public.payment_accounts
          SET is_verified = true,
              updated_at = ${new Date().toISOString()}
          WHERE site_id = ${siteId}
            AND id = ${account_id}
        `;
        dbUpdateSuccess = true;
      } catch (error) {
        console.error('更新验证状态异常:', error);
      }
    }

    // 7. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        access_token: accessToken,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        account: accountInfo ? {
          email: accountInfo.email,
          user_id: accountInfo.user_id,
          name: accountInfo.name,
          verified: accountInfo.verified || false,
        } : null,
        webhook_valid: webhookValid,
        environment: process.env.PAYPAL_ENV || 'sandbox',
        is_verified: true,
        db_updated: dbUpdateSuccess,
      },
    });

  } catch (error: any) {
    console.error('PayPal 验证失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '验证请求失败' },
      { status: 500 }
    );
  }
}