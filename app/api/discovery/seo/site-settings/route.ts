import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/Basicsettings/settings';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}