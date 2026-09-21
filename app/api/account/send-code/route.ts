// app/api/account/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCode, saveVerificationCode } from '@/lib/account/server';
import { getSettings } from '@/lib/Basicsettings/settings';
import { sendEmail } from '@/lib/email/mail';
import { generateLoginEmailHtml, generateLoginEmailSubject } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    // ✅ 从请求体获取 email 和 locale
    const { email, locale } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // ✅ 使用前端传递的 locale，默认 'en'
    const finalLocale = locale || 'en';

    const code = generateCode();
    await saveVerificationCode(email, code, 'login');

    // 获取站点名称
    const settings = await getSettings();
    const siteName = settings?.siteName || settings?.site_name || 'System notification';

    // ✅ 生成邮件内容（使用前端传递的 locale）
    const subject = await generateLoginEmailSubject({ code, siteName, locale: finalLocale });
    const html = await generateLoginEmailHtml({ code, siteName, locale: finalLocale });

    // 发送邮件
    await sendEmail({
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[send-code] 发送验证码失败:', error);
    return NextResponse.json(
      { error: error.message || '发送验证码失败，请稍后重试' },
      { status: 500 }
    );
  }
}