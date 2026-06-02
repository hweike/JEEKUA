import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 1. 初始化 OpenAI 客户端，并将请求指向 DeepSeek 的地址
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,    // 从环境变量获取Key
  baseURL: process.env.DEEPSEEK_BASE_URL, // 设置为 https://api.deepseek.com
});

export async function POST(request: NextRequest) {
  try {
    // 2. 从请求体中获取前端发来的对话消息
    const { messages } = await request.json();

    // 3. 调用 DeepSeek API
    const response = await client.chat.completions.create({
      model: 'deepseek-v4-flash',   // 使用的模型
      messages: messages,       // 对话历史
      stream: false,            // 非流式输出，简化示例
    });

    // 4. 将 AI 生成的内容返回给前端
    return NextResponse.json({
      content: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}