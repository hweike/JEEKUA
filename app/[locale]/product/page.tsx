import { redirect, notFound } from 'next/navigation';
import { getAllCategories } from '@/lib/products/categories';
import { generateClientSlug } from '@/lib/utils/clientSlug';
import { toPinyin } from '@/lib/utils/pinyin';

// 改进的 slug 生成函数：纯英文不经过拼音转换
function generateSlugFromName(name: string): string {
  // 检测是否包含中文字符
  if (/[\u4e00-\u9fa5]/.test(name)) {
    const pinyinText = toPinyin(name);
    return generateClientSlug(pinyinText);
  }
  // 纯英文/数字直接生成
  return generateClientSlug(name);
}

export default async function ProductRootPage({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const { productLines } = await getAllCategories(locale);
  
  if (!productLines || productLines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">暂无产品线</h1>
        <p>请先在后台创建产品线。</p>
      </div>
    );
  }
  
  const sorted = [...productLines].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const firstProductLine = sorted[0];
  let slug = firstProductLine.slug;
  
  if (!slug) {
    slug = generateSlugFromName(firstProductLine.name);
  }
  
  redirect(`/${locale}/products/${slug}`);
}