// app/api/admin/payment/orders/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/lib/payment/services/order.service';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteId } from '@/lib/utils/request';
import { renderToBuffer } from '@react-pdf/renderer';
import OrderPDF from '@/lib/payment/pdf-templates/order-pdf';
import { getSettings } from '@/lib/Basicsettings/settings';

// ============================================================
// ✅ 图片处理辅助函数
// ============================================================

function isNetworkUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function detectImageFormat(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'image/jpeg';
  }
  if (buffer.length >= 4 && 
      buffer[0] === 0x89 && 
      buffer[1] === 0x50 && 
      buffer[2] === 0x4E && 
      buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length >= 3 && 
      buffer[0] === 0x47 && 
      buffer[1] === 0x49 && 
      buffer[2] === 0x46) {
    return 'image/gif';
  }
  if (buffer.length >= 4 && 
      buffer[0] === 0x52 && 
      buffer[1] === 0x49 && 
      buffer[2] === 0x46 && 
      buffer[3] === 0x46) {
    return 'image/webp';
  }
  const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 200));
  if (str.includes('<svg') || str.includes('<?xml')) {
    return 'image/svg+xml';
  }
  return 'image/png';
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    console.log('[PDF] 正在获取图片:', url);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      console.warn('[PDF] 获取图片失败:', response.status, url);
      return '';
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = detectImageFormat(buffer);
    const base64 = buffer.toString('base64');
    console.log('[PDF] 图片处理成功, 格式:', mimeType, '大小:', buffer.length, 'bytes');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('[PDF] 获取图片失败:', url, error);
    return '';
  }
}

/**
 * ✅ 将图片（本地或网络）转换为 Base64 Data URL
 * 统一使用 HTTP 请求，避免 fs 动态路径追踪问题
 * 
 * @param imagePath 图片路径（网络 URL 或本地路径）
 * @param baseUrl 当前请求的 origin（可选，用于本地图片转 HTTP）
 */
async function getImageAsBase64(imagePath: string, baseUrl?: string): Promise<string> {
  if (!imagePath) return '';
  
  // ✅ 网络 URL 直接请求
  if (isNetworkUrl(imagePath)) {
    return await fetchImageAsBase64(imagePath);
  }
  
  // ✅ 本地路径转成绝对 URL，通过 HTTP 请求获取
  // 优先使用传入的 baseUrl（当前请求的 origin），其次环境变量，最后 fallback
  const origin = baseUrl 
    || process.env.NEXT_PUBLIC_SITE_URL 
    || 'http://localhost:3000';
  
  const absoluteUrl = imagePath.startsWith('/') 
    ? `${origin}${imagePath}`
    : `${origin}/${imagePath}`;
  
  console.log('[PDF] 本地图片转为 HTTP 请求:', absoluteUrl);
  return await fetchImageAsBase64(absoluteUrl);
}

// ============================================================
// ✅ 文件名辅助函数
// ============================================================

/**
 * ✅ 清理文件名中的特殊字符
 * 保留字母、数字、连字符、下划线、空格和中文字符
 */
function sanitizeFileName(name: string): string {
  if (!name) return '';
  return name.replace(/[^a-zA-Z0-9\-_\s\u4e00-\u9fa5]/g, '')
    .trim() 
    .replace(/\s+/g, '-')
    || '';
}

/**
 * ✅ 生成订单 PDF 文件名
 * 格式：{客户公司名称}-{合同号/订单号}.pdf
 * 如果没有公司名称，使用客户名称
 */
function generateOrderPDFFileName(order: {
  buyer_company?: string;
  buyer_name: string;
  contract_no?: string;
  order_no: string;
}): string {
  const customerName = order.buyer_company || order.buyer_name || 'Customer';
  const cleanCustomerName = sanitizeFileName(customerName) || 'Customer';
  const orderRef = order.contract_no || order.order_no || 'PI';
  return `${cleanCustomerName}-${orderRef}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ 从当前请求中动态获取 origin（无需环境变量）
    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;
    console.log('[PDF] 当前请求 origin:', origin);

    const { id } = await params;
    const siteId = await getSiteId(request);
    const order = await orderService.getById(siteId, id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // ✅ 使用 getSettings() 获取站点设置
    const settings = await getSettings();
    const siteName = settings?.siteName || settings?.companyName || 'Feisman Power';
    const companyLogo = settings?.logo || '';
    
    console.log('[PDF] 企业Logo路径:', companyLogo || '(空)');

    // ✅ 获取企业 Logo Base64（传入当前请求的 origin）
    const companyLogoBase64 = await getImageAsBase64(companyLogo, origin);

    // ✅ 获取卖家信息 - 从 settings 动态获取
    const sellerInfo = {
      company: settings?.companyName || '--',
      address: settings?.registeredAddress || '--',
      city: settings?.city || '--',
      province: settings?.province || '--',
      country: settings?.country || '--',
      postalCode: settings?.postalCode || '--',
      phone: settings?.contactPhone || '--',
      email: settings?.contactEmail || '--',
      logo: companyLogoBase64,
    };

    // ✅ 获取支付账户列表（支持多个收款账号）
    const orderAny = order as any;
    const paymentAccounts: any[] = [];
    const accountIdsSet = new Set<string>();

    // ✅ 1. 优先从 payment_account_id 获取
    if (orderAny.payment_account_id) {
      try {
        console.log('[PDF] 从 payment_account_id 获取账户:', orderAny.payment_account_id);
        const account = await accountService.getById(siteId, orderAny.payment_account_id);
        if (account) {
          paymentAccounts.push(account);
          accountIdsSet.add(account.id);
        }
      } catch (accountError) {
        console.warn('[PDF] 获取支付账户失败 (payment_account_id):', accountError);
      }
    }
    
    // ✅ 2. 从 selected_account_ids 获取（支持多个）
    if (orderAny.selected_account_ids && 
        Array.isArray(orderAny.selected_account_ids) && 
        orderAny.selected_account_ids.length > 0) {
      for (const accountId of orderAny.selected_account_ids) {
        if (!accountIdsSet.has(accountId)) {
          try {
            console.log('[PDF] 从 selected_account_ids 获取账户:', accountId);
            const account = await accountService.getById(siteId, accountId);
            if (account) {
              paymentAccounts.push(account);
              accountIdsSet.add(account.id);
            }
          } catch (accountError) {
            console.warn('[PDF] 获取支付账户失败 (selected_account_ids):', accountError);
          }
        }
      }
    }
    
    // ✅ 3. 如果 order 中已有 payment_account 对象，添加（如果尚未添加）
    if (orderAny.payment_account && !accountIdsSet.has(orderAny.payment_account.id)) {
      paymentAccounts.push(orderAny.payment_account);
      console.log('[PDF] 从 payment_account 对象获取账户');
    }

    console.log('[PDF] 企业Logo长度:', companyLogoBase64?.length || 0);
    console.log('[PDF] 支付账户数量:', paymentAccounts.length);
    console.log('[PDF] 支付账户IDs:', paymentAccounts.map(a => a.id).join(', ') || '无');

    // ✅ 生成文件名
    const fileName = generateOrderPDFFileName({
      buyer_company: order.buyer_company,
      buyer_name: order.buyer_name,
      contract_no: order.contract_no,
      order_no: order.order_no,
    });

    console.log('[PDF] 生成文件名:', fileName);

    // ✅ 渲染 PDF
    const pdfBuffer = await renderToBuffer(
      OrderPDF({ 
        order, 
        siteName,
        sellerInfo,
        paymentAccounts,
        companyLogoBase64,
      })
    );

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('PDF生成失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成PDF失败' },
      { status: 500 }
    );
  }
}