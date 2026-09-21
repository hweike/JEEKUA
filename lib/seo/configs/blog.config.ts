// lib/seo/configs/blog.config.ts
import { PageTypeConfig } from '../types';
import { getTranslations } from 'next-intl/server';
import {
  getCachedBlogConfig,
  getCachedBlogCategories,
  getCachedBlogPosts,
  getCachedBlogPostsByCategorySlug,
  getCachedBlogPost,
  type BlogCategory,
  type BlogPost,
} from '@/lib/blog';
import { getSiteSettings } from '@/lib/getSiteSettings';

// ---------- 辅助函数 ----------
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function getBlogHomeUrl(locale: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/blog`;
}

function getBlogCategoryUrl(locale: string, slug: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/blogs/${slug}`;
}

function getBlogPostUrl(locale: string, slug: string, baseUrl: string): string {
  return `${baseUrl}/${locale}/blog/${slug}`;
}

// ✅ 改进的字数统计函数：统计中文字符和英文单词
function calculateWordCount(text: string): number {
  if (!text) return 0;
  // 移除 HTML 标签
  const plain = text.replace(/<[^>]*>/g, ' ');
  // 匹配中文字符或英文单词（连续字母数字）
  const matches = plain.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/g);
  return matches ? matches.length : 0;
}

// ---------- 1. 博客首页（blogCategory） ----------
export const blogCategoryConfig: PageTypeConfig<'blogCategory', any> = {
  type: 'blogCategory' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Blog' });
    const [blogConfig, categories, posts] = await Promise.all([
      getCachedBlogConfig(locale),
      getCachedBlogCategories(locale),
      getCachedBlogPosts(locale),
    ]);
    return {
      blogConfig,
      categories,
      posts,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { blogConfig, categories, posts, baseUrl, t } = data;
    const blogUrl = getBlogHomeUrl(locale, baseUrl);
    const siteUrl = baseUrl;
    const listPosts = posts.slice(0, 15);

    const breadcrumbHome = t('breadcrumb.home', 'Home');
    const breadcrumbBlog = t('breadcrumb.blog', 'Blog');

    const blogName = blogConfig.name || t('fallback.home.name', 'Blog');
    const blogTitle = blogConfig.seoTitle || `${blogName} | ${data.siteName}`;
    const blogDesc = blogConfig.seoDescription || getFallbackHomeDescription(data, locale);

    const breadcrumbItems = [
      { position: 1, name: breadcrumbHome, item: `${baseUrl}/${locale}` },
      { position: 2, name: breadcrumbBlog, item: blogUrl },
    ];

    const graph = [
      {
        '@type': 'Blog',
        '@id': `${blogUrl}#blog`,
        name: blogTitle,
        description: blogDesc,
        url: blogUrl,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${blogUrl}#collectionpage`,
        name: blogTitle,
        description: blogDesc,
        url: blogUrl,
        mainEntity: {
          '@type': 'ItemList',
          '@id': `${blogUrl}#itemlist`,
          numberOfItems: posts.length,
          itemListElement: listPosts.map((post: BlogPost, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'BlogPosting',
              headline: post.title,
              url: `${baseUrl}/${locale}/blog/${post.slug}`,
              image: post.image || blogConfig.image || '',
              description: post.excerpt || post.content?.slice(0, 200) || '',
              author: post.author ? { '@type': 'Person', name: post.author } : undefined,
              datePublished: post.date,
            },
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
          '@type': 'ListItem',
          position,
          name,
          item,
        })),
      },
    ];

    return { '@context': 'https://schema.org', '@graph': graph };
  },
  getTitle: (data: any, locale: string) => {
    const { blogConfig } = data;
    if (blogConfig.seoTitle) return blogConfig.seoTitle;
    return blogConfig.name || 'Blog';
  },
  getDescription: (data: any, locale: string) => {
    const { blogConfig } = data;
    if (blogConfig.seoDescription) return blogConfig.seoDescription;
    return getFallbackHomeDescription(data, locale);
  },
  getImage: (data: any, locale: string) => data.blogConfig.image || '',
  getNoindex: () => false,
  getCanonical: (data: any, baseUrl: string, locale: string) => getBlogHomeUrl(locale, baseUrl),
};

// ---------- 2. 博客分类页（blogCollection） ----------
export const blogCollectionConfig: PageTypeConfig<'blogCollection', any> = {
  type: 'blogCollection' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Blog' });
    const [blogConfig, categories, posts] = await Promise.all([
      getCachedBlogConfig(locale),
      getCachedBlogCategories(locale),
      getCachedBlogPostsByCategorySlug(locale, slug),
    ]);
    const category = categories.find((c: BlogCategory) => c.slug === slug) || null;
    if (!category) return null;
    return {
      blogConfig,
      category,
      posts,
      total: posts.length,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { blogConfig, category, posts, baseUrl, t } = data;
    const blogUrl = getBlogHomeUrl(locale, baseUrl);
    const categoryUrl = getBlogCategoryUrl(locale, category.slug, baseUrl);
    const siteUrl = baseUrl;

    const categoryName = category.name || category.slug;
    const categoryTitle = category.seoTitle || `${categoryName} | ${data.siteName}`;
    const categoryDesc = category.seoDescription || getFallbackCategoryDescription(data, locale);

    const breadcrumbItems = [
      { position: 1, name: t('breadcrumb.home', 'Home'), item: `${baseUrl}/${locale}` },
      { position: 2, name: t('breadcrumb.blog', 'Blog'), item: blogUrl },
      { position: 3, name: categoryName, item: categoryUrl },
    ];

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Blog',
          '@id': `${blogUrl}#blog`,
          publisher: { '@id': `${siteUrl}/#organization` },
        },
        {
          '@type': 'CollectionPage',
          '@id': `${categoryUrl}#collectionpage`,
          name: categoryTitle,
          description: categoryDesc,
          url: categoryUrl,
          mainEntity: {
            '@type': 'ItemList',
            '@id': `${categoryUrl}#itemlist`,
            numberOfItems: posts.length,
            itemListElement: posts.map((post: BlogPost, index: number) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'BlogPosting',
                headline: post.title,
                url: `${baseUrl}/${locale}/blog/${post.slug}`,
                image: post.image || blogConfig.image || '',
                description: post.excerpt || post.content?.slice(0, 200) || '',
                author: post.author ? { '@type': 'Person', name: post.author } : undefined,
                datePublished: post.date,
              },
            })),
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
            '@type': 'ListItem',
            position,
            name,
            item,
          })),
        },
      ],
    };
  },
  getTitle: (data: any, locale: string) => {
    const { category } = data;
    if (category.seoTitle) return category.seoTitle;
    const categoryName = category.name || category.slug;
    return categoryName;
  },
  getDescription: (data: any, locale: string) => {
    const { category } = data;
    if (category.seoDescription) return category.seoDescription;
    return getFallbackCategoryDescription(data, locale);
  },
  getImage: (data: any, locale: string) => data.category.image || data.blogConfig.image || '',
  getNoindex: (data: any) => !data.posts || data.posts.length === 0,
  getCanonical: (data: any, baseUrl: string, locale: string) => getBlogCategoryUrl(locale, data.category.slug, baseUrl),
};

// ---------- 3. 博客文章详情页（blogPost） ----------
export const blogPostConfig: PageTypeConfig<'blogPost', any> = {
  type: 'blogPost' as any,
  getDataFetcher: () => async (slug: string, locale: string) => {
    const settings = await getSiteSettings();
    const siteName = settings.siteName || 'Site Name';
    const baseUrl = (settings.websiteUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    const t = await getTranslations({ locale, namespace: 'Blog' });
    const post = await getCachedBlogPost(locale, slug);
    if (!post) return null;
    const categories = await getCachedBlogCategories(locale);
    const category = categories.find((c: BlogCategory) => c.id === post.category) || null;
    return {
      post,
      category,
      siteName,
      baseUrl,
      t,
    };
  },
  mapToStructuredData: (data: any, locale: string) => {
    const { post, category, baseUrl, siteName, t } = data;
    const blogUrl = getBlogHomeUrl(locale, baseUrl);
    const postUrl = getBlogPostUrl(locale, post.slug, baseUrl);
    const categoryUrl = category ? getBlogCategoryUrl(locale, category.slug, baseUrl) : null;

    const breadcrumbHome = t('breadcrumb.home', 'Home');
    const breadcrumbBlog = t('breadcrumb.blog', 'Blog');

    const postDesc = post.seoDescription || getFallbackPostDescription(data, locale);

    const graph: any[] = [
      {
        '@type': 'BlogPosting',
        '@id': `${postUrl}#blogposting`,
        headline: post.title,
        description: postDesc,
        image: post.image || '',
        author: { '@type': 'Person', name: post.author || 'Author' },
        publisher: { '@type': 'Organization', name: siteName, logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` } },
        datePublished: post.date,
        dateModified: post.date || new Date().toISOString(),
        mainEntityOfPage: postUrl,
        keywords: post.tags?.join(', ') || '',
        articleSection: category?.name || '',
        // ✅ 使用改进后的字数统计
        wordCount: calculateWordCount(post.content || ''),
        isAccessibleForFree: true,
        articleBody: post.content || '',
      },
      {
        '@type': 'Article',
        '@id': `${postUrl}#article`,
        headline: post.title,
        description: postDesc,
        image: post.image || '',
        author: { '@type': 'Person', name: post.author || 'Author' },
        publisher: { '@type': 'Organization', name: siteName },
        datePublished: post.date,
        dateModified: post.date || new Date().toISOString(),
        mainEntityOfPage: postUrl,
      },
    ];

    const breadcrumbItems = [
      { position: 1, name: breadcrumbHome, item: `${baseUrl}/${locale}` },
      { position: 2, name: breadcrumbBlog, item: blogUrl },
    ];
    if (category) {
      breadcrumbItems.push({ position: 3, name: category.name, item: categoryUrl || '' });
    }
    breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: post.title, item: postUrl });

    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
        '@type': 'ListItem',
        position,
        name,
        item: item || '',
      })),
    });

    return { '@context': 'https://schema.org', '@graph': graph };
  },
  getTitle: (data: any, locale: string) => {
    const { post } = data;
    if (post.seoTitle) return post.seoTitle;
    return post.title || '';
  },
  getDescription: (data: any, locale: string) => {
    const { post } = data;
    if (post.seoDescription) return post.seoDescription;
    return getFallbackPostDescription(data, locale);
  },
  getImage: (data: any, locale: string) => data.post.image || '',
  getNoindex: () => false,
  getCanonical: (data: any, baseUrl: string, locale: string) => getBlogPostUrl(locale, data.post.slug, baseUrl),
};

// ---------- fallback 描述生成（纯拼接，无占位符） ----------

function getFallbackHomeDescription(data: any, locale: string): string {
  const { blogConfig, siteName, t } = data;
  const blogName = blogConfig.name || t('fallback.home.name', 'Blog');
  const suffix = t('fallback.home.description', 'latest insights and trends.');
  return `${blogName} - ${suffix}`;
}

function getFallbackCategoryDescription(data: any, locale: string): string {
  const { category, blogConfig, siteName, t } = data;
  const categoryName = category.name || category.slug;
  const blogName = blogConfig.name || t('fallback.home.name', 'Blog');
  const suffix = t('fallback.category.suffix', 'Category');
  return `${categoryName} ${suffix}`;
}

function getFallbackPostDescription(data: any, locale: string): string {
  const { post, siteName, t } = data;
  const titleText = post.title || 'Article';
  const suffix = t('fallback.post.suffix', 'Post');
  return `${titleText} - ${suffix}`;
}