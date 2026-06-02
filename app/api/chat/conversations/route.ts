import { NextRequest, NextResponse } from 'next/server';
import { getConversationByContact, createConversation } from '@/lib/chat/db';

export async function POST(req: NextRequest) {
  const { contact } = await req.json();
  if (!contact || typeof contact !== 'string') {
    return NextResponse.json({ error: '联系方式无效' }, { status: 400 });
  }

  let conversation = getConversationByContact(contact);
  if (!conversation) {
    conversation = createConversation(contact);
  }
  return NextResponse.json({ id: conversation.id, contact: conversation.contact });
}