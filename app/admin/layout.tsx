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
  // ✅ 新增图标
  Activity,
  Gauge,
  PieChart,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';

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
    // ✅ 新增流量分析日志映射
    '/admin/analytics': '流量分析-概览',
    '/admin/analytics/realtime': '流量分析-实时',
    '/admin/analytics/behavior': '流量分析-行为类别',
    '/admin/analytics/sessions': '流量分析-会话',
    '/admin/analytics/performance': '流量分析-性能',
    '/admin/analytics/compare': '流量分析-比较',
    '/admin/analytics/audience': '流量分析-受众细分',
  };
  return mapping[path] || path;
}

// 根据菜单项名称获取对应的菜单key
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
    '流量分析': 'analytics',   // ✅ 新增
  };
  return mapping[menuName] || menuName;
}

// 获取所有父级菜单的key列表
function getAllParentKeys(menuConfig: MenuItem[]): string[] {
  const keys: string[] = [];
  menuConfig.forEach(item => {
    if (item.children && item.children.length > 0) {
      keys.push(getMenuKeyByName(item.name));
    }
  });
  return keys;
}

// 根据当前路径查找应该展开的父级菜单key
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

// 根据路径查找当前页面信息（仅用于标题）
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

  // ✅ 设置后台专属 Favicon
  useEffect(() => {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/admin-favicon.ico';
  }, []);

  // 获取用户信息
  useEffect(() => {
    fetch('/api/admin/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setCurrentUser({
          name: data.name,
          email: data.email,
          role: data.role,
        });
        setLoading(false);
      })
      .catch(() => router.push('/admin/login'));
  }, [router]);

  // 记录菜单访问日志
  useEffect(() => {
    if (!pathname || !currentUser || pathname === '/admin/login') return;
    const shouldLog = [
      '/admin/products', '/admin/products/manage', '/admin/docs', '/admin/blog',
      '/admin/videosys/categories', '/admin/videosys/videos', '/admin/crm', '/admin/inquiries',
      '/admin/pages', '/admin/themes', '/admin/menus', '/admin/settings/header',
      '/admin/settings/footer', '/admin/settings/admins', '/admin/logs',
      '/admin/discovery/search', '/admin/discovery/scan', '/admin/litechat',
      '/admin/analytics', '/admin/analytics/realtime', '/admin/analytics/behavior',
      '/admin/analytics/sessions', '/admin/analytics/performance', '/admin/analytics/compare',
      '/admin/analytics/audience'
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

  // 点击外部关闭悬浮菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 确保后台页面不受深色模式影响
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

  // 基础菜单配置（不含智能SEO和网站设置）
  const baseMenuConfig: MenuItem[] = [
    {
      name: '产品目录',
      icon: <FolderTree className="w-4 h-4" />,
      children: [
        { name: '产品分类', href: '/admin/products/categories', icon: <FolderTree className="w-4 h-4" /> },
        { name: '产品管理', href: '/admin/products/manage', icon: <Package className="w-4 h-4" /> },
        { name: '多语言同步', href: '/admin/discovery/Site-sync', icon: <RefreshCw className="w-4 h-4" /> },
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
      name: '页面管理',
      icon: <FileText className="w-4 h-4" />,
      children: [
        { name: '页面管理', href: '/admin/pages', icon: <FileText className="w-4 h-4" /> },
        { name: '网页模板', href: '/admin/webbuilder', icon: <LayoutTemplate className="w-4 h-4" /> },
      ],
    },
  ];

  // 网站设置菜单（基础部分）
  const websiteSettingsChildren: MenuItem[] = [
    { name: '基本设置', href: '/admin/settings/basic', icon: <Settings className="w-4 h-4" /> },
    { name: '多语言站点', href: '/admin/settings/languages', icon: <Languages className="w-4 h-4" /> },
    { name: '网站主题', href: '/admin/themes', icon: <Palette className="w-4 h-4" /> },
    { name: '菜单管理', href: '/admin/menus', icon: <Menu className="w-4 h-4" /> },
    { name: '页头|页脚', href: '/admin/settings/header-footer', icon: <PanelTop className="w-4 h-4" /> },
    { name: '翻译配置', href: '/admin/discovery/translation-config', icon: <Settings className="w-4 h-4" /> },
  ];

  // 根据角色动态添加网站管理员和网站日志菜单
  if (currentUser?.role === 'super') {
    websiteSettingsChildren.push(
      { name: '网站管理员', href: '/admin/settings/admins', icon: <Users className="w-4 h-4" /> },
      { name: '网站日志', href: '/admin/logs', icon: <FileText className="w-4 h-4" /> }
    );
  }

  // 完整菜单配置（使用 useMemo 避免不必要的重新计算）
  const menuConfig = useMemo(() => {
    const config: MenuItem[] = [
      {
        name: '全站搜索',
        href: '/admin/discovery/search',
        icon: <Search className="w-4 h-4" />,
      },
      ...baseMenuConfig,
      {
        name: '智能SEO',
        icon: <BarChart3 className="w-4 h-4" />,
        children: [
          { name: '页面索引', href: '/admin/discovery/scan', icon: <Scan className="w-4 h-4" /> },
          { name: '站点地图', href: '/admin/discovery/sitemap', icon: <Map className="w-4 h-4" /> },
          { name: 'SEO优化', href: '/admin/discovery/seo', icon: <FileText className="w-4 h-4" /> },
          { name: 'SEO策略', href: '/admin/discovery/seo/strategies', icon: <Sliders className="w-4 h-4" /> },
          { name: '同步日志', href: '/admin/discovery/sync-logs', icon: <History className="w-4 h-4" /> },
        ],
      },
      // ✅ 新增：流量分析模块（放在智能SEO后面）
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

  // 根据当前路径自动展开对应的父级菜单，并折叠其他所有父级菜单
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

  // ✅ 动态设置浏览器标签页标题（根据当前菜单，不在页面中重复显示）
  useEffect(() => {
    if (pathname === '/admin/login') return;

    const pageName = getCurrentPageName(pathname, menuConfig);
    if (pageName) {
      document.title = `${pageName} - JEEKUA网站运营平台`;
    } else {
      document.title = 'JEEKUA网站运营平台';
    }
  }, [pathname, menuConfig]);

  // ✅ 修改激活判断函数：精确匹配，避免同级菜单误激活
  const isActive = (href: string) => {
    // 首页特殊处理
    if (href === '/admin') return pathname === href;
    // 文档管理：避免匹配到文档库管理
    if (href === '/admin/docs' && pathname === '/admin/docs/docs-libs') return false;
    // Blog文章：避免匹配到Blog分类
    if (href === '/admin/blog' && pathname?.startsWith('/admin/blog/categories')) return false;
    // Blog分类：避免匹配到Blog文章
    if (href === '/admin/blog/categories' && pathname?.startsWith('/admin/blog/') && !pathname?.startsWith('/admin/blog/categories')) return false;
    // SEO优化：避免匹配到其他子路径
    if (href === '/admin/discovery/seo' && pathname !== '/admin/discovery/seo') return false;
    // 其他所有情况：精确匹配
    return pathname === href;
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

  if (pathname === '/admin/login') return <>{children}</>;
  if (loading) return <div className="flex h-screen items-center justify-center">加载中...</div>;

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
    </div>
  );
}