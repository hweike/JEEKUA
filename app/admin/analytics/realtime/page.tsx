// app/admin/analytics/realtime/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Eye,
  Users,
  MousePointerClick,
  Globe,
  Search,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/analytics/PageHeader';
import { WorldMap } from '@/components/admin/analytics/WorldMap';
import { RealtimeChart } from '@/components/admin/analytics/RealtimeChart';
import { RealtimeActivityLog } from '@/components/admin/analytics/RealtimeActivityLog';
import { RealtimeMetricsCard } from '@/components/admin/analytics/RealtimeMetricsCard';
import { RealtimeList } from '@/components/admin/analytics/RealtimeList';
import type { DateRange } from '@/components/admin/analytics/DateRangePicker';
import type { MetricItem, PageviewPoint } from '@/lib/umami';

// 实时数据接口
interface RealtimeStats {
  pageviews: number;
  visitors: number;
  events: number;
  countries: number;
}

interface RealtimePageview {
  path: string;
  title?: string;
  count: number;
}

interface RealtimeReferrer {
  url: string;
  count: number;
}

interface RealtimeCountry {
  code: string;
  name: string;
  count: number;
}

export default function RealtimePage() {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [startAt, setStartAt] = useState<number>(Date.now() - 30 * 60 * 1000); // 最近30分钟
  const [endAt, setEndAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // 实时数据状态
  const [stats, setStats] = useState<RealtimeStats>({
    pageviews: 0,
    visitors: 0,
    events: 0,
    countries: 0,
  });
  const [pageviews, setPageviews] = useState<PageviewPoint[]>([]);
  const [topPages, setTopPages] = useState<RealtimePageview[]>([]);
  const [topReferrers, setTopReferrers] = useState<RealtimeReferrer[]>([]);
  const [topCountries, setTopCountries] = useState<RealtimeCountry[]>([]);
  const [countryData, setCountryData] = useState<MetricItem[]>([]);
  
  // 活动日志
  const [activities, setActivities] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'pageview' | 'session' | 'event'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 自动刷新定时器
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchRealtimeData();
    // 每10秒自动刷新
    intervalRef.current = setInterval(() => {
      fetchRealtimeData(true);
    }, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchRealtimeData = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const now = Date.now();
      const start = now - 30 * 60 * 1000; // 最近30分钟
      const end = now;

      // 并行请求所有实时数据
      const [
        statsRes,
        pageviewsRes,
        pagesRes,
        referrersRes,
        countriesRes,
        activeRes,
      ] = await Promise.all([
        fetch(`/api/admin/analytics/stats?startAt=${start}&endAt=${end}`),
        fetch(`/api/admin/analytics/pageviews?startAt=${start}&endAt=${end}&unit=minute`),
        fetch(`/api/admin/analytics/metrics?startAt=${start}&endAt=${end}&type=url&limit=10`),
        fetch(`/api/admin/analytics/metrics?startAt=${start}&endAt=${end}&type=referrer&limit=10`),
        fetch(`/api/admin/analytics/metrics?startAt=${start}&endAt=${end}&type=country&limit=10`),
        fetch(`/api/admin/analytics/active`),
      ]);

      const statsData = await statsRes.json();
      const pageviewsData = await pageviewsRes.json();
      const pagesData = await pagesRes.json();
      const referrersData = await referrersRes.json();
      const countriesData = await countriesRes.json();
      const activeData = await activeRes.json();

      // 更新状态
      setStats({
        pageviews: statsData?.pageviews || 0,
        visitors: statsData?.visitors || 0,
        events: statsData?.visits || 0,
        countries: countriesData?.length || 0,
      });

      setPageviews(Array.isArray(pageviewsData) ? pageviewsData : []);
      setTopPages(Array.isArray(pagesData) ? pagesData.map((p: any) => ({ path: p.x, count: p.y })) : []);
      setTopReferrers(Array.isArray(referrersData) ? referrersData.map((r: any) => ({ url: r.x, count: r.y })) : []);
      setTopCountries(Array.isArray(countriesData) ? countriesData.map((c: any) => ({ code: c.x, name: c.x, count: c.y })) : []);
      setCountryData(Array.isArray(countriesData) ? countriesData : []);

      // 生成模拟活动日志（实际应从 active sessions API 获取）
      generateActivities(activeData.visitors || 0);

      setStartAt(start);
      setEndAt(end);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 生成模拟活动日志（实际应从真实的 session 数据获取）
  const generateActivities = (visitorCount: number) => {
    const types = ['pageview', 'session', 'event'] as const;
    const events = ['页面浏览', '新会话', '点击按钮', '提交表单', '滚动', '停留'];
    const pages = ['/products', '/blog', '/about', '/contact', '/pricing', '/docs', '/api'];
    
    const newActivities = [];
    const count = Math.min(visitorCount + 5, 20);
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      newActivities.push({
        id: `act-${Date.now()}-${i}`,
        type,
        event: type === 'event' ? events[Math.floor(Math.random() * events.length)] : undefined,
        path: pages[Math.floor(Math.random() * pages.length)],
        visitorId: `visitor-${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
        browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
        country: ['中国', '美国', '英国', '德国', '日本'][Math.floor(Math.random() * 5)],
      });
    }
    // 按时间倒序排列
    newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setActivities(newActivities);
  };

  const handleRefresh = () => {
    fetchRealtimeData(false);
  };

  const handleDateChange = (range: DateRange, start: number, end: number) => {
    setDateRange(range);
    // 实时页面使用固定30分钟窗口
    fetchRealtimeData(false);
  };

  const filteredActivities = activities.filter(activity => {
    if (activityFilter !== 'all' && activity.type !== activityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        activity.path?.toLowerCase().includes(query) ||
        activity.visitorId?.toLowerCase().includes(query) ||
        activity.country?.toLowerCase().includes(query) ||
        activity.event?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实时在线</h1>
          <p className="text-sm text-gray-500 mt-0.5">实时监控网站访问动态</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <span className="text-xs text-green-600 flex items-center gap-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            实时更新中
          </span>
        </div>
      </div>

      {/* 4个核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RealtimeMetricsCard
          icon={Eye}
          label="浏览量"
          value={stats.pageviews}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <RealtimeMetricsCard
          icon={Users}
          label="访客"
          value={stats.visitors}
          color="text-green-600"
          bg="bg-green-50"
        />
        <RealtimeMetricsCard
          icon={MousePointerClick}
          label="行为类别"
          value={stats.events}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <RealtimeMetricsCard
          icon={Globe}
          label="国家/地区"
          value={stats.countries}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* 实时趋势图 */}
      <RealtimeChart data={pageviews} loading={loading} />

      {/* 活动日志 + 网页列表 + 来源列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 活动日志 */}
        <RealtimeActivityLog
          activities={filteredActivities}
          filter={activityFilter}
          onFilterChange={setActivityFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
        />

        {/* 网页列表 */}
        <RealtimeList
          title="网页"
          items={topPages.map(p => ({ name: p.path, value: p.count }))}
          loading={loading}
          valueLabel="浏览量"
        />
      </div>

      {/* 来源域名 + 国家/地区 + 世界地图 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RealtimeList
          title="来源域名"
          items={topReferrers.map(r => ({ name: r.url || '直接访问', value: r.count }))}
          loading={loading}
          valueLabel="浏览量"
        />
        <RealtimeList
          title="国家/地区"
          items={topCountries.map(c => ({ name: c.name, value: c.count }))}
          loading={loading}
          valueLabel="访客"
        />
        <div className="bg-white border border-edge rounded-lg p-4 shadow-sm col-span-1">
          <h3 className="text-sm font-medium text-gray-700 mb-3">全球分布</h3>
          <WorldMap data={countryData} loading={loading} height={250} />
        </div>
      </div>
    </div>
  );
}