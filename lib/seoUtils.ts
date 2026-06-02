// lib/seoUtils.ts
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export function generateSeoTitle(
  productName: string,
  brand: string,
  minQty: number,
  siteName: string
): string {
  let title = `${brand} ${productName} - 批发${minQty}件起 | ${siteName}`;
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  return title;
}

export function generateSeoDescription(
  descriptionHtml: string | undefined,
  priceTiers: any[],
  variantsText: string | undefined,
  settings: any
): string {
  let plainDesc = '';
  if (descriptionHtml) {
    plainDesc = descriptionHtml.replace(/<[^>]*>/g, '').substring(0, 150);
  }
  let priceText = '';
  if (priceTiers && priceTiers.length) {
    const tiersText = priceTiers.map(t => `${t.minQty}件${t.price}${settings.site_currency}`).join('，');
    priceText = `阶梯价格：${tiersText}。`;
  }
  let desc = plainDesc ? `${plainDesc} ${priceText}` : `欢迎批发采购${productName}。${priceText}`;
  if (variantsText) {
    desc += ` 可选规格：${variantsText.substring(0, 100)}。`;
  }
  if (desc.length > 160) desc = desc.substring(0, 157) + '...';
  return desc;
}