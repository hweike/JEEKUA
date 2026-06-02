import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'data/webbuilder/templates');

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// GET /api/templates - 获取所有模板（每个 baseId 最新版本）
export async function GET() {
  try {
    await ensureDir(TEMPLATES_DIR);
    const categories = await fs.readdir(TEMPLATES_DIR).catch(() => []);
    const templatesMap = new Map<string, any>();

    for (const cat of categories) {
      const catPath = path.join(TEMPLATES_DIR, cat);
      const stat = await fs.stat(catPath).catch(() => null);
      if (!stat?.isDirectory()) continue;

      const files = await fs.readdir(catPath).catch(() => []);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const content = await fs.readFile(path.join(catPath, file), 'utf-8');
        const template = JSON.parse(content);
        const baseId = template.baseId || template.id;
        const existing = templatesMap.get(baseId);
        if (!existing || new Date(template.updatedAt) > new Date(existing.updatedAt)) {
          templatesMap.set(baseId, template);
        }
      }
    }

    const templates = Array.from(templatesMap.values());
    templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json(templates);
  } catch (error) {
    console.error('GET /api/templates error:', error);
    return NextResponse.json([], { status: 200 }); // 返回空数组避免 JSON 解析错误
  }
}

// POST /api/templates - 创建新模板
export async function POST(request: NextRequest) {
  await ensureDir(TEMPLATES_DIR);
  try {
    const body = await request.json();
    const { name, category } = body;
    if (!name || !category) {
      return NextResponse.json({ error: 'name and category are required' }, { status: 400 });
    }

    const baseId = `${category}_${Date.now()}`;
    const now = new Date().toISOString();

    const template = {
      baseId,
      name,
      category,
      data: { root: { props: {} }, content: [], zones: {} },
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    const catDir = path.join(TEMPLATES_DIR, category);
    await ensureDir(catDir);
    const fileName = `${baseId}_draft.json`;
    await fs.writeFile(path.join(catDir, fileName), JSON.stringify(template, null, 2));

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('POST /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/templates?baseId=xxx - 删除模板及其所有版本
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const baseId = searchParams.get('baseId');
  if (!baseId) return NextResponse.json({ error: 'Missing baseId' }, { status: 400 });

  try {
    const categories = await fs.readdir(TEMPLATES_DIR).catch(() => []);
    for (const cat of categories) {
      const catPath = path.join(TEMPLATES_DIR, cat);
      const files = await fs.readdir(catPath).catch(() => []);
      for (const file of files) {
        if (file.startsWith(baseId)) {
          await fs.unlink(path.join(catPath, file));
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/templates error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}