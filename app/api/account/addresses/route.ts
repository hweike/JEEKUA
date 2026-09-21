import { NextResponse } from 'next/server';
import { verifyCustomerToken, getAddressesByCustomer, createAddress } from '@/lib/account/server';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyCustomerToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  try {
    const addresses = await getAddressesByCustomer(payload.customerId);
    return NextResponse.json(addresses);
  } catch (error: any) {
    console.error('GET addresses error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await verifyCustomerToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { recipient, phone, country_code, company, province, city, detail, is_default } = body;
  if (!recipient || !phone || !country_code || !detail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // 构建符合 Address 类型的对象，使用 isDefault 字段
  const addressData = {
    recipient,
    phone,
    country_code,
    company: company || '',
    province: province || '',
    city: city || '',
    district: '', // 如有需要可从 body 获取
    detail,
    isDefault: !!is_default, // 映射为 isDefault
  };

  try {
    const newAddress = await createAddress(payload.customerId, addressData);
    return NextResponse.json(newAddress, { status: 201 });
  } catch (error: any) {
    console.error('POST address error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}