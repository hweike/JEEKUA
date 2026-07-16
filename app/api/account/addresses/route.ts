import { NextResponse } from 'next/server';
import { verifyCustomerToken, getAddressesByCustomer, createAddress } from '@/lib/account/server';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const addresses = await getAddressesByCustomer(payload.customerId);
  return NextResponse.json(addresses);
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const body = await request.json();
  const { recipient, phone, country_code, company, province, city, detail, is_default } = body;
  if (!recipient || !phone || !country_code || !detail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const addressData = {
    recipient,
    phone,
    country_code,
    company: company || '',
    province: province || '',
    city: city || '',
    district: '', // 可选字段，暂不使用
    detail,
    is_default: !!is_default,
  };
  try {
    const newAddress = await createAddress(payload.customerId, addressData);
    return NextResponse.json(newAddress, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/account/addresses error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}