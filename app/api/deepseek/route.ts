import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const response = await client.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages,
      stream: false,
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}