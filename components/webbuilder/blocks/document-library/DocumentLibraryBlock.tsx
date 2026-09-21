'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTranslations } from 'next-intl';
import DocsTree from '@/components/front/DocsTree';
import DocToc from '@/components/front/DocToc';
import ProductCard from '@/components/front/ProductCard';

interface DocData {
  id: string;
  title: string;
  slug: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  templateId?: string | null;
}

interface AssociatedProduct {
  productId: string;
  product_name: string;
  slug: string;
  main_image_url: string;
  price_tiers: any[];
  currency: string;
  availability?: string;
  min_order_quantity?: number;
}

const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

function makeHeadingSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-');
}

export function DocumentLibraryBlock({ __runtime, puck }: any) {
  const t = useTranslations('Components.DocumentLibrary');
  const { library, docTree, currentDoc: initialDoc, locale, urlPattern } = __runtime || {};

  const [currentDoc, setCurrentDoc] = useState<DocData | null>(initialDoc || null);
  const [loading, setLoading] = useState(false);
  const [associatedProducts, setAssociatedProducts] = useState<AssociatedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 并发请求去重（相同 key 的请求复用同一个 Promise）
  const inFlightRef = useRef<Map<string, Promise<any>>>(new Map());

  // 主题变量（保持不变）
  const containerBg    = 'var(--doc-detail-bg, var(--background, #ffffff))';
  const containerText  = 'var(--doc-detail-text, var(--foreground, #263238))';
  const titleColor     = 'var(--doc-detail-title-color, var(--foreground, #263238))';
  const headingColor   = 'var(--doc-detail-heading-color, var(--foreground, #263238))';
  const contentColor   = 'var(--doc-detail-content-color, var(--foreground, #263238))';
  const linkColor      = 'var(--doc-detail-link-color, #43a047)';
  const loadingColor   = 'var(--doc-detail-loading-color, var(--muted-foreground, #888c96))';
  const contentDivider = 'var(--doc-detail-divider-color, var(--border, #edeef3))';

  const sidebarBg           = 'var(--doc-sidebar-bg, var(--background, #f5f7f8))';
  const sidebarBorder       = 'var(--doc-sidebar-border, var(--border, #edeef3))';
  const sidebarText         = 'var(--doc-sidebar-text, var(--foreground, #263238))';
  const sidebarGroupLabel   = 'var(--doc-sidebar-group-label-color, var(--foreground, #17181c))';
  const sidebarActiveBg     = 'var(--doc-sidebar-active-bg, #f0f1f3)';
  const sidebarActiveText   = 'var(--doc-sidebar-active-text, #17181c)';
  const sidebarActiveBorder = 'var(--doc-sidebar-active-border, transparent)';
  const sidebarHoverBg      = 'var(--doc-sidebar-hover-bg, #f0f1f3)';
  const sidebarHoverText    = 'var(--doc-sidebar-hover-text, #17181c)';
  const sidebarBadgeBg      = 'var(--doc-sidebar-badge-bg, #e8f5e9)';
  const sidebarBadgeText    = 'var(--doc-sidebar-badge-text, #43a047)';

  const TOC_WIDTH = 'var(--doc-toc-width, 15rem)';

  const findNodeBySlug = useCallback(
    (nodes: any[], slug: string): any | null => {
      for (const node of nodes) {
        if (node.slug === slug) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeBySlug(node.children, slug);
          if (found) return found;
        }
      }
      return null;
    },
    []
  );

  // ==== 关键修正：使用 inFlightRef 去重，而不是 requestedSlugsRef ====
  const fetchDocWithProducts = useCallback(
    async (docSlug: string) => {
      if (!library || !docSlug) return;

      const key = `${library.slug}:${docSlug}:${locale || 'zh'}`;
      if (inFlightRef.current.has(key)) {
        // 相同请求正在进行中，直接复用
        return inFlightRef.current.get(key);
      }

      setLoading(true);
      setLoadingProducts(true);

      const promise = (async () => {
        try {
          const res = await fetch(
            `/api/docs/content?libSlug=${library.slug}&docSlug=${docSlug}&locale=${locale || 'zh'}`
          );
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to fetch document');
          }
          const data = await res.json();
          setCurrentDoc(data.doc);
          setAssociatedProducts(data.products || []);
        } catch (err) {
          console.error('[DocumentLibraryBlock] Error fetching doc:', err);
        } finally {
          setLoading(false);
          setLoadingProducts(false);
          inFlightRef.current.delete(key);
        }
      })();

      inFlightRef.current.set(key, promise);
      return promise;
    },
    [library, locale]
  );

  // ==== 首次加载：始终触发一次请求，确保获取最新内容和商品 ====
  useEffect(() => {
    if (!initialDoc || !library?.slug) return;

    // 如果有初始内容，先展示（避免白屏）
    if (initialDoc.content) {
      setCurrentDoc(initialDoc);
    }
    // 后台请求最新数据（包含关联商品）
    fetchDocWithProducts(initialDoc.slug);
  }, [initialDoc, library, fetchDocWithProducts]);

  const handleSelectDoc = useCallback(
    async (slug: string) => {
      if (!library || !slug) return;
      if (currentDoc?.slug === slug) return;

      const node = findNodeBySlug(docTree || [], slug);
      if (node) {
        setCurrentDoc({
          id: node.id || '',
          title: node.title || '',
          slug: node.slug,
          content: '',
        });
      }

      await fetchDocWithProducts(slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [library, docTree, currentDoc, findNodeBySlug, fetchDocWithProducts]
  );

  if (!library || !docTree) {
    return (
      <div
        className="border-2 border-dashed text-center"
        style={{
          padding: 'var(--spacing-8, 2rem)',
          borderColor: sidebarBorder,
          color: loadingColor,
        }}
        ref={puck?.dragRef}
      >
        {t('placeholder')}
      </div>
    );
  }

  const finalUrlPattern = urlPattern || 'slug-only';

  return (
    <div
      className="flex flex-col"
      style={{
        backgroundColor: containerBg,
        color: containerText,
        borderTop: `1px solid ${sidebarBorder}`,
      }}
    >
      <div className="flex flex-col lg:flex-row">
        <aside
          className="flex-shrink-0 border-b lg:border-b-0 lg:border-r lg:sticky lg:top-0 lg:h-screen overflow-y-auto overflow-x-hidden w-full lg:w-auto"
          style={{
            backgroundColor: sidebarBg,
            borderColor: sidebarBorder,
          }}
        >
          <div
            className="lg:sticky lg:top-0 w-full lg:w-[var(--doc-sidebar-width,18.75rem)]"
            style={{
              paddingLeft: 'var(--spacing-4, 1rem)',
              paddingRight: 'var(--spacing-3, 0.75rem)',
              paddingTop: 'var(--spacing-5, 1.25rem)',
              paddingBottom: 'var(--spacing-5, 1.25rem)',
            }}
          >
            <DocsTree
              tree={docTree}
              librarySlug={library.slug}
              currentDocSlug={currentDoc?.slug || ''}
              locale={locale || 'zh'}
              basePath="docs"
              onSelect={handleSelectDoc}
              theme={{
                text: sidebarText,
                groupLabel: sidebarGroupLabel,
                activeBg: sidebarActiveBg,
                activeText: sidebarActiveText,
                activeBorder: sidebarActiveBorder,
                hoverBg: sidebarHoverBg,
                hoverText: sidebarHoverText,
                badgeBg: sidebarBadgeBg,
                badgeText: sidebarBadgeText,
                border: sidebarBorder,
              }}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0" ref={contentRef}>
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-10">
            <div className="doc-markdown max-w-none">
              {loading ? (
                <div
                  className="text-center"
                  style={{
                    paddingTop: 'var(--spacing-12, 3rem)',
                    paddingBottom: 'var(--spacing-12, 3rem)',
                    color: loadingColor,
                    transition: COLOR_TRANSITION,
                  }}
                >
                  {t('loading')}
                </div>
              ) : currentDoc ? (
                <>
                  <h1
                    style={{
                      color: titleColor,
                      transition: COLOR_TRANSITION,
                      paddingBottom: 'var(--spacing-3, 0.75rem)',
                      borderBottom: `1px solid ${sidebarBorder}`,
                      marginBottom: 'var(--spacing-8, 2rem)',
                    }}
                  >
                    {currentDoc.title}
                  </h1>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h2: ({ children, ...props }) => {
                        const text = String(children);
                        const id = makeHeadingSlug(text);
                        return (
                          <h2 id={id} {...props}>
                            {children}
                          </h2>
                        );
                      },
                      h3: ({ children, ...props }) => {
                        const text = String(children);
                        const id = makeHeadingSlug(text);
                        return (
                          <h3 id={id} {...props}>
                            {children}
                          </h3>
                        );
                      },
                    }}
                  >
                    {currentDoc.content || t('noContent')}
                  </ReactMarkdown>
                </>
              ) : (
                <div
                  className="text-center"
                  style={{
                    paddingTop: 'var(--spacing-12, 3rem)',
                    paddingBottom: 'var(--spacing-12, 3rem)',
                    color: loadingColor,
                    transition: COLOR_TRANSITION,
                  }}
                >
                  {t('selectDocHint')}
                </div>
              )}
            </div>

            {!loading && currentDoc && associatedProducts.length > 0 && (
              <div
                className="lg:hidden"
                style={{
                  marginTop: 'var(--spacing-12, 3rem)',
                  paddingTop: 'var(--spacing-8, 2rem)',
                  borderTop: `1px solid ${contentDivider}`,
                }}
              >
                {loadingProducts ? (
                  <div
                    className="text-center"
                    style={{
                      paddingTop: 'var(--spacing-8, 2rem)',
                      paddingBottom: 'var(--spacing-8, 2rem)',
                      color: loadingColor,
                      transition: COLOR_TRANSITION,
                    }}
                  >
                    {t('loadingProducts')}
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    style={{ gap: 'var(--spacing-6, 1.5rem)' }}
                  >
                    {associatedProducts.map((product) => {
                      const safeProduct = {
                        ...product,
                        slug: product.slug || product.productId,
                      };
                      return (
                        <ProductCard
                          key={product.productId}
                          product={safeProduct}
                          locale={locale || 'zh'}
                          urlPattern={finalUrlPattern}
                          openInNewTab={true}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {!loading && currentDoc && (
          <aside
            className="hidden lg:block flex-shrink-0 sticky top-0 h-screen overflow-y-auto"
            style={{
              width: TOC_WIDTH,
              backgroundColor: containerBg,
            }}
          >
            <div className="py-10 pr-6">
              <DocToc content={currentDoc.content || ''} />

              {associatedProducts.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--spacing-8, 2rem)',
                    paddingTop: 'var(--spacing-6, 1.5rem)',
                    borderTop: `1px solid ${contentDivider}`,
                  }}
                >
                  {loadingProducts ? (
                    <div
                      className="text-center"
                      style={{
                        paddingTop: 'var(--spacing-4, 1rem)',
                        paddingBottom: 'var(--spacing-4, 1rem)',
                        color: loadingColor,
                        fontSize: 'var(--font-size-sm, 0.875rem)',
                      }}
                    >
                      {t('loadingProducts')}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col"
                      style={{ gap: 'var(--spacing-4, 1rem)' }}
                    >
                      {associatedProducts.map((product) => {
                        const safeProduct = {
                          ...product,
                          slug: product.slug || product.productId,
                        };
                        return (
                          <ProductCard
                            key={product.productId}
                            product={safeProduct}
                            locale={locale || 'zh'}
                            urlPattern={finalUrlPattern}
                            openInNewTab={true}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}