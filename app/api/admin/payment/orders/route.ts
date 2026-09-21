// app/api/admin/payment/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { getSiteId, getOperator } from '@/lib/utils/request';
import { VIEW_STATUS_MAP } from '@/lib/payment/constants';

export async function GET(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const searchParams = request.nextUrl.searchParams;
    
    const viewStatus = searchParams.get('status') || 'all';
    const keyword = searchParams.get('keyword') || '';
    const country = searchParams.get('country') || '';
    const createdBy = searchParams.get('created_by') || ''; // ✅ 新增：业务员筛选
    
    const mapping = VIEW_STATUS_MAP[viewStatus] || VIEW_STATUS_MAP['all'];
    
    const params: any = {
      site_id: siteId,
      keyword: keyword,
      country: country,
      created_by: createdBy, // ✅ 新增：传递业务员筛选
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      page_size: parseInt(searchParams.get('page_size') || '20', 10),
    };

    if (mapping.status) {
      params.status = mapping.status;
    }

    if (mapping.sent_status) {
      params.sent_status = mapping.sent_status;
    }
    
    const result = await orderService.listWithItems(params);
    
    let items = result.items;
    if (viewStatus === 'expired') {
      const now = new Date();
      items = items.filter((order: any) => {
        if (!order.expiry_date) return false;
        return new Date(order.expiry_date) < now;
      });
      result.total = items.length;
      result.total_pages = Math.ceil(items.length / result.page_size);
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...result,
        items,
      } 
    });
  } catch (error: any) {
    console.error('GET /admin/payment/orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取订单列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const siteId = await getSiteId(request);
    const body = await request.json();
    
    // ✅ 获取操作人信息
    let operator = await getOperator(request);
    
    // ✅ 如果 body 中有 created_by，且 operator 是默认值或为空，使用 body 中的值
    if (body.created_by && (!operator || operator === 'system' || operator === '系统用户')) {
      operator = body.created_by;
    }
    
    // ✅ 如果 operator 仍然为空，使用默认值
    if (!operator) {
      operator = '系统用户';
    }

    console.log('[POST /admin/payment/orders] 操作人:', operator);

    // ============================================================
    // 1. 验证必填字段
    // ============================================================
    const errors: string[] = [];

    if (!body.buyer_name?.trim()) {
      errors.push('买家名称不能为空');
    }
    if (!body.buyer_email?.trim()) {
      errors.push('买家邮箱不能为空');
    }
    
    const validItems = (body.items || []).filter((item: any) => item.product_name?.trim());
    if (validItems.length === 0) {
      errors.push('请至少添加一个商品');
    }

    // 检查商品数据完整性
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (item.price === undefined || item.price === null || item.price <= 0) {
        errors.push(`商品 "${item.product_name || '第' + (i + 1) + '个'}" 的单价不能为空或小于等于0`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`商品 "${item.product_name || '第' + (i + 1) + '个'}" 的数量不能为空或小于等于0`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors, error: errors[0] },
        { status: 400 }
      );
    }

    // ============================================================
    // 2. 创建订单 - 传递 operator 到 service
    // ============================================================
    const order = await orderService.create(siteId, body, operator);
    
    return NextResponse.json({ 
      success: true, 
      data: order,
      message: '订单创建成功' 
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /admin/payment/orders error:', error);

    // ============================================================
    // 3. 错误分类处理
    // ============================================================
    let errorMessage = error.message || '创建订单失败';
    let statusCode = 500;

    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      errorMessage = '订单号冲突，请稍后重试';
      statusCode = 409;
    } else if (error.code === '23503') {
      errorMessage = '关联数据不存在，请检查数据完整性';
      statusCode = 400;
    } else if (error.code === '23514') {
      errorMessage = '数据验证失败，请检查输入数据';
      statusCode = 400;
    } else if (error.code === '42501') {
      errorMessage = '没有权限执行此操作';
      statusCode = 403;
    } else if (error.code && typeof error.code === 'string') {
      errorMessage = `数据库错误: ${error.message}`;
      statusCode = 500;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: error.code || undefined,
        ...(process.env.NODE_ENV === 'development' && { 
          details: error.message,
          stack: error.stack 
        })
      },
      { status: statusCode }
    );
  }
}