import pinyin from 'pinyin';

export function generateSlug(name: string): string {
  if (!name) return '';
  const pinyinArray = pinyin(name, { style: pinyin.STYLE_NORMAL, heteronym: false });
  const pinyinStr = pinyinArray.map(item => item[0]).join(' ');
  let slug = pinyinStr.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) {
    slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return slug;
}

export function generateSeoTitle(name: string, brand: string, minQty: number, siteName: string, template: string): string {
  let title = template
    .replace('{brand}', brand)
    .replace('{name}', name)
    .replace('{min_qty}', minQty.toString())
    .replace('{site_name}', siteName);
  if (title.length > 60) title = title.slice(0, 57) + '...';
  return title;
}

export function generateSeoDescription(descriptionHtml: string | undefined, priceTiers: any[], variantsText: string | undefined, template: string, currency: string): string {
  let plainDesc = '';
  if (descriptionHtml) {
    plainDesc = descriptionHtml.replace(/<[^>]*>/g, '').slice(0, 150);
  }
  let priceText = '';
  if (priceTiers && priceTiers.length) {
    const tiersText = priceTiers.map(t => `${t.min_qty}件${t.price}${currency}`).join('，');
    priceText = `阶梯价格：${tiersText}。`;
  }
  let desc = template
    .replace('{description_plain}', plainDesc || '欢迎批发采购')
    .replace('{price_tiers_text}', priceText);
  if (variantsText) {
    desc += ` 可选规格：${variantsText.slice(0, 100)}。`;
  }
  if (desc.length > 160) desc = desc.slice(0, 157) + '...';
  return desc;
}