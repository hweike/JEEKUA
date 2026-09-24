// app/api/admin/litechat/conversations/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { assignConversation } from '@/lib/litechat/services/conversation.service';
import { verifyAdminAuth, isAdminAuthSuccess } from '@/lib/auth/admin-check';
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdminAuth();
  if (!isAdminAuthSuccess(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { agent_id } = await request.json();

  if (!agent_id) {
    return NextResponse.json({ error: '请指定管理员' }, { status: 400 });
  }

  try {
    const conversation = await assignConversation(id, agent_id, DEFAULT_SITE_ID);

    // 获取被分配的管理员信息
    const adminRows = await sql<{
      id: string;
      name: string;
      nickname: string | null;
      avatar_url: string | null;
      online_status: string;
    }[]>`
      SELECT id, name, nickname, avatar_url, online_status
      FROM public.admin_users
      WHERE id = ${agent_id}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      conversation,
      assigned_to: adminRows[0] ?? null,
    });
  } catch (error: any) {
    console.error('分配会话失败:', error);
    if (error.message === '会话不存在' || error.message === '管理员不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: '分配失败' }, { status: 500 });
  }
}