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
import { withDynamicLocale } from '@/lib/withPageLocale';

interface PageProps {
  params: Promise<{ locale: string; slugs: string[] }>;
}

/**
 * 获取完整产品数据（支持变体合并）
 */
async function getFullProduct(locale: string, idOrSlug: string, isId: boolean) {
  // ... 原有函数内容保持不变 ...
  // （为节省篇幅，此处省略，请复制您原有函数代码）
  // 注意：函数内部没有需要修改的部分
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // ... 原有内容保持不变 ...
  // （为节省篇幅，此处省略，请复制您原有函数代码）
}

async function ProductPage({ params }: PageProps) {
  const { locale, slugs } = await params;
  const urlPattern = await getProductUrlPattern(locale);

  // ... 原有路由解析、产品获取、变体合并、模板渲染等逻辑完全保持不变 ...
  // （为节省篇幅，此处省略，请复制您原有函数代码）
  // 只需确保函数名为 ProductPage（原为匿名导出），并在最后使用 withDynamicLocale 包装。
}

// 构建 JSON-LD 等辅助函数保持不变
function getPriceRange(tiers: any[], currency: string): string { /* ... */ }
function buildProductJsonLd(product: any) { /* ... */ }

export default withDynamicLocale(ProductPage);