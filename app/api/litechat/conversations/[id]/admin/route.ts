// app/api/litechat/conversations/[id]/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConversationAdminInfo } from '@/lib/litechat/services/admin.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const adminInfo = await getConversationAdminInfo(conversationId);

    if (!adminInfo) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(adminInfo);
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    return NextResponse.json(
      { error: '获取管理员信息失败' },
      { status: 500 }
    );
  }
}