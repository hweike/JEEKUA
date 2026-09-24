// app/api/discovery/seo/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { calculateSeoScore } from '@/lib/seo/utils/score';
import { strategiesService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // 1. 解析查询参数
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)))
    );
    const localeParam = searchParams.get('locale') || 'zh';
    const status = searchParams.get('status') || 'all';
    const typeParam = searchParams.get('type') || 'all';
    const keyword = searchParams.get('keyword') || '';

    console.log(`[SEO Pages API] 查询参数: page=${page}, pageSize=${pageSize}, locale=${localeParam}, status=${status}, type=${typeParam}, keyword=${keyword}`);

    // 2. 构建动态 WHERE
    const conditions: any[] = [sql`site_id = ${DEFAULT_SITE_ID}`];

    // locale（支持逗号分隔）
    if (localeParam && localeParam !== 'all') {
      const locales = localeParam.split(',').filter(Boolean);
      if (locales.length === 1) {
        conditions.push(sql`locale = ${locales[0]}`);
      } else if (locales.length > 1) {
        conditions.push(sql`locale IN ${sql(locales)}`);
      }
    }

    // type（支持逗号分隔）
    if (typeParam && typeParam !== 'all') {
      const types = typeParam.split(',').filter(Boolean);
      if (types.length === 1) {
        conditions.push(sql`type = ${types[0]}`);
      } else if (types.length > 1) {
        conditions.push(sql`type IN ${sql(types)}`);
      }
    }

    // keyword
    if (keyword) {
      conditions.push(sql`title ILIKE ${'%' + keyword + '%'}`);
    }

    const whereClause = conditions.reduce(
      (acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`),
      sql``
    );

    // 3. 总数
    let total = 0;
    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.pages WHERE ${whereClause}
      `;
      total = parseInt(countRows[0]?.count || '0', 10);
    } catch (countError: any) {
      console.error('[SEO Pages API] 计数查询失败:', countError);
      throw new Error(`计数查询失败: ${countError.message}`);
    }

    const totalPages = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    // 4. 分页数据
    let pages: any[];
    try {
      pages = await sql<any[]>`
        SELECT id, title, type, locale, url, seo_title, seo_description, seo_keywords, "updatedAt"
        FROM public.pages
        WHERE ${whereClause}
        ORDER BY "updatedAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
    } catch (pagesError: any) {
      console.error('[SEO Pages API] 分页查询失败:', pagesError);
      throw new Error(`分页查询失败: ${pagesError.message}`);
    }

    console.log(`[SEO Pages API] 获取到 ${pages.length} 条数据，总计 ${total} 条`);

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total, totalPages },
      });
    }

    // 5. 批量查询 page_seo_data
    const pageIds = pages.map((p) => p.id).filter((id) => id && typeof id === 'string' && id.trim().length > 0);

    let statusMap: Record<string, string> = {};
    let keywordMap: Record<string, string[]> = {};

    if (pageIds.length > 0) {
      try {
        const seoData = await sql<{ page_id: string; locale: string; generation_status: string; analyzed_keywords: string[] | null }[]>`
          SELECT page_id, locale, generation_status, analyzed_keywords
          FROM public.page_seo_data
          WHERE page_id IN ${sql(pageIds)}
            AND site_id = ${DEFAULT_SITE_ID}
        `;
        seoData.forEach((item) => {
          const key = `${item.page_id}_${item.locale}`;
          statusMap[key] = item.generation_status;
          keywordMap[key] = item.analyzed_keywords || [];
        });
      } catch (seoError: any) {
        console.warn('[SEO Pages API] page_seo_data 查询失败:', seoError?.message);
      }
    }

    // 6. 状态筛选（内存过滤）
    let filteredPages = pages;
    if (status !== 'all') {
      filteredPages = pages.filter((page) => {
        const key = `${page.id}_${page.locale}`;
        return (statusMap[key] || 'pending') === status;
      });
    }

    // 7. 获取策略配置
    let strategies: any[] = [];
    try {
      strategies = await strategiesService.getStrategies(DEFAULT_SITE_ID);
    } catch (strategyError) {
      console.warn('[SEO Pages API] 获取策略配置失败:', strategyError);
    }
    const strategyMap: Record<string, any> = {};
    strategies.forEach((s) => {
      strategyMap[s.page_type] = s.fields;
    });

    // 8. 计算评分
    const result = filteredPages.map((page) => {
      const fields = strategyMap[page.type] || {};
      const config = {
        titleMinLength: fields?.seo_title?.minLength || 30,
        titleMaxLength: fields?.seo_title?.maxLength || 60,
        descMinLength: fields?.seo_description?.minLength || 80,
        descMaxLength: fields?.seo_description?.maxLength || 160,
        keywordMinCount: fields?.seo_keywords?.minCount || 2,
        keywordMaxCount: fields?.seo_keywords?.maxCount || 5,
      };

      let keywords: string[] = [];
      if (page.seo_keywords) {
        if (typeof page.seo_keywords === 'string') {
          keywords = page.seo_keywords.split(',').map((k) => k.trim()).filter(Boolean);
        } else if (Array.isArray(page.seo_keywords)) {
          keywords = page.seo_keywords.filter((k) => k && k.trim()).map((k) => k.trim());
        } else if (typeof page.seo_keywords === 'object') {
          try {
            const str = JSON.stringify(page.seo_keywords);
            keywords = str.replace(/[\[\]"]/g, '').split(',').map((k) => k.trim()).filter(Boolean);
          } catch {
            keywords = [];
          }
        }
      }

      const analyzed = keywordMap[`${page.id}_${page.locale}`] || [];

      let score;
      try {
        score = calculateSeoScore(
          page.seo_title,
          page.seo_description,
          keywords,
          analyzed,
          config
        );
      } catch (scoreError) {
        console.error(`[SEO Pages API] 计算页面 ${page.id} 评分失败:`, scoreError);
        score = {
          score: 0,
          level: 'poor',
          color: '#ef4444',
          label: '待优化',
          dimensions: {
            seo_title: { score: 0, maxScore: 40, checks: [] },
            seo_description: { score: 0, maxScore: 40, checks: [] },
            seo_keywords: { score: 0, maxScore: 20, checks: [] },
          },
          suggestions: ['评分计算失败'],
        };
      }

      return {
        id: page.id,
        title: page.title,
        type: page.type,
        typeLabel: page.type,
        locale: page.locale,
        url: page.url,
        seo: {
          metaTitle: page.seo_title,
          metaDescription: page.seo_description,
          metaKeywords: page.seo_keywords,
        },
        seoStatus: (statusMap[`${page.id}_${page.locale}`] as any) || 'pending',
        seoScore: score.score,
        seoLevel: score.level,
        seoColor: score.color,
        seoLabel: score.label,
        updatedAt: page.updatedAt,
      };
    });

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        returnedCount: result.length,
      },
    });
  } catch (error: any) {
    console.error('[SEO Pages API] 整体错误:', error);
    return NextResponse.json(
      {
        error: error.message || '获取页面列表失败',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}