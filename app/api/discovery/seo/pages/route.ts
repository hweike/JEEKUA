// app/api/discovery/seo/pages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { calculateSeoScore } from '@/lib/seo/utils/score';
import { strategiesService } from '@/lib/seo/services';

const DEFAULT_SITE_ID = '000001';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // ====== 1. 解析查询参数 ======
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

    // ====== 2. 构建基础查询 ======
    let countQuery = supabase
      .from('pages')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', DEFAULT_SITE_ID);

    let dataQuery = supabase
      .from('pages')
      .select('id, title, type, locale, url, seo_title, seo_description, seo_keywords, updatedAt')
      .eq('site_id', DEFAULT_SITE_ID);

    // ====== 3. 处理 locale（支持逗号分隔的多个语言，如 "zh,global"） ======
    if (localeParam && localeParam !== 'all') {
      const locales = localeParam.split(',').filter(Boolean);
      if (locales.length === 1) {
        countQuery = countQuery.eq('locale', locales[0]);
        dataQuery = dataQuery.eq('locale', locales[0]);
      } else if (locales.length > 1) {
        countQuery = countQuery.in('locale', locales);
        dataQuery = dataQuery.in('locale', locales);
      }
    }

    // ====== 4. 处理类型筛选（支持逗号分隔的多类型） ======
    if (typeParam && typeParam !== 'all') {
      const types = typeParam.split(',').filter(Boolean);
      if (types.length === 1) {
        countQuery = countQuery.eq('type', types[0]);
        dataQuery = dataQuery.eq('type', types[0]);
      } else if (types.length > 1) {
        countQuery = countQuery.in('type', types);
        dataQuery = dataQuery.in('type', types);
      }
    }

    // ====== 5. 关键词搜索 ======
    if (keyword) {
      countQuery = countQuery.ilike('title', `%${keyword}%`);
      dataQuery = dataQuery.ilike('title', `%${keyword}%`);
    }

    // ====== 6. 获取总数 ======
    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      console.error('[SEO Pages API] 计数查询失败:', countError);
      throw new Error(`计数查询失败: ${countError.message}`);
    }

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // ====== 7. 获取当前页数据 ======
    const { data: pages, error: pagesError } = await dataQuery
      .order('updatedAt', { ascending: false })
      .range(from, to);

    if (pagesError) {
      console.error('[SEO Pages API] 分页查询失败:', pagesError);
      throw new Error(`分页查询失败: ${pagesError.message}`);
    }

    console.log(`[SEO Pages API] 获取到 ${pages?.length || 0} 条数据，总计 ${total} 条`);

    if (!pages || pages.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, pageSize, total, totalPages },
      });
    }

    // ====== 8. 批量查询 page_seo_data ======
    const pageIds = pages.map((p) => p.id).filter((id) => id && typeof id === 'string' && id.trim().length > 0);

    let statusMap: Record<string, string> = {};
    let keywordMap: Record<string, string[]> = {};

    if (pageIds.length > 0) {
      const { data: seoData, error: seoError } = await supabase
        .from('page_seo_data')
        .select('page_id, locale, generation_status, analyzed_keywords')
        .in('page_id', pageIds)
        .eq('site_id', DEFAULT_SITE_ID);

      if (!seoError && seoData) {
        seoData.forEach((item) => {
          const key = `${item.page_id}_${item.locale}`;
          statusMap[key] = item.generation_status;
          keywordMap[key] = item.analyzed_keywords || [];
        });
      } else {
        console.warn('[SEO Pages API] page_seo_data 查询失败:', seoError?.message);
      }
    }

    // ====== 9. 状态筛选（内存过滤） ======
    let filteredPages = pages;
    if (status !== 'all') {
      filteredPages = pages.filter((page) => {
        const key = `${page.id}_${page.locale}`;
        return (statusMap[key] || 'pending') === status;
      });
    }

    // ====== 10. 获取策略配置 ======
    let strategies = [];
    try {
      strategies = await strategiesService.getStrategies(DEFAULT_SITE_ID);
    } catch (strategyError) {
      console.warn('[SEO Pages API] 获取策略配置失败:', strategyError);
    }
    const strategyMap: Record<string, any> = {};
    strategies.forEach((s) => {
      strategyMap[s.page_type] = s.fields;
    });

    // ====== 11. 计算评分 ======
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
          } catch (e) {
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