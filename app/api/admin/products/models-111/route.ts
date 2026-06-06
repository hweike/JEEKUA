import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const MODELS_FILE = path.join(process.cwd(), 'data/models.json');

export async function GET() {
  try {
    const data = await fs.readFile(MODELS_FILE, 'utf-8');
    const models = JSON.parse(data);
    return NextResponse.json(models);
  } catch {
    // 如果文件不存在，返回空数组
    return NextResponse.json([]);
  }
}