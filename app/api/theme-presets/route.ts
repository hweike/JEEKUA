// app/api/theme-presets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllThemePresets, getActiveThemeId } from '@/lib/theme-presets';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const presetId = searchParams.get('presetId');

  if (presetId) {
    const [category, themeName] = presetId.split('_');
    const key = `data/themes/presets/${category}/${themeName}.json`;
    const storage = getPrivateStorage();
    try {
      const content = await storage.read(key, 'utf8');
      const themeJson = JSON.parse(content as string);
      return NextResponse.json({
        name: themeName,
        cssVars: themeJson.cssVars,
        typography: themeJson.typography || {},
        spacing: themeJson.spacing || {},
        borderRadius: themeJson.borderRadius || {},
        shadows: themeJson.shadows || {},
        animation: themeJson.animation || {},
      });
    } catch (err: any) {
      if (err?.Code === 'NoSuchKey' || err?.code === 'NoSuchKey' || err?.message?.includes('NoSuchKey')) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  } else {
    const presets = await getAllThemePresets();
    const activeTheme = await getActiveThemeId('tenant_001');
    return NextResponse.json({ presets, activeTheme });
  }
}