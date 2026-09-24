// app/api/admin/payment/accounts/[id]/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { accountService } from '@/lib/payment/services/account.service';
import AccountPDF from '@/lib/payment/pdf-templates/account-pdf';
import { getSiteId } from '@/lib/utils/request';
import { getSettings } from '@/lib/Basicsettings/settings';
import { getBankLogo, DEFAULT_LOGO } from '@/lib/payment/types/logos';

/**
 * ✅ 判断是否为网络 URL
 */
function isNetworkUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * ✅ 检测图片的实际格式
 */
function detectImageFormat(buffer: Buffer): string {
  // JPEG: 0xFF 0xD8
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'image/jpeg';
  }
  // PNG: 0x89 0x50 0x4E 0x47
  if (buffer.length >= 4 && 
      buffer[0] === 0x89 && 
      buffer[1] === 0x50 && 
      buffer[2] === 0x4E && 
      buffer[3] === 0x47) {
    return 'image/png';
  }
  // GIF: 0x47 0x49 0x46
  if (buffer.length >= 3 && 
      buffer[0] === 0x47 && 
      buffer[1] === 0x49 && 
      buffer[2] === 0x46) {
    return 'image/gif';
  }
  // WebP: 0x52 0x49 0x46 0x46
  if (buffer.length >= 4 && 
      buffer[0] === 0x52 && 
      buffer[1] === 0x49 && 
      buffer[2] === 0x46 && 
      buffer[3] === 0x46) {
    return 'image/webp';
  }
  // SVG: 查看是否包含 <svg
  const str = buffer.toString('utf-8', 0, Math.min(buffer.length, 200));
  if (str.includes('<svg') || str.includes('<?xml')) {
    return 'image/svg+xml';
  }
  // 默认返回 PNG
  return 'image/png';
}

/**
 * ✅ 从网络 URL 获取图片，检测格式并处理
 * 保留原有的 JPEG SOI 修复、Sharp 转换功能
 */
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
    let buffer = Buffer.from(arrayBuffer);
    
    // ✅ 检测图片的实际格式
    let mimeType = detectImageFormat(buffer);
    
    // ✅ 如果是 JPEG 且找不到 SOI，尝试修复
    if (mimeType === 'image/jpeg') {
      // 检查是否包含有效的 JPEG 标记
      let hasSOI = false;
      for (let i = 0; i < Math.min(buffer.length, 50); i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
          hasSOI = true;
          break;
        }
      }
      
      if (!hasSOI) {
        console.warn('[PDF] JPEG 缺少 SOI 标记，尝试修复');
        // 尝试截断前导数据
        for (let i = 0; i < Math.min(buffer.length, 500); i++) {
          if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
            buffer = buffer.subarray(i);
            hasSOI = true;
            console.log('[PDF] JPEG 修复成功，移除前导数据');
            break;
          }
        }
        
        // 如果仍然没有 SOI，尝试用 Sharp 转换
        if (!hasSOI) {
          try {
            // 动态导入 sharp，避免在无 sharp 环境报错
            const sharp = await import('sharp');
            const pngBuffer = await sharp.default(buffer).png().toBuffer();
            mimeType = 'image/png';
            buffer = pngBuffer;
            console.log('[PDF] 使用 Sharp 转换为 PNG');
          } catch (sharpError) {
            console.warn('[PDF] Sharp 转换失败，继续使用原数据:', sharpError);
          }
        }
      }
    }
    
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

/**
 * ✅ 清理文件名中的特殊字符
 * 保留字母、数字、连字符、下划线和中文字符
 */
function sanitizeFileName(name: string): string {
  if (!name) return 'default';
  // 移除特殊字符，保留字母、数字、连字符、下划线、空格和中文字符
  return name.replace(/[^a-zA-Z0-9\-_\s\u4e00-\u9fa5]/g, '')
    .trim() 
    .replace(/\s+/g, '-') // 空格替换为连字符
    || 'default';
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
    
    const account = await accountService.getById(siteId, id);
    if (!account) {
      return NextResponse.json(
        { success: false, error: '账号不存在' },
        { status: 404 }
      );
    }

    // ✅ 从数据库获取站点名称和 Logo
    let siteName = '';
    let companyLogo = '';
    try {
      const settings = await getSettings();
      siteName = settings?.siteName || settings?.companyName || '';
      companyLogo = settings?.logo || '';
      console.log('[PDF] 企业Logo URL:', companyLogo);
    } catch (settingsError) {
      console.warn('[PDF] 获取站点设置失败:', settingsError);
    }

    // ✅ 获取银行 Logo 的 Base64（传入当前请求的 origin）
    const bankLogoPath = getBankLogo(account);
    const bankLogoBase64 = await getImageAsBase64(bankLogoPath, origin);

    // ✅ 获取企业 Logo 的 Base64（传入当前请求的 origin）
    const companyLogoBase64 = await getImageAsBase64(companyLogo, origin);

    console.log('[PDF] 银行Logo长度:', bankLogoBase64?.length || 0);
    console.log('[PDF] 企业Logo长度:', companyLogoBase64?.length || 0);

    // ✅ 生成 PDF
    const pdfBuffer = await renderToBuffer(
      AccountPDF({ 
        account, 
        siteName,
        bankLogoBase64,
        companyLogoBase64,
      })
    );

    // ✅ 生成文件名：account-网站名-银行英文名称.pdf
    // 清理文件名中的特殊字符
    const cleanSiteName = sanitizeFileName(siteName);
    const cleanBankName = sanitizeFileName(
      account.display_name_en || account.display_name_zh || 'bank'
    );
    
    const fileName = `Account-${cleanSiteName}-${cleanBankName}.pdf`;

    console.log('[PDF] 生成文件名:', fileName);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('PDF生成失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'PDF生成失败' },
      { status: 500 }
    );
  }
}