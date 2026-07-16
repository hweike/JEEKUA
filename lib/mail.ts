// lib/mail.ts

/**
 * 发送验证码邮件
 * 开发环境：打印到控制台
 * 生产环境：请取消注释 SMTP 配置并配置环境变量
 */
export async function sendVerificationCode(email: string, code: string): Promise<void> {
  // 开发环境：打印到控制台（方便本地调试）
  console.log(`📧 [验证码] ${email} -> ${code}`);
  console.log(`请在 10 分钟内使用此验证码登录`);

  // ========== 生产环境配置示例（使用 Resend / Nodemailer） ==========
  // 如需启用，请取消注释并配置环境变量
  /*
  // 方案1：使用 Resend（推荐，简单易用）
  import { Resend } from 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to: email,
    subject: '登录验证码',
    html: `<p>您的验证码是：<strong>${code}</strong></p><p>有效期 10 分钟。</p>`,
  });
  */

  /*
  // 方案2：使用 Nodemailer（SMTP）
  import nodemailer from 'nodemailer';
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: '"Your App" <noreply@yourdomain.com>',
    to: email,
    subject: '登录验证码',
    text: `您的验证码是：${code}，有效期 10 分钟。`,
  });
  */
}