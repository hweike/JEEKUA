import { NextResponse } from 'next/server';
import { verifyCustomerToken, updateCustomer } from '@/lib/account/server';

export async function PUT(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const body = await request.json();
  const { email_subscribed } = body;

  if (typeof email_subscribed !== 'string' || !['已订阅', '未订阅'].includes(email_subscribed)) {
    return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
  }

  try {
    const updated = await updateCustomer(payload.customerId, { email_subscribed });
    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error('PUT /api/account/preferences error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}