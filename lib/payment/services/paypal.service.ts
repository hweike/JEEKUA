// lib/payment/services/paypal.service.ts
import { supabase } from '@/lib/supabase/client';
import type { PaymentAccount } from '../types/account';

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalCaptureResponse {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PENDING';
  amount: {
    currency_code: string;
    value: string;
  };
  payer: {
    email_address: string;
    payer_id: string;
  };
}

export const paypalService = {
  /**
   * 获取 PayPal Access Token
   */
  async getAccessToken(account: PaymentAccount): Promise<string> {
    const auth = Buffer.from(
      `${account.paypal_client_id}:${account.paypal_client_secret}`
    ).toString('base64');

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`获取 PayPal Token 失败: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  },

  /**
   * 创建 PayPal 支付订单
   */
  async createOrder(
    account: PaymentAccount,
    orderId: string,
    orderNo: string,
    currency: string,
    amount: number,
    items: Array<{
      name: string;
      price: number;
      quantity: number;
      sku?: string;
    }>,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ paypalOrderId: string; approvalUrl: string }> {
    const accessToken = await this.getAccessToken(account);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          description: `Order ${orderNo}`,
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: currency,
                value: items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2),
              },
            },
          },
          items: items.map((item) => ({
            name: item.name.substring(0, 127),
            sku: item.sku || '',
            quantity: item.quantity.toString(),
            unit_amount: {
              currency_code: currency,
              value: item.price.toFixed(2),
            },
          })),
          payee: {
            email_address: account.paypal_email,
          },
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`创建 PayPal 订单失败: ${error}`);
    }

    const data: PayPalOrderResponse = await response.json();

    // 查找 approval_url
    const approvalLink = data.links.find((link) => link.rel === 'approve');
    if (!approvalLink) {
      throw new Error('无法获取 PayPal 支付链接');
    }

    return {
      paypalOrderId: data.id,
      approvalUrl: approvalLink.href,
    };
  },

  /**
   * 查询 PayPal 订单状态
   */
  async getOrderStatus(account: PaymentAccount, paypalOrderId: string): Promise<string> {
    const accessToken = await this.getAccessToken(account);

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`查询 PayPal 订单状态失败: ${response.statusText}`);
    }

    const data = await response.json();
    return data.status;
  },

  /**
   * 捕获 PayPal 支付
   */
  async captureOrder(account: PaymentAccount, paypalOrderId: string): Promise<PayPalCaptureResponse> {
    const accessToken = await this.getAccessToken(account);

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`捕获 PayPal 支付失败: ${error}`);
    }

    const data = await response.json();

    // 提取关键信息
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      id: capture?.id || data.id,
      status: capture?.status || data.status,
      amount: capture?.amount || {
        currency_code: data.purchase_units?.[0]?.amount?.currency_code || 'USD',
        value: data.purchase_units?.[0]?.amount?.value || '0',
      },
      payer: {
        email_address: data.payer?.email_address || '',
        payer_id: data.payer?.payer_id || '',
      },
    };
  },

  /**
   * 验证 PayPal Webhook 签名
   */
  async verifyWebhookSignature(
    payload: any,
    headers: Headers,
    webhookId: string
  ): Promise<boolean> {
    // 获取 PayPal 账号（需要 webhook_id 对应的账号）
    const { data: account } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('paypal_webhook_id', webhookId)
      .eq('is_active', true)
      .single();

    if (!account) {
      console.error('未找到对应的 PayPal 账号配置');
      return false;
    }

    const accessToken = await this.getAccessToken(account);

    const authAlgo = headers.get('paypal-auth-algo') || '';
    const certUrl = headers.get('paypal-cert-url') || '';
    const transmissionId = headers.get('paypal-transmission-id') || '';
    const transmissionSig = headers.get('paypal-transmission-sig') || '';
    const transmissionTime = headers.get('paypal-transmission-time') || '';

    const verificationBody = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: payload,
    };

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationBody),
    });

    if (!response.ok) {
      console.error('验证 Webhook 签名失败:', response.statusText);
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  },

  /**
   * 处理 PayPal Webhook 事件
   */
  async handleWebhookEvent(eventType: string, resource: any): Promise<void> {
    // 保存 Webhook 日志
    await supabase
      .from('paypal_webhook_logs')
      .insert({
        event_id: resource.id || resource.order_id,
        event_type: eventType,
        paypal_order_id: resource.id || resource.order_id,
        payload: resource,
        processed: false,
      });

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePaymentDenied(resource);
        break;

      case 'CHECKOUT.ORDER.APPROVED':
        // 订单已批准，等待捕获
        console.log('订单已批准:', resource.id);
        break;

      default:
        console.log(`未处理的事件类型: ${eventType}`);
    }
  },

  /**
   * 处理支付完成事件
   */
  async handlePaymentCompleted(resource: any): Promise<void> {
    const paypalOrderId = resource.order_id || resource.id;

    // 查找对应的本地订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('paypal_order_id', paypalOrderId)
      .single();

    if (orderError || !order) {
      console.error('未找到对应的订单:', paypalOrderId);
      return;
    }

    // 如果已经支付，跳过
    if (order.status === 'paid') {
      console.log('订单已支付，跳过处理:', order.id);
      return;
    }

    // 更新订单状态
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'completed',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('更新订单状态失败:', updateError);
      return;
    }

    // 记录状态日志
    await supabase
      .from('order_status_logs')
      .insert({
        order_id: order.id,
        from_status: order.status,
        to_status: 'paid',
        operator: 'paypal_webhook',
        note: `PayPal 支付完成 (${paypalOrderId})`,
      });

    // 更新 Webhook 日志处理状态
    await supabase
      .from('paypal_webhook_logs')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        order_id: order.id,
      })
      .eq('paypal_order_id', paypalOrderId);

    console.log('订单支付完成:', order.id, paypalOrderId);
  },

  /**
   * 处理支付拒绝事件
   */
  async handlePaymentDenied(resource: any): Promise<void> {
    const paypalOrderId = resource.order_id || resource.id;

    const { data: order } = await supabase
      .from('orders')
      .select('id, status')
      .eq('paypal_order_id', paypalOrderId)
      .single();

    if (!order) {
      console.error('未找到对应的订单:', paypalOrderId);
      return;
    }

    // 更新订单状态为取消
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // 记录状态日志
    await supabase
      .from('order_status_logs')
      .insert({
        order_id: order.id,
        from_status: order.status,
        to_status: 'cancelled',
        operator: 'paypal_webhook',
        note: `PayPal 支付拒绝 (${paypalOrderId})`,
      });

    console.log('订单支付被拒绝:', order.id, paypalOrderId);
  },
};

export default paypalService;