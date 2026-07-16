import { NextResponse } from 'next/server';
import { verifyCode, getCustomerByEmailAndSource, createCustomer, generateCustomerToken, updateLastLogin } from '@/lib/account/server';
import { getClientIp, getCountryFromIp } from '@/lib/CRM/utils';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 验证码校验（固定 type='login'）
    const isValid = await verifyCode(email, code, 'login');
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    // 仅查询注册用户（source='register'）
    let customer = await getCustomerByEmailAndSource(email, 'register');
    if (!customer) {
      // 不存在则自动注册（source='register'）
      const ip = getClientIp(request);
      let countryCode = '';
      try {
        const country = await getCountryFromIp(ip);
        if (country && country.length === 2) countryCode = country;
      } catch {}
      customer = await createCustomer(email, countryCode, '', '', 'register');
    }

    await updateLastLogin(customer.id);
    const token = await generateCustomerToken(customer.id);
    return NextResponse.json({ token, customer: { id: customer.id, email: customer.email, first_name: customer.first_name, last_name: customer.last_name } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}