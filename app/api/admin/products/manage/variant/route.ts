import { NextRequest, NextResponse } from 'next/server';
import { readProduct, writeProduct } from '@/lib/products/mdParser';
import { getProductIndex, upsertProductIndex } from '@/lib/products/indexDb';

/**
 * 生成随机 SKU（用于变体）
 */
function generateVariantSku(): string {
  return `V-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentId, variantIndex, locale = 'zh', variantData } = body;

    if (!parentId || !variantData) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 变体名称必填（兼容 product_name 和 name）
    const variantName = variantData.product_name || variantData.name;
    if (!variantName) {
      return NextResponse.json({ error: '变体名称不能为空' }, { status: 400 });
    }

    const parentProduct = await readProduct(locale, parentId);
    if (!parentProduct) {
      return NextResponse.json({ error: '父产品不存在' }, { status: 404 });
    }

    let variants = parentProduct.variants || [];

    // 处理 SKU：若为空或仅空白字符，则自动生成
    let sku = variantData.sku?.trim();
    if (!sku) {
      sku = generateVariantSku();
      console.log(`自动生成变体 SKU: ${sku} (父产品ID: ${parentId})`);
    }

    // 构建要存储的变体对象（不包含品牌字段）
    const newVariant = {
      id: variantData.id || (variantIndex !== undefined && variants[variantIndex]?.id) || undefined,
      product_name: variantName,
      sku: sku,
      short_description: variantData.short_description || '',
      main_image_url: variantData.main_image_url || '',
      additional_images: variantData.additional_images || [],
      attributes: variantData.attributes || {},
      slug: variantData.slug || '',
      seo_keywords: variantData.seo_keywords || '',
      seo_title: variantData.seo_title || '',
      seo_description: variantData.seo_description || '',
    };

    if (variantIndex !== undefined) {
      // 编辑已有变体
      if (variantIndex >= variants.length) {
        return NextResponse.json({ error: '变体不存在' }, { status: 404 });
      }
      // 保留原变体的 id（如果新数据没有提供）
      if (!newVariant.id && variants[variantIndex]?.id) {
        newVariant.id = variants[variantIndex].id;
      }
      variants[variantIndex] = newVariant;
    } else {
      // 新增变体：生成 id
      newVariant.id = newVariant.id || `variant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      variants.push(newVariant);
    }

    parentProduct.variants = variants;
    await writeProduct(locale, parentId, parentProduct, parentProduct.content || '');

    // 更新索引中的变体摘要（只保留关键信息）
    const existingIndex = getProductIndex(parentId);
    if (existingIndex) {
      upsertProductIndex({
        ...existingIndex,
        variants: variants.map((v: any) => ({
          sku: v.sku,
          name: v.product_name,
          mainImage: v.main_image_url,
        })),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, variant: newVariant });
  } catch (error) {
    console.error('Variant API error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parentId = searchParams.get('parentId');
  const locale = searchParams.get('locale') || 'zh';
  if (!parentId) {
    return NextResponse.json({ error: '缺少 parentId' }, { status: 400 });
  }
  const parentProduct = await readProduct(locale, parentId);
  if (!parentProduct) {
    return NextResponse.json({ error: '父产品不存在' }, { status: 404 });
  }
  return NextResponse.json(parentProduct.variants || []);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parentId = searchParams.get('parentId');
  const variantIndex = searchParams.get('variantIndex');
  const locale = searchParams.get('locale') || 'zh';
  if (!parentId || variantIndex === null) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }
  const idx = parseInt(variantIndex, 10);
  const parentProduct = await readProduct(locale, parentId);
  if (!parentProduct) {
    return NextResponse.json({ error: '父产品不存在' }, { status: 404 });
  }
  const variants = parentProduct.variants || [];
  if (idx >= variants.length) {
    return NextResponse.json({ error: '变体不存在' }, { status: 404 });
  }
  variants.splice(idx, 1);
  parentProduct.variants = variants;
  await writeProduct(locale, parentId, parentProduct, parentProduct.content || '');
  const existingIndex = getProductIndex(parentId);
  if (existingIndex) {
    upsertProductIndex({
      ...existingIndex,
      variants: variants.map((v: any) => ({
        sku: v.sku,
        name: v.product_name,
        mainImage: v.main_image_url,
      })),
      updatedAt: new Date().toISOString(),
    });
  }
  return NextResponse.json({ success: true });
}