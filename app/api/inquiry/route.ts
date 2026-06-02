import { NextResponse } from 'next/server';
import { saveInquiry } from '@/lib/inquiries';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message, relatedProduct, productUrl } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await saveInquiry({
      name,
      email,
      company,
      phone,
      message,
      relatedProduct,
      productUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('询盘保存失败:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}