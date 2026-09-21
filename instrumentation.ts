// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  console.log('[instrumentation] 开始预热全局配置...');

  const tasks = [
    {
      name: '站点设置',
      fn: async () => {
        const { getSiteSettings } = await import('@/lib/getSiteSettings');
        await getSiteSettings();
      },
    },
    {
      name: '语言设置',
      fn: async () => {
        const { getLanguageSettings } = await import('@/lib/languages/settings');
        await getLanguageSettings();
      },
    },
    {
      name: '首页（根路径）',
      fn: async () => {
        const { getHomePageId } = await import('@/lib/pages/storage');
        const { getEnabledLanguages } = await import('@/lib/languages/settings');
        const enabled = await getEnabledLanguages();
        const results = await Promise.all(
          enabled.map(async (loc) => ({ loc, id: await getHomePageId(loc) }))
        );
        const missing = results.filter((r) => !r.id).map((r) => r.loc);
        if (missing.length > 0) {
          console.warn(`[instrumentation] ⚠️ 以下语言缺少首页: ${missing.join(', ')}`);
        }
      },
    },
    {
      name: '布局模板（默认 5 个）',
      fn: async () => {
        const { getLayoutPageByTemplate } = await import('@/lib/pages/storage');
        const templateIds = [
          'default_document_library_published',
          'default_product_line_published',
          'default_product_published',
          'default_product_category_published',
          'default_video_category_published',
        ];
        const results = await Promise.all(
          templateIds.map((id) => getLayoutPageByTemplate('base', id))
        );
        const missing = templateIds.filter((_, i) => !results[i]);
        if (missing.length > 0) {
          console.warn(`[instrumentation] ⚠️ 以下布局模板在库中不存在: ${missing.join(', ')}`);
        }
      },
    },
    // ✅ 新增：产品搜索预热（热 Supabase 连接 + PG 执行计划）
    {
      name: '产品搜索（Supabase 连接预热）',
      fn: async () => {
        const { searchProducts } = await import('@/lib/products/indexDb');
        const results = await Promise.all([
          searchProducts('zh', undefined, '', undefined, undefined, 1, 12),
          searchProducts('en', undefined, '', undefined, undefined, 1, 12),
          searchProducts('zh', undefined, '', undefined, undefined, 1, 50),
        ]);
        console.log(
          `[instrumentation] 产品搜索预热: ${results.map((r, i) => `${i}=${r.total}`).join(', ')}`
        );
      },
    },
  ];

  for (const task of tasks) {
    const start = Date.now();
    try {
      await task.fn();
      console.log(`[instrumentation] ✅ ${task.name}预热完成 (${Date.now() - start}ms)`);
    } catch (err) {
      console.error(`[instrumentation] ❌ ${task.name}预热失败:`, err);
    }
  }

  console.log('[instrumentation] 预热完成');
}