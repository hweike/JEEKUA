// app/api/account/inquiries/[id]/route.ts
import { NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/account/server';
import sql from '@/lib/db/admin';

export async function GET(
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

    // 3. 查询询盘（同时验证所有权）
    let inquiry: any;
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.inquiries
        WHERE id = ${inquiryId}
          AND customer_id = ${payload.customerId}
        LIMIT 1
      `;
      inquiry = rows[0];
    } catch (inqErr: any) {
      console.error('Inquiry fetch error:', inqErr);
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    if (!inquiry) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    // 4. 查询回复
    let replies: any[] = [];
    try {
      replies = await sql<any[]>`
        SELECT * FROM public.inquiry_replies
        WHERE inquiry_id = ${inquiryId}
        ORDER BY created_at ASC
      `;
    } catch (repErr: any) {
      console.error('Replies fetch error:', repErr);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    return NextResponse.json({ inquiry, replies });
  } catch (error) {
    console.error('GET /api/account/inquiries/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}