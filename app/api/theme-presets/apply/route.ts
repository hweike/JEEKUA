// app/api/theme-presets/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { applyThemePreset } from '@/lib/theme-presets';

export async function POST(request: NextRequest) {
  try {
    const { presetId } = await request.json();
    if (!presetId) {
      return NextResponse.json({ error: '缺少 presetId 参数' }, { status: 400 });
    }
    applyThemePreset('tenant_001', presetId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}