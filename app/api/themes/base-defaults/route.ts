// app/api/themes/base-defaults/route.ts
import { NextResponse } from 'next/server';
import { getBaseCssDefaults } from '@/lib/theme/get-base-defaults';

/**
 * GET /api/themes/base-defaults
 * 
 * 返回 base.css 中定义类变量的默认值
 * 
 * 用途：
 * - 后台主题编辑器加载时，获取「恢复默认」按钮的基准值
 * - 避免在客户端组件中直接调用 fs（Node.js API 不能在浏览器运行）
 * 
 * 响应格式：
 * {
 *   "font-size-sm": "0.875rem",
 *   "font-weight-semibold": "600",
 *   "line-height-tight": "1.25",
 *   ...
 * }
 */
export async function GET() {
  try {
    const defaults = await getBaseCssDefaults();
    return NextResponse.json(defaults);
  } catch (error) {
    console.error('[api/themes/base-defaults] 获取默认值失败:', error);
    return NextResponse.json(
      { error: 'Failed to load base CSS defaults' },
      { status: 500 }
    );
  }
}