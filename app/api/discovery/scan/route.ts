import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { locales } = body; // locales 为数组，例如 ['zh', 'en']
    const scriptPath = path.join(process.cwd(), 'scripts', 'migrate-to-pages.ts');
    let command = `npx tsx ${scriptPath}`;
    if (locales && locales.length > 0) {
      command += ` --locales ${locales.join(',')}`;
    }
    console.log(`🔄 执行命令: ${command}`);
    await execAsync(command);
    return NextResponse.json({ success: true, message: '索引重建完成' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '扫描失败' }, { status: 500 });
  }
}