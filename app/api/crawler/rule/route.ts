import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const RULES_DIR = path.join(process.cwd(), 'data', 'crawler', 'rules');

export async function GET() {
  try {
    await fs.mkdir(RULES_DIR, { recursive: true });
    const files = await fs.readdir(RULES_DIR);
    const rules = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async (file) => {
          const filePath = path.join(RULES_DIR, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const rule = JSON.parse(content);
          return { id: file.replace('.json', ''), name: rule.name };
        })
    );
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json([]);
  }
}