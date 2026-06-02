// app/api/preview-styles/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // 尝试读取 public 下的编译样式
    const cssPath = path.join(process.cwd(), 'public', 'preview-styles.css');
    const css = await fs.readFile(cssPath, 'utf-8');
    return new NextResponse(css, {
      headers: { 'Content-Type': 'text/css', 'Cache-Control': 'no-cache' },
    });
  } catch {
    // 降级：返回内联基础样式
    const fallback = `
      @tailwind base;
      @tailwind components;
      @tailwind utilities;
      :root { --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; }
    `;
    return new NextResponse(fallback, { headers: { 'Content-Type': 'text/css' } });
  }
}