import { NextResponse } from 'next/server';
import { generateCode, saveVerificationCode } from '@/lib/account/server';
import { sendVerificationCode } from '@/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const code = generateCode();
    // 统一使用 type='login'，不再区分注册
    await saveVerificationCode(email, code, 'login');
    await sendVerificationCode(email, code);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}