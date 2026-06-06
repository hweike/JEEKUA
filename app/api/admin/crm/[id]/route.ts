import { NextResponse } from 'next/server';
import { getCustomerById, updateCustomer, deleteCustomer } from '@/lib/CRM/repository';
import type { Customer } from '@/lib/CRM/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = await getCustomerById(id); // 添加 await
  if (!customer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(customer);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const existing = await getCustomerById(id); // 添加 await
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 合并更新，保留未提供的字段为原值
  const updated: Customer = {
    ...existing,
    ...body,
    id, // 确保 id 不变
  };
  await updateCustomer(updated); // 添加 await
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getCustomerById(id); // 添加 await
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await deleteCustomer(id); // 添加 await
  return NextResponse.json({ success: true });
}