// app/api/account/inquiries/[id]/replies/route.ts
import { NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/account/server';
import sql from '@/lib/db/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 验证 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyCustomerToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. 解析 id
    const { id } = await params;
    const inquiryId = Number(id);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // 3. 解析请求体
    const body = await request.json();
    const { content } = body;
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    // 4. 验证询盘归属并获取客户信息
    let inquiry: { customer_id: string; email: string | null; name: string | null } | undefined;
    try {
      const rows = await sql<{ customer_id: string; email: string | null; name: string | null }[]>`
        SELECT customer_id, email, name FROM public.inquiries
        WHERE id = ${inquiryId}
          AND customer_id = ${payload.customerId}
        LIMIT 1
      `;
      inquiry = rows[0];
    } catch (inqErr: any) {
      console.error('Inquiry fetch error:', inqErr);
    }

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found or unauthorized' }, { status: 404 });
    }

    // 5. 插入回复
    let reply: any;
    try {
      const rows = await sql<any[]>`
        INSERT INTO public.inquiry_replies (
          inquiry_id, site_id, sender_type, sender_email, sender_name,
          customer_id, content, is_internal, created_at
        ) VALUES (
          ${inquiryId}, ${'000001'}, 'user',
          ${inquiry.email || 'user@example.com'},
          ${inquiry.name || '用户'},
          ${payload.customerId}, ${content.trim()}, false,
          ${new Date().toISOString()}
        )
        RETURNING *
      `;
      reply = rows[0];
    } catch (repErr: any) {
      console.error('Insert reply error:', repErr);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    if (!reply) {
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    // 6. 更新主表的 updated_at
    try {
      await sql`
        UPDATE public.inquiries
        SET updated_at = ${new Date().toISOString()}
        WHERE id = ${inquiryId}
      `;
    } catch {}

    return NextResponse.json({ success: true, reply }, { status: 201 });
  } catch (error) {
    console.error('POST /api/account/inquiries/[id]/replies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}