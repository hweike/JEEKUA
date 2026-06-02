// app/[locale]/product/[...slugs]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getProductBySlug, getProductById } from '@/lib/products/indexDb';
import { readProduct } from '@/lib/products/mdParser';
import { getProductUrlPattern } from '@/lib/products/productSettings';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { Metadata } from 'next';
import Script from 'next/script';

interface PageProps {
  params: Promise<{ locale: string; slugs: string[] }>;
}

/**
 * 获取完整产品数据（支持变体合并）
 */
async function getFullProduct(locale: string, idOrSlug: string, isId: boolean) {
  // 1. 获取索引数据
  const indexData = isId ? getProductById(locale, idOrSlug) : getProductBySlug(locale, idOrSlug);
  if (!indexData) return null;

  // 2. 如果是变体
  if (indexData.parent_product_id) {
    const parentProduct = await readProduct(locale, indexData.parent_product_id);
    if (!parentProduct) return null;
    const variantData = parentProduct.variants?.find((v: any) => v.id === indexData.productId);
    if (!variantData) return null;

    // 深度合并：父产品为基础，变体覆盖
    const merged = {
      ...parentProduct,
      ...variantData,
      // 价格阶梯：变体没有则用父产品的
      price_tiers: variantData.price_tiers && variantData.price_tiers.length > 0 
        ? variantData.price_tiers 
        : parentProduct.price_tiers,
      currency: variantData.currency || parentProduct.currency,
      min_order_quantity: variantData.min_order_quantity ?? parentProduct.min_order_quantity,
      main_image_url: variantData.main_image_url || parentProduct.main_image_url,
      additional_images: variantData.additional_images?.length 
        ? variantData.additional_images 
        : parentProduct.additional_images,
      attributes: { ...parentProduct.attributes, ...(variantData.attributes || {}) },
      description: variantData.description || parentProduct.description,
      short_description: variantData.short_description || parentProduct.short_description,
      spec_text: variantData.spec_text || parentProduct.spec_text,
      shipping_cost: variantData.shipping_cost ?? parentProduct.shipping_cost,
      return_policy_days: variantData.return_policy_days ?? parentProduct.return_policy_days,
      availability: variantData.availability || parentProduct.availability,
      brand: variantData.brand || parentProduct.brand,
      isVariant: true,
      productId: indexData.productId, // 变体的真实ID
      // SEO 继承父产品的（如果变体没有自己的SEO）
      seo_title: variantData.seo_title || parentProduct.seo_title,
      seo_description: variantData.seo_description || parentProduct.seo_description,
      seo_keywords: variantData.seo_keywords || parentProduct.seo_keywords,
    };
    return merged;
  }

  // 3. 普通产品：合并索引和 MD 数据
  const mdData = await readProduct(locale, indexData.productId);
  if (!mdData) return null;
  return {
    ...indexData,
    ...mdData,
    price_tiers: indexData.price_tiers,
    attributes: indexData.attributes,
    isVariant: false,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slugs } = await params;
  const urlPattern = await getProductUrlPattern(locale);
  let product = null;
  if (urlPattern === 'slug-only' && slugs.length === 1) {
    product = await getFullProduct(locale, slugs[0], false);
  } else if (urlPattern === 'id-slug' && slugs.length === 2) {
    product = await getFullProduct(locale, slugs[0], true);
  }
  if (!product) return { title: '产品未找到' };
  return {
    title: product.seo_title || product.product_name,
    description: product.seo_description || product.short_description || `${product.product_name} 详细介绍`,
    openGraph: { images: product.main_image_url ? [product.main_image_url] : [] },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slugs } = await params;
  const urlPattern = await getProductUrlPattern(locale);

  let product = null;
  let productId = '';
  let slug = '';

  // 路由解析与重定向（保持不变）
  if (urlPattern === 'slug-only') {
    if (slugs.length !== 1) {
      const maybeProduct = await getFullProduct(locale, slugs[0], false);
      if (maybeProduct) redirect(`/${locale}/product/${maybeProduct.slug}`);
      notFound();
    }
    product = await getFullProduct(locale, slugs[0], false);
    if (!product) notFound();
    productId = product.productId;
    slug = product.slug;
    if (slug !== slugs[0]) redirect(`/${locale}/product/${slug}`);
  } else if (urlPattern === 'id-slug') {
    if (slugs.length !== 2) {
      const maybeProduct = await getFullProduct(locale, slugs[0], false);
      if (maybeProduct) redirect(`/${locale}/product/${maybeProduct.productId}/${maybeProduct.slug}`);
      notFound();
    }
    product = await getFullProduct(locale, slugs[0], true);
    if (!product) notFound();
    productId = slugs[0];
    slug = product.slug;
    if (slug !== slugs[1]) redirect(`/${locale}/product/${productId}/${slug}`);
  } else {
    notFound();
  }

  // 构建 JSON-LD（使用合并后的产品数据）
  const jsonLd = buildProductJsonLd(product);

  // 获取模板（变体继承父产品的模板ID，如果变体没有模板ID则用默认）
  let templateId = product.templateId;
  if (product.isVariant && !templateId && product.parent_product_id) {
    // 从父产品获取模板ID（可选，简单回退到默认）
    const parentIndex = getProductById(locale, product.parent_product_id);
    if (parentIndex) templateId = parentIndex.templateId;
  }
  templateId = templateId || 'default_product_published';
  const template = await getTemplateById(templateId);
  let templateData = null;
  let useTemplate = false;

  if (template && template.data) {
    const runtime = { product, locale, urlPattern };
    templateData = injectRuntimeDataSafe(template.data, runtime);
    useTemplate = true;
  }

  // 回退到硬编码布局（如果模板不存在或不使用）
  if (!useTemplate) {
    const priceRange = getPriceRange(product.price_tiers, product.currency);
    const imageUrls = [product.main_image_url, ...(product.additional_images || [])].filter(Boolean);
    return (
      <>
        <Script id="product-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="container mx-auto px-4 py-8">
          <nav className="text-sm text-gray-500 mb-4">
            <a href={`/${locale}`} className="hover:underline">首页</a> / <span className="ml-1 text-gray-700">{product.product_name}</span>
          </nav>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <img src={product.main_image_url || '/placeholder.png'} alt={product.product_name} className="w-full rounded-lg shadow" />
              {imageUrls.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto">
                  {imageUrls.slice(1).map((img, idx) => (
                    <img key={idx} src={img} alt="" className="w-20 h-20 object-cover rounded cursor-pointer" />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.product_name}</h1>
              {product.brand && <div className="text-gray-600 mb-2">品牌: {product.brand}</div>}
              <div className="text-2xl text-red-600 font-bold mb-2">{priceRange}</div>
              <div className="text-sm text-gray-500 mb-4">最小起订量: {product.min_order_quantity} 件</div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description || '' }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // 使用 WebBuilder 模板渲染
  return (
    <>
      <Script id="product-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TemplateRenderer data={templateData} />
    </>
  );
}

function getPriceRange(tiers: any[], currency: string): string {
  if (!tiers || tiers.length === 0) return '询价';
  const prices = tiers.map(t => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${min} ${currency}`;
  return `${min} - ${max} ${currency}`;
}

function buildProductJsonLd(product: any) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.product_name,
    description: product.description?.replace(/<[^>]*>/g, '') || product.seo_description,
    image: product.main_image_url,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: product.price_tiers?.map((tier: any) => ({
      '@type': 'Offer',
      price: tier.price,
      priceCurrency: product.currency,
      availability: product.availability === 'in_stock' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      eligibleQuantity: {
        '@type': 'QuantitativeValue',
        minValue: tier.min_qty,
        ...(tier.max_qty ? { maxValue: tier.max_qty } : {}),
      },
    })),
  };
}