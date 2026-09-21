// app/api/payment/paypal/webhook/route.ts
// 注意：此路由在 /api/payment/ 下，不需要登录验证
import { NextRequest, NextResponse } from 'next/server';
import { paypalService } from '@/lib/payment/services/paypal.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = request.headers;

    // 验证 Webhook 签名（生产环境必须开启）
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (webhookId && process.env.NODE_ENV === 'production') {
      const isValid = await paypalService.verifyWebhookSignature(
        body,
        headers,
        webhookId
      );
      if (!isValid) {
        console.error('Webhook 签名验证失败');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const eventType = body.event_type;
    const resource = body.resource;

    console.log(`收到 PayPal Webhook: ${eventType}`);

    // 异步处理事件（不阻塞响应）
    setImmediate(() => {
      paypalService.handleWebhookEvent(eventType, resource).catch((err) => {
        console.error('处理 Webhook 事件失败:', err);
      });
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook 处理错误:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook 处理失败' },
      { status: 500 }
    );
  }
}