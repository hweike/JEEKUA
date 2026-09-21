'use client';

import {
  VideoIcon,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Package,
  FileText,
  Mail,
  BookOpen,
  Newspaper,
  Settings,
  Palette,
  Menu,
  PanelTop,
  PanelBottom,
  Users,
  UserCircle,
  LogOut,
  Key,
  Languages,
  BarChart3,
  LayoutTemplate,
  Tags,
  Search,
  Map,
  RefreshCw,
  History,
  Sliders,
  Scan,
  MessageCircle,
  Activity,
  Gauge,
  PieChart,
  LayoutDashboard,
  Layers,
  CloudDownload,
  FolderOpen,
  File,
  CreditCard,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Toaster, toast } from 'sonner';   // ✅ 新增

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

// 辅助函数：根据路径获取菜单名称（用于日志）
function getMenuNameByPath(path: string): string {
  const mapping: Record<string, string> = {
    '/admin/products': '产品分类',
    '/admin/products/manage': '产品管理',
    '/admin/products/productlines': '产品线管理',
    '/admin/productCrawl': '产品采集',
    '/admin/docs': '文档管理',
    '/admin/docs/docs-libs': '文档库管理',
    '/admin/blog': 'Blog文章',
    '/admin/blog/categories': 'Blog分类',
    '/admin/videosys/categories': '视频分类',
    '/admin/videosys/videos': '视频管理',
    '/admin/crm': '客户列表',
    '/admin/inquiries': '客户询盘',
    '/admin/pages': '页面管理',
    '/admin/webbuilder': '网页模板',
    '/admin/themes': '网站主题',
    '/admin/menus': '菜单管理',
    '/admin/settings/languages': '多语言站点',
    '/admin/settings/header': '页头设置',
    '/admin/settings/footer': '页脚设置',
    '/admin/settings/admins': '网站管理员',
    '/admin/logs': '网站日志',
    '/admin/profile': '个人信息',
    '/admin/account': '修改密码',
    '/admin/discovery/search': '全站搜索',
    '/admin/discovery/scan': '页面索引',
    '/admin/litechat': 'Chat Online',
    '/admin/analytics': '流量分析-概览',
    '/admin/analytics/realtime': '流量分析-实时',
    '/admin/analytics/behavior': '流量分析-行为类别',
    '/admin/analytics/sessions': '流量分析-会话',
    '/admin/analytics/performance': '流量分析-性能',
    '/admin/analytics/compare': '流量分析-比较',
    '/admin/analytics/audience': '流量分析-受众细分',
    '/admin/files': '文件管理',
    '/admin/payment/orders': '订单管理',
    '/admin/payment/accounts': '收款账户',
  };
  return mapping[path] || path;
}

function getMenuKeyByName(menuName: string): string {
  const mapping: Record<string, string> = {
    '产品目录': 'products',
    '知识文档': 'knowledgeDocs',
    'Blog管理': 'blogManage',
    '短视频': 'video',
    '客户管理': 'customer',
    '页面管理': 'pageManagement',
    '网站设置': 'website',
    '站点同步与翻译': 'translate',
    '智能SEO': 'smartSEO',
    '流量分析': 'analytics',
    '文件空间': 'files',
    '收款服务': 'payment',
  };
  return mapping[menuName] || menuName;
}

function getAllParentKeys(menuConfig: MenuItem[]): string[] {
  const keys: string[] = [];
  menuConfig.forEach(item => {
    if (item.children && item.children.length > 0) {
      keys.push(getMenuKeyByName(item.name));
    }
  });
  return keys;
}

function findParentMenuKey(pathname: string, menuConfig: MenuItem[]): string | null {
  for (const item of menuConfig) {
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        if (child.href) {
          const isMatch = child.href === '/admin'
            ? pathname === child.href
            : pathname?.startsWith(child.href);
          if (isMatch) {
            return getMenuKeyByName(item.name);
          }
        }
      }
    }
  }
  return null;
}

function getCurrentPageName(pathname: string, menuConfig: MenuItem[]): string | null {
  const matches: { name: string; href: string }[] = [];
  const traverse = (items: MenuItem[]) => {
    for (const item of items) {
      if (item.href) {
        if (item.href === pathname || pathname.startsWith(item.href + '/')) {
          matches.push({ name: item.name, href: item.href });
        }
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  };
  traverse(menuConfig);
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => a.href.length > b.href.length ? a : b);
  return best.name;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const userMenuRef = useRef<HTMLDivElement>(null);
  const lastLoggedPath = useRef<string>('');
  const fetchAttempts = useRef(0);
  const hasFetched = useRef(false);
  const MAX_RETRIES = 2;

  // ============================================================
  // ✅ 新增：监听 Supabase 超时事件，弹 Toast（30 秒节流）
  // ============================================================
  useEffect(() => {
    let lastShown = 0;

    const handler = () => {
      const now = Date.now();
      if (now - lastShown < 30_000) return;
      lastShown = now;

      toast.warning('网络连接异常，请稍后刷新', {
        duration: 5000,
        position: 'top-right',
      });
    };

    window.addEventListener('supabase-timeout', handler);
    return () => window.removeEventListener('supabase-timeout', handler);
  }, []);
  // ============================================================

  // ✅ 设置后台专属 Favicon
  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/admin-favicon.png';
  }, []);

  const fetchUser = useCallback(async () => {
    if (hasFetched.current) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch('/api/admin/me', {
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setCurrentUser({
        name: data.name,
        email: data.email,
        role: data.role,
      });
      setLoading(false);
      hasFetched.current = true;
      fetchAttempts.current = 0;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        console.warn('⏱️ 获取用户信息超时，进行重试...');
      } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        console.warn('🌐 网络请求失败，进行重试...');
      } else {
        console.error('❌ 获取用户信息失败:', err.message || err);
      }

      if (fetchAttempts.current < MAX_RETRIES) {
        fetchAttempts.current += 1;
        console.log(`🔄 重试获取用户信息 (${fetchAttempts.current}/${MAX_RETRIES})...`);
        setTimeout(() => fetchUser(), 1000);
        return;
      }

      setLoading(false);
      hasFetched.current = true;
      setTimeout(() => {
        router.replace('/admin/login');
      }, 100);
    }
  }, [router]);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }
    if (!hasFetched.current) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [fetchUser, pathname]);

  useEffect(() => {
    if (!pathname || !currentUser || pathname === '/admin/login') return;
    const shouldLog = [
      '/admin/products', '/admin/products/manage', '/admin/products/productlines',
      '/admin/productCrawl',
      '/admin/docs', '/admin/blog',
      '/admin/videosys/categories', '/admin/videosys/videos', '/admin/crm', '/admin/inquiries',
      '/admin/pages', '/admin/themes', '/admin/menus', '/admin/settings/header',
      '/admin/settings/footer', '/admin/settings/admins', '/admin/logs',
      '/admin/discovery/search', '/admin/discovery/scan', '/admin/litechat',
      '/admin/analytics', '/admin/analytics/realtime', '/admin/analytics/behavior',
      '/admin/analytics/sessions', '/admin/analytics/performance', '/admin/analytics/compare',
      '/admin/analytics/audience',
      '/admin/files',
      '/admin/payment/orders', '/admin/payment/accounts',
    ].some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!shouldLog) return;

    if (lastLoggedPath.current === pathname) return;
    lastLoggedPath.current = pathname;

    const menuName = getMenuNameByPath(pathname);
    fetch('/api/admin/log-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ path: pathname, menuName, ip: '', userAgent: navigator.userAgent }),
    }).catch(console.error);
  }, [pathname, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.push('/admin/login');
  };

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const baseMenuConfig: MenuItem[] = [
    {
      name: '产品目录',
      icon: <FolderTree className="w-4 h-4" />,
      children: [
        { name: '产品管理', href: '/admin/products/manage', icon: <Package className="w-4 h-4" /> },
        { name: '一键多语言发布', href: '/admin/discovery/product-sync', icon: <RefreshCw className="w-4 h-4" /> },
        { name: '产品采集', href: '/admin/productCrawl', icon: <CloudDownload className="w-4 h-4" /> },
        { name: '产品分类管理', href: '/admin/products/categories', icon: <FolderTree className="w-4 h-4" /> },
        { name: '产品线设置', href: '/admin/products/productlines', icon: <Layers className="w-4 h-4" /> },
        { name: '基本设置', href: '/admin/products/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      name: '知识文档',
      icon: <BookOpen className="w-4 h-4" />,
      children: [
        { name: '文档库管理', href: '/admin/docs/docs-libs', icon: <FileText className="w-4 h-4" /> },
        { name: '文档管理', href: '/admin/docs', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      name: 'Blog管理',
      icon: <Newspaper className="w-4 h-4" />,
      children: [
        { name: 'Blog文章', href: '/admin/blog', icon: <FileText className="w-4 h-4" /> },
        { name: 'Blog分类', href: '/admin/blog/categories', icon: <Tags className="w-4 h-4" /> },
      ],
    },
    {
      name: '短视频',
      icon: <VideoIcon className="w-4 h-4" />,
      children: [
        { name: '视频分类', href: '/admin/videosys/categories', icon: <FolderTree className="w-4 h-4" /> },
        { name: '视频管理', href: '/admin/videosys/videos', icon: <VideoIcon className="w-4 h-4" /> },
      ],
    },
  ];

  const websiteSettingsChildren: MenuItem[] = [
    { name: '基本设置', href: '/admin/settings/basic', icon: <Settings className="w-4 h-4" /> },
    { name: '多语言站点', href: '/admin/settings/languages', icon: <Languages className="w-4 h-4" /> },
    { name: '网站主题', href: '/admin/themes', icon: <Palette className="w-4 h-4" /> },
    { name: '菜单管理', href: '/admin/menus', icon: <Menu className="w-4 h-4" /> },
    { name: '页头|页脚', href: '/admin/settings/header-footer', icon: <PanelTop className="w-4 h-4" /> },
  ];

  if (currentUser?.role === 'super') {
    websiteSettingsChildren.push(
      { name: '网站管理员', href: '/admin/settings/admins', icon: <Users className="w-4 h-4" /> },
      { name: '网站日志', href: '/admin/logs', icon: <FileText className="w-4 h-4" /> }
    );
  }

  const menuConfig = useMemo(() => {
    const config: MenuItem[] = [
      {
        name: '全站搜索',
        href: '/admin/discovery/search',
        icon: <Search className="w-4 h-4" />,
      },
      ...baseMenuConfig,
      {
        name: '文件空间',
        icon: <FolderOpen className="w-4 h-4" />,
        children: [
          { name: '文件管理', href: '/admin/files', icon: <File className="w-4 h-4" /> },
        ],
      },
      {
        name: '客户管理',
        icon: <Users className="w-4 h-4" />,
        children: [
          { name: '客户列表', href: '/admin/crm', icon: <Users className="w-4 h-4" /> },
          { name: '客户询盘', href: '/admin/inquiries', icon: <Mail className="w-4 h-4" /> },
          { name: 'Chat Online', href: '/admin/litechat', icon: <MessageCircle className="w-4 h-4" /> },
        ],
      },
      {
        name: '收款服务',
        icon: <CreditCard className="w-4 h-4" />,
        children: [
          { name: '订单管理', href: '/admin/payment/orders', icon: <FileText className="w-4 h-4" /> },
          { name: '收款账户', href: '/admin/payment/accounts', icon: <Banknote className="w-4 h-4" /> },
        ],
      },
      {
        name: '页面管理',
        icon: <FileText className="w-4 h-4" />,
        children: [
          { name: '页面管理', href: '/admin/pages', icon: <FileText className="w-4 h-4" /> },
          { name: '网页模板', href: '/admin/webbuilder', icon: <LayoutTemplate className="w-4 h-4" /> },
        ],
      },
      {
        name: '智能SEO',
        icon: <BarChart3 className="w-4 h-4" />,
        children: [
          { name: '页面索引', href: '/admin/discovery/scan', icon: <Scan className="w-4 h-4" /> },
          { name: '站点地图', href: '/admin/discovery/sitemap', icon: <Map className="w-4 h-4" /> },
          { name: 'SEO优化', href: '/admin/discovery/seo', icon: <FileText className="w-4 h-4" /> },
          { name: 'SEO策略', href: '/admin/discovery/seo/strategies', icon: <Sliders className="w-4 h-4" /> },
        ],
      },
      {
        name: '流量分析',
        icon: <Activity className="w-4 h-4" />,
        children: [
          { name: '概览', href: '/admin/analytics', icon: <LayoutDashboard className="w-4 h-4" /> },
          { name: '实时', href: '/admin/analytics/realtime', icon: <Activity className="w-4 h-4" /> },
          { name: '行为类别', href: '/admin/analytics/behavior', icon: <Users className="w-4 h-4" /> },
          { name: '会话', href: '/admin/analytics/sessions', icon: <History className="w-4 h-4" /> },
          { name: '性能', href: '/admin/analytics/performance', icon: <Gauge className="w-4 h-4" /> },
          { name: '比较', href: '/admin/analytics/compare', icon: <RefreshCw className="w-4 h-4" /> },
          { name: '受众-细分', href: '/admin/analytics/audience', icon: <PieChart className="w-4 h-4" /> },
        ],
      },
      {
        name: '网站设置',
        icon: <Settings className="w-4 h-4" />,
        children: websiteSettingsChildren,
      },
    ];
    return config;
  }, [currentUser?.role]);

  useEffect(() => {
    if (pathname === '/admin/login') return;

    const allParentKeys = getAllParentKeys(menuConfig);
    const targetParentKey = findParentMenuKey(pathname, menuConfig);
    const newOpenMenus: Record<string, boolean> = {};
    allParentKeys.forEach(key => {
      newOpenMenus[key] = key === targetParentKey;
    });
    setOpenMenus(newOpenMenus);
  }, [pathname, menuConfig]);

  useEffect(() => {
    if (pathname === '/admin/login') return;

    const pageName = getCurrentPageName(pathname, menuConfig);
    if (pageName) {
      document.title = `${pageName} - JEEKUA网站运营平台`;
    } else {
      document.title = 'JEEKUA网站运营平台';
    }
  }, [pathname, menuConfig]);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === href;

    if (href.startsWith('/admin/analytics')) {
      if (href === '/admin/analytics') {
        return pathname === '/admin/analytics';
      }
      return pathname === href;
    }

    if (href === '/admin/docs' && pathname === '/admin/docs/docs-libs') return false;
    if (href === '/admin/blog' && pathname?.startsWith('/admin/blog/categories')) return false;
    if (href === '/admin/blog/categories' && pathname?.startsWith('/admin/blog/') && !pathname?.startsWith('/admin/blog/categories')) return false;
    if (href === '/admin/discovery/seo' && pathname !== '/admin/discovery/seo') return false;
    if (href === '/admin/productCrawl' && pathname !== '/admin/productCrawl') return false;

    return pathname === href || pathname.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem) => {
    if (!item.href) return null;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2 p-2 rounded mb-1 ${
          isActive(item.href) ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
        }`}
      >
        {item.icon}
        <span>{item.name}</span>
      </Link>
    );
  };

  const renderSubMenu = (item: MenuItem, menuKey: string) => {
    const isOpen = openMenus[menuKey] || false;
    return (
      <div key={menuKey} className="mb-1">
        <div
          onClick={() => toggleMenu(menuKey)}
          className="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            {item.icon}
            <span>{item.name}</span>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        {isOpen && (
          <div className="ml-6 pl-2 border-l">
            {item.children?.map(child => renderMenuItem(child))}
          </div>
        )}
      </div>
    );
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">加载中...</div>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r relative flex flex-col">
        <div className="p-4 font-bold text-lg border-b">JEEKUA网站运营平台</div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {menuConfig.map((item) => {
            if (item.children && item.children.length > 0) {
              const menuKey = getMenuKeyByName(item.name);
              return renderSubMenu(item, menuKey);
            } else {
              return renderMenuItem(item);
            }
          })}
        </nav>
        <div className="p-4 border-t bg-white relative" ref={userMenuRef}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
          >
            <div className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium truncate">{currentUser?.name || '用户'}</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </div>
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-md shadow-lg border z-50">
              <div className="p-3 border-b">
                <div className="font-medium">{currentUser?.name}</div>
                <div className="text-xs text-gray-500 mt-1 break-all">{currentUser?.email}</div>
              </div>
              <Link
                href="/admin/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
              >
                <UserCircle className="w-4 h-4" /> 个人信息
              </Link>
              <Link
                href="/admin/account"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
              >
                <Key className="w-4 h-4" /> 修改密码
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
              >
                <LogOut className="w-4 h-4" /> 退出登录
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
      {/* ✅ 新增：Sonner Toaster，放最底部即可 */}
      <Toaster position="top-right" richColors />
    </div>
  );
}