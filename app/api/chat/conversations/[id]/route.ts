import { NextRequest, NextResponse } from 'next/server';
import { getMessages, addMessage } from '@/lib/chat/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const messages = getMessages(params.id);
  return NextResponse.json({ messages });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { content, isAdmin } = await req.json();
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: '内容无效' }, { status: 400 });
  }
  const newMessage = addMessage(params.id, content, isAdmin === true);
  return NextResponse.json(newMessage);
}