// app/api/admin/payment/accounts/[id]/actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteId } from '@/lib/utils/request';
import { getBaseUrl, getDefaultLocale } from '@/lib/utils/url';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const siteId = await getSiteId(request);
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '账号ID不能为空' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, error: '缺少 action 参数' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'share': {
        const result = await accountService.generateShareLink(siteId, id);
        const baseUrl = getBaseUrl(request);
        const locale = getDefaultLocale(request);
        const fullUrl = `${baseUrl}/en/payment/account/share/${result.token}`;
        
        console.log('[actions] 生成分享链接成功:', fullUrl);
        
        return NextResponse.json({
          success: true,
          data: {
            token: result.token,
            url: fullUrl,
          },
        });
      }

      case 'default': {
        await accountService.setDefault(siteId, id);
        return NextResponse.json({ success: true });
      }

      default: {
        return NextResponse.json(
          { success: false, error: `未知操作: ${action}` },
          { status: 400 }
        );
      }
    }
  } catch (error: any) {
    console.error(`POST /api/admin/payment/accounts/${params}/actions error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    );
  }
}