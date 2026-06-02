// app/api/theme-presets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAllThemePresets, getActiveThemeId } from '@/lib/theme-presets';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const presetId = searchParams.get('presetId');

  if (presetId) {
    // 解析 presetId，格式为 "category_themeName"，例如 "Blue_Twitter"
    const [category, themeName] = presetId.split('_');
    const themePath = path.join(process.cwd(), 'data', 'themes', 'presets', category, `${themeName}.json`);

    if (fs.existsSync(themePath)) {
      const themeJson = JSON.parse(fs.readFileSync(themePath, 'utf-8'));
      return NextResponse.json({
        name: themeName,
        cssVars: themeJson.cssVars,
        typography: themeJson.typography || {},
        spacing: themeJson.spacing || {},
        borderRadius: themeJson.borderRadius || {},
        shadows: themeJson.shadows || {},
        animation: themeJson.animation || {},
      });
    } else {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }
  } else {
    // 返回所有预设主题列表及当前激活的主题 ID
    const presets = getAllThemePresets();
    const activeTheme = getActiveThemeId('tenant_001');
    return NextResponse.json({ presets, activeTheme });
  }
}