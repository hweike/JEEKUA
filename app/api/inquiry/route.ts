// app/api/inquiry/route.ts
import { NextResponse } from 'next/server';
import { createInquiryWithCustomer } from '@/lib/CRM/repository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, phone, message, productUrl } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required' },
        { status: 400 }
      );
    }

    const inquiry = await createInquiryWithCustomer({
      name: name || '',
      email,
      phone: phone || '',
      company: company || '',
      message,
      product_id: productUrl || undefined,
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