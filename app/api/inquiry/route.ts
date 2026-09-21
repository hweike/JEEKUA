// app/api/inquiry/route.ts
import { NextResponse } from 'next/server';
import { createInquiryWithCustomer } from '@/lib/CRM/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      company,
      phone,
      message,
      productUrl,
      productId,
      productName,
      productSlug,
      productLocale, // 新增
    } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required' },
        { status: 400 }
      );
    }

    // 确定 product_id：优先使用 productId，否则用 productUrl 或 productName 作为备用
    const productIdentifier = productId || productUrl || productName || undefined;

    // 调用服务层，传递所有字段（包括新增的 locale 和 slug）
    const inquiry = await createInquiryWithCustomer({
      name: name || '',
      email,
      phone: phone || '',
      company: company || '',
      message,
      product_id: productIdentifier,
      product_locale: productLocale,   // 新增
      product_slug: productSlug,       // 新增
    });

    return NextResponse.json({ success: true, inquiry }, { status: 201 });
  } catch (error: any) {
    console.error('Public inquiry submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}