// app/api/admin/payment/orders/[id]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { getSiteId, getOperator } from '@/lib/utils/request';
import { getBaseUrl, getDefaultLocale } from '@/lib/utils/url';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    // ✅ 获取 operator（优先从 body 获取，否则从请求头获取）
    let operator: string;
    try {
      const bodyData = await request.clone().json();
      operator = bodyData.operator || await getOperator(request) || 'system';
    } catch {
      operator = await getOperator(request) || 'system';
    }
    
    // ✅ 获取 body（用于其他参数）
    let body: Record<string, any> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: '订单ID不能为空' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: '缺少 action 参数' },
        { status: 400 }
      );
    }

    switch (action) {
      // ============================================================
      // ✅ 提交订单（草稿 → 正式订单，发送状态变更为已发送）
      // ============================================================
      case 'submit': {
        const baseUrl = getBaseUrl(request);
        const locale = getDefaultLocale(request);
        
        console.log('[actions] submit - baseUrl:', baseUrl, 'locale:', locale);
        
        try {
          // ✅ 设置超时控制
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('提交超时，请稍后查看订单状态')), 30000);
          });
          
          const submitPromise = orderService.submit(siteId, id, operator, {
            baseUrl,
            locale,
          });
          
          const submitResult = await Promise.race([submitPromise, timeoutPromise]) as Awaited<typeof submitPromise>;
          
          console.log('[actions] submit 成功, shareUrl:', submitResult.shareUrl);
          
          return NextResponse.json({
            success: true,
            data: submitResult,
            message: '订单已提交并发送给客户'
          });
        } catch (submitError: any) {
          console.error('[actions] submit 失败:', submitError);
          
          // ✅ 如果是超时错误，但订单可能已提交成功，返回部分成功
          if (submitError.message?.includes('超时')) {
            // 尝试获取订单状态，检查是否已提交
            try {
              const order = await orderService.getBasicInfo(siteId, id);
              if (order.status === 'formal' && (order as any).sent_status === 'sent') {
                return NextResponse.json({
                  success: true,
                  data: { order, shareUrl: null },
                  message: '订单已提交，但生成分享链接超时，请稍后重试'
                });
              }
            } catch (checkError) {
              // 忽略检查错误
            }
          }
          
          throw submitError;
        }
      }

      // ============================================================
      // ✅ 取消订单（draft/formal/paid → cancelled）
      // ============================================================
      case 'cancel': {
        const reason = body?.reason || searchParams.get('reason') || '用户取消';
        const cancelledOrder = await orderService.cancel(siteId, id, operator, reason);
        return NextResponse.json({
          success: true,
          data: cancelledOrder,
          message: '订单已取消'
        });
      }

      // ============================================================
      // ✅ 撤回订单（formal + sent_status=sent → draft + sent_status=unsent）
      // ============================================================
      case 'recall': {
        const recalledOrder = await orderService.recall(siteId, id, operator);
        return NextResponse.json({
          success: true,
          data: recalledOrder,
          message: '订单已撤回，回到草稿状态'
        });
      }

      // ============================================================
      // ✅ 确认收款（formal → paid）
      // ============================================================
      case 'confirm_payment': {
        const { depositAmount } = body;
        
        // ✅ 调用 orderService.confirmPayment 并传递预付款数据
        const result = await orderService.confirmPayment(siteId, id, operator, {
          depositAmount,
        });
        
        return NextResponse.json({
          success: true,
          data: result,
          message: '已确认收款'
        });
      }

      // ============================================================
      // ✅ 确认发货（paid → completed）
      // ============================================================
      case 'confirm_shipping': {
        const { shippingMethod, trackingNumber, carrierKey, carrierName, trackingImage } = body;
        
        const result = await orderService.confirmShipping(
          siteId,
          id,
          operator,
          {
            shippingMethod,
            trackingNumber,
            carrierKey,
            carrierName,
            trackingImage,
          }
        );
        
        return NextResponse.json({
          success: true,
          data: result,
          message: '已确认发货'
        });
      }

      // ============================================================
      // ✅ 复制账单链接（获取分享链接）
      // ============================================================
      case 'copy_link': {
        const order = await orderService.getById(siteId, id);
        if (!order || !order.share_token) {
          return NextResponse.json(
            { success: false, error: '订单不存在或未生成分享链接' },
            { status: 404 }
          );
        }
        
        const baseUrl = getBaseUrl(request);
        const locale = getDefaultLocale(request);
        const shareUrl = locale 
          ? `${baseUrl}/${locale}/payment/order/share/${order.share_token}`
          : `${baseUrl}/payment/order/share/${order.share_token}`;
        
        return NextResponse.json({
          success: true,
          data: { shareUrl },
          message: '获取链接成功'
        });
      }

      // ============================================================
      // ✅ 再来一单（复制订单创建新草稿）
      // ============================================================
      case 'reorder': {
        // ✅ operator 已从 body 或请求头获取
        const newOrder = await orderService.reorder(siteId, id, operator);
        return NextResponse.json({
          success: true,
          data: { 
            newOrderId: newOrder.id,
            orderNo: newOrder.order_no,
            contractNo: newOrder.contract_no,
          },
          message: '已创建新订单'
        });
      }

      // ============================================================
      // ✅ 复制订单（与再来一单相同）
      // ============================================================
      case 'duplicate': {
        // ✅ operator 已从 body 或请求头获取
        const newOrder = await orderService.reorder(siteId, id, operator);
        return NextResponse.json({
          success: true,
          data: { 
            newOrderId: newOrder.id,
            orderNo: newOrder.order_no,
            contractNo: newOrder.contract_no,
          },
          message: '已复制订单'
        });
      }

      // ============================================================
      // ✅ 下载PDF
      // ============================================================
      case 'download_pdf': {
        return NextResponse.json({
          success: true,
          data: { orderId: id },
          message: '正在下载'
        });
      }

      // ============================================================
      // ✅ 获取订单状态（用于前端判断操作按钮）
      // ============================================================
      case 'status': {
        const order = await orderService.getBasicInfo(siteId, id);
        return NextResponse.json({
          success: true,
          data: {
            status: order.status,
            sent_status: (order as any).sent_status,
          },
        });
      }

      default: {
        return NextResponse.json(
          { success: false, error: `未知操作: ${action}` },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    // ✅ 修复：使用 await params 获取 id
    const { id } = await params;
    console.error(`POST /api/admin/payment/orders/${id}/actions error:`, error);

    let errorMessage = error.message || '操作失败';
    let statusCode = 500;

    if (errorMessage.includes('只有草稿状态的订单可以提交') ||
        errorMessage.includes('当前状态无法取消') ||
        errorMessage.includes('只有已发送的正式订单可以撤回') ||
        errorMessage.includes('只有已付款的订单可以确认发货')) {
      statusCode = 400;
    } else if (errorMessage.includes('订单不存在') || errorMessage.includes('获取订单信息失败')) {
      statusCode = 404;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && {
          details: error.stack
        })
      },
      { status: statusCode }
    );
  }
}