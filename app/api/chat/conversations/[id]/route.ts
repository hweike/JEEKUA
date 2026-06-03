// app/api/chat/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/chat/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = getMessages(id);
  return NextResponse.json({ messages });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, isAdmin } = await req.json();
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: '内容无效' }, { status: 400 });
  }
  const newMessage = addMessage(id, content, isAdmin === true);
  return NextResponse.json(newMessage);
}