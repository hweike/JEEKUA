// app/api/admin/litechat/quick-replies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getQuickReplies, createQuickReply } from '@/lib/litechat/services/quick-reply.service';
import { getCurrentUser } from '@/lib/auth/jwt';
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

/**
 * 验证管理员身份并返回 admin 信息
 */
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

// ============================================================
// GET - 获取常用语列表
// ============================================================
export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const replies = await getQuickReplies(auth.admin.id, DEFAULT_SITE_ID);
    return NextResponse.json(replies);
  } catch (error) {
    console.error('获取常用语列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

// ============================================================
// POST - 创建常用语
// ============================================================
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { title, content } = await request.json();

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
  }

  try {
    const reply = await createQuickReply(
      title.trim(),
      content.trim(),
      auth.admin.id,
      DEFAULT_SITE_ID
    );
    return NextResponse.json(reply);
  } catch (error) {
    console.error('创建常用语失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}