import { NextResponse } from 'next/server';
import { getCustomerByEmail, createCustomer, updateCustomer } from '@/lib/CRM/repository';
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

    // 检查是否已存在相同邮箱
    const existing = getCustomerByEmail(email);

    if (existing) {
      // 只更新订阅状态，如果国家为空则补上
      const updated = {
        ...existing,
        emailSubscribed: '已订阅' as const,
        ...(!existing.country && country !== 'Unknown' ? { country } : {}),
      };
      updateCustomer(updated);
      return NextResponse.json({ success: true, customerId: existing.id, updated: true });
    }

    // 创建新客户：阶段、等级、规模留空
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
    };
    createCustomer(newCustomer);
    return NextResponse.json({ success: true, customerId: newCustomer.id });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}