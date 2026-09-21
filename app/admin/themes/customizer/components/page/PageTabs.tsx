'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { ThemeData } from '../../types';
import PageHome from './PageHome';
import PageProducts from './PageProducts';
import PageBlog from './PageBlog';
import PageDocs from './PageDocs';
import PageVideo from './PageVideo';
import PageInquiry from './PageInquiry';
import PageAccount from './PageAccount';
import PageCustom from './PageCustom';
import PageSearch from './PageSearch';  // ✅ 新增

interface PageTabsProps {
  pageType: string;
  customPath: string;
  theme: ThemeData;
  globalTheme?: ThemeData;
  onUpdate: (category: keyof ThemeData, key: string, value: string) => void;
  onDarkModeUpdate: (value: string) => void;
}

// 页面组件映射
const PAGE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  home: PageHome,
  products: PageProducts,
  blog: PageBlog,
  docs: PageDocs,
  video: PageVideo,
  inquiry: PageInquiry,
  account: PageAccount,
  custom: PageCustom,
  search: PageSearch,  // ✅ 新增
};

// 页面显示名称
const PAGE_LABELS: Record<string, string> = {
  home: '首页',
  products: '产品页',
  blog: 'Blog',
  docs: '文档页',
  video: '视频页',
  inquiry: '询盘页',
  account: '用户中心',
  custom: '普通页面',
  search: '搜索页',  // ✅ 新增
};

// 每种页面类型对应的标签配置
const PAGE_TABS_CONFIG: Record<string, { value: string; label: string }[]> = {
  home: [
    { value: 'colors', label: '颜色' },
  ],
  products: [
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
    // { value: 'typography', label: '文字' },
    // { value: 'spacing', label: '间距' },
  ],
  blog: [
    { value: 'colors', label: '颜色' },
    // { value: 'typography', label: '文字' },
  ],
  docs: [
    { value: 'colors', label: '颜色' },
    // { value: 'typography', label: '文字' },
    // { value: 'spacing', label: '间距' },
  ],
  video: [
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
  ],
  inquiry: [
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
  ],
  account: [
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
  ],
  custom: [
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
    // { value: 'typography', label: '文字' },
    // { value: 'spacing', label: '间距' },
  ],
  search: [  // ✅ 新增
    { value: 'colors', label: '颜色' },
    // { value: 'components', label: '组件' },
    // { value: 'typography', label: '文字' },
    // { value: 'spacing', label: '间距' },
  ],
};

export default function PageTabs({
  pageType,
  customPath,
  theme,
  globalTheme,
  onUpdate,
  onDarkModeUpdate,
}: PageTabsProps) {
  const Component = PAGE_COMPONENTS[pageType] || PageHome;
  const displayName = PAGE_LABELS[pageType] || '页面';
  const tabsConfig = PAGE_TABS_CONFIG[pageType] || PAGE_TABS_CONFIG.custom;

  // 如果只有一个标签，可以不显示标签列表，直接显示内容
  const showTabs = tabsConfig.length > 1;

  // 如果是首页（或只有一个标签），直接渲染组件，不包裹 Tabs
  if (!showTabs) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{displayName}</h2>
          {pageType === 'custom' && customPath && (
            <span className="text-sm text-gray-500">({customPath})</span>
          )}
        </div>
        <Component
          theme={theme}
          globalTheme={globalTheme || theme}
          onUpdate={onUpdate}
          onDarkModeUpdate={onDarkModeUpdate}
        />
      </div>
    );
  }

  // 多个标签时，使用 Tabs 容器
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{displayName}</h2>
        {pageType === 'custom' && customPath && (
          <span className="text-sm text-gray-500">({customPath})</span>
        )}
      </div>

      <Tabs.Root defaultValue={tabsConfig[0].value} className="space-y-4">
        <Tabs.List className="flex flex-wrap gap-1 border-b">
          {tabsConfig.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="px-4 py-2 text-sm font-medium rounded-t-md data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 hover:text-gray-900"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {tabsConfig.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value} className="mt-4">
            <Component
              theme={theme}
              globalTheme={globalTheme || theme}
              onUpdate={onUpdate}
              onDarkModeUpdate={onDarkModeUpdate}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}