import { NextResponse } from 'next/server';
import { getCustomerByEmailAndSource, createCustomer, updateCustomer } from '@/lib/CRM/repository';
import { generateId, getClientIp, getCountryFromIp } from '@/lib/CRM/utils';
import type { Customer } from '@/lib/CRM/types';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // 获取 IP 和国家
    const ip = getClientIp(request);
    let country = 'Unknown';
    try {
      country = await getCountryFromIp(ip);
    } catch (err) {
      console.error('获取国家失败:', err);
    }

    // 仅查找注册用户（source='register'）
    const existing = await getCustomerByEmailAndSource(email, 'register');

    if (existing) {
      // 更新订阅状态，保留 source='register' 不变
      const updated = {
        ...existing,
        emailSubscribed: '已订阅' as const,
        ...(!existing.country && country !== 'Unknown' ? { country } : {}),
      };
      await updateCustomer(updated);
      return NextResponse.json({ success: true, customerId: existing.id, updated: true });
    }

    // 创建新客户（注册用户，source='register'）
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const newCustomer: Customer = {
      id: generateId(),
      name: '',
      country: country,
      email: email,
      phone: '',
      whatsapp: '',
      companyName: '',
      address: '',
      stage: undefined,
      importance: undefined,
      scale: undefined,
      notes: '通过邮件订阅创建',
      website: '',
      flag: '',
      emailSubscribed: '已订阅',
      createdAt: now,
      source: 'register', // 注册用户
    };
    await createCustomer(newCustomer);
    return NextResponse.json({ success: true, customerId: newCustomer.id });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}