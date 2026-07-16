import { NextResponse } from 'next/server';
import { verifyCustomerToken, getAddressById, updateAddress, deleteAddress } from '@/lib/account/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const address = await getAddressById(Number(id), payload.customerId);
  if (!address) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  }
  return NextResponse.json(address);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    detail,
    is_default: !!is_default,
  };
  try {
    const updated = await updateAddress(Number(id), payload.customerId, addressData);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PUT /api/account/addresses/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  try {
    await deleteAddress(Number(id), payload.customerId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/account/addresses/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}