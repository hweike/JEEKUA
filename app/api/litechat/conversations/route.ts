// app/api/litechat/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateConversation } from '@/lib/litechat/services/conversation.service';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    // 参数验证
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 创建或获取会话
    const conversation = await getOrCreateConversation(
      email,
      name || '访客',
      DEFAULT_SITE_ID
    );

    return NextResponse.json(conversation);
  } catch (error: any) {
    console.error('创建会话失败:', error);
    return NextResponse.json(
      { error: error.message || '创建会话失败，请稍后重试' },
      { status: 500 }
    );
  }
}