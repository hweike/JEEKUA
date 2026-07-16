import { NextResponse } from 'next/server';
import { getAllCustomers, createCustomer } from '@/lib/CRM/repository';
import { generateId } from '@/lib/CRM/utils';
import type { Customer } from '@/lib/CRM/types';

export async function GET() {
  try {
    const customers = await getAllCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    console.error('GET /api/admin/crm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCustomer: Customer = {
      id: generateId(),
      createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ...body,
      source: 'manual', // 强制设为手动创建
    };
    await createCustomer(newCustomer);
    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/crm error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}