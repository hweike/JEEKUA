// app/api/admin/litechat/conversations/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { assignConversation } from '@/lib/litechat/services/conversation.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

async function verifyAdmin(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: '未登录', status: 401 };
  }

  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !admin) {
    return { error: '无权访问，需要管理员权限', status: 403 };
  }

  return { admin };
}

// POST - 分配会话
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
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
    const { data: adminInfo } = await supabase
      .from('admin_users')
      .select('id, name, nickname, avatar_url, online_status')
      .eq('id', agent_id)
      .single();

    return NextResponse.json({
      success: true,
      conversation,
      assigned_to: adminInfo,
    });
  } catch (error: any) {
    console.error('分配会话失败:', error);
    if (error.message === '会话不存在' || error.message === '管理员不存在') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: '分配失败' }, { status: 500 });
  }
}