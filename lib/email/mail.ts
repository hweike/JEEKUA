// lib/email/mail.ts
import { Resend } from 'resend';
import { getSettings } from '@/lib/Basicsettings/settings';

// ============================================================
// 邮件发送核心配置
// ============================================================

// 配置缓存（带 TTL）
let cachedSettings: any = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟缓存

async function getMailConfig() {
  const now = Date.now();
  if (!cachedSettings || (now - cacheTime) > CACHE_TTL) {
    cachedSettings = await getSettings();
    cacheTime = now;
  }
  return {
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
    fromName: cachedSettings?.siteName || cachedSettings?.site_name || '系统通知',
  };
}

// ============================================================
// 通用发件函数（支持附件）
// ============================================================

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    url?: string;
  }>;
}

export interface SendEmailResult {
  id: string;
}

export async function sendEmail({ to, subject, html, replyTo, attachments }: SendEmailParams): Promise<SendEmailResult> {
  const config = await getMailConfig();

  // 🔑 检查是否配置了有效的 API Key
  const apiKey = process.env.RESEND_API_KEY;
  const hasValidApiKey = apiKey && apiKey.startsWith('re_') && apiKey.length > 10;

  // 没有有效 API Key：只打印日志
  if (!hasValidApiKey) {
    console.log(`📧 [邮件] ${to} - ${subject}`);
    console.log(`📧 [发件人] ${config.fromName} <${config.fromEmail}>`);
    console.log(`📧 [内容] ${html}`);
    if (attachments) {
      console.log(`📎 [附件] ${attachments.map(a => a.filename).join(', ')}`);
    }
    console.log(`⚠️ 未配置有效的 RESEND_API_KEY，邮件未实际发送`);
    return { id: 'mock-mode' };
  }

  // 有有效 API Key：真正发送
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: `${config.fromName} <${config.fromEmail}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    reply_to: replyTo,
    attachments: attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      path: att.path,
      url: att.url,
    })),
  });

  if (error) {
    console.error('Resend 发送失败:', error);
    throw new Error(error.message);
  }

  console.log(`✅ 邮件已发送, ID: ${data?.id}`);
  return { id: data?.id || 'unknown' };
}

// ============================================================
// 以下是保留的注释内容（Nodemailer 备选方案）
// ============================================================

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