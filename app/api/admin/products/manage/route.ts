// app/api/admin/products/manage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProductService,
} from '@/lib/products/services/product.service';

// ==================== GET ====================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'zh';
    const status = searchParams.get('status') || 'all';
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const seriesId = searchParams.get('seriesId') || '';
    const parentId = searchParams.get('parentId') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const size = Math.min(parseInt(searchParams.get('size') || '20', 10), 100);
    const uncategorized = searchParams.get('uncategorized') === 'true';
    const searchAll = searchParams.get('searchAll') === 'true';

    const result = await getProducts({
      locale,
      status,
      keyword,
      categoryId,
      seriesId,
      parentId,
      productId,
      page,
      size,
      uncategorized,
      searchAll,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /products/manage error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// ==================== POST ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = body.locale || 'zh';

    const result = await createProduct(locale, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('POST /products/manage error:', error);
    return NextResponse.json(
      { error: error.message || '保存失败' },
      { status: 500 }
    );
  }
}

// ==================== PUT ====================
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const body = await request.json();
    const locale = body.locale || 'zh';

    const result = await updateProduct(locale, productId, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('PUT /products/manage error:', error);
    return NextResponse.json(
      { error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}

// ==================== DELETE ====================
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const locale = searchParams.get('locale') || 'zh';
    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    await deleteProductService(locale, productId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /products/manage error:', error);
    return NextResponse.json(
      { error: error.message || '删除失败' },
      { status: 500 }
    );
  }
}