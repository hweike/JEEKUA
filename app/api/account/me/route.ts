import { NextResponse } from 'next/server';
import { verifyCustomerToken, getCustomerById, updateCustomer } from '@/lib/account/server';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const payload = await verifyCustomerToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const customer = await getCustomerById(payload.customerId);
  if (!customer) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json(customer);
}

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
  const { first_name, last_name, name, phone, country, country_code, company_name, address, stage, importance, scale, notes, website, flag } = body;
  try {
    const updated = await updateCustomer(payload.customerId, {
      first_name, last_name, name, phone, country, country_code, company_name, address, stage, importance, scale, notes, website, flag
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}