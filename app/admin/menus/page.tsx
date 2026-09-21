'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Toast from '@/components/common/Toast';
import MenuCategory from './components/MenuCategory';
import AddMenuModal from './components/AddMenuModal';
import AiHelperMenuModal from './components/AiHelperMenuModal';
import { Plus } from 'lucide-react';

interface Menu {
  id: string;
  name: string;
  isEditable: boolean;
  items: any[];
}

interface LocaleMenus {
  navigation: Menu | null;
  footer: Menu | null;
  customMenus: Menu[];
}

type AllMenus = Record<string, LocaleMenus>;

function generateNumericId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function isValidMenu(menu: any): boolean {
  return menu && typeof menu === 'object' && menu.id && menu.name && Array.isArray(menu.items);
}

export default function MenusPage() {
  const [allMenus, setAllMenus] = useState<AllMenus>({});
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [initLoading, setInitLoading] = useState<{ type: string; locale: string; loading: boolean } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiHelperSourceLocale, setAiHelperSourceLocale] = useState<string>('');
  const [aiHelperMenuType, setAiHelperMenuType] = useState<'navigation' | 'footer' | 'custom_menus'>('navigation');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchAvailableLocales = useCallback(async () => {
    try {
      const res = await fetch('/api/languages/enabled', { cache: 'no-store' });
      const data = await res.json();
      let locales: string[] = [];
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'string') {
          locales = data;
        } else {
          locales = data.map((item: { code: string }) => item.code);
        }
      } else if (data && Array.isArray(data.locales)) {
        locales = data.locales;
      } else {
        locales = ['zh', 'en'];
      }
      setAvailableLocales(locales);
    } catch {
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  const fetchAllMenus = useCallback(async (locales: string[]) => {
    if (locales.length === 0) return;
    setLoading(true);
    setAllMenus({});
    try {
      const url = `/api/admin/menus?locales=${locales.join(',')}&t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const newAllMenus: AllMenus = {};
      locales.forEach((locale) => {
        const localeData = data[locale] || { navigation: null, footer: null, customMenus: [] };
        newAllMenus[locale] = {
          navigation: isValidMenu(localeData.navigation) ? localeData.navigation : null,
          footer: isValidMenu(localeData.footer) ? localeData.footer : null,
          customMenus: Array.isArray(localeData.customMenus) ? localeData.customMenus : [],
        };
      });
      setAllMenus(newAllMenus);
    } catch (error) {
      console.error('获取所有菜单数据失败:', error);
      setToast({ message: '加载菜单数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableLocales();
  }, [fetchAvailableLocales]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      fetchAllMenus(availableLocales);
    }
  }, [availableLocales, fetchAllMenus]);

  const refreshMenus = useCallback(() => {
    if (availableLocales.length > 0) {
      fetchAllMenus(availableLocales);
    }
  }, [availableLocales, fetchAllMenus]);

  const initMenu = useCallback(
    async (locale: string, menuType: 'navigation' | 'footer') => {
      const displayName = menuType === 'navigation' ? '主导航' : '底部菜单';
      if (!confirm(`确定要将 "${locale}" 站点的“${displayName}”恢复为默认预设吗？当前菜单将被覆盖。`)) return;

      setInitLoading({ type: menuType, locale, loading: true });
      try {
        const res = await fetch('/api/admin/menus/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, menuType }),
        });
        if (res.ok) {
          setToast({ message: `初始化成功 (${locale})`, type: 'success' });
          setTimeout(() => refreshMenus(), 300);
        } else {
          const err = await res.json();
          setToast({ message: err.error || '初始化失败', type: 'error' });
        }
      } catch {
        setToast({ message: '初始化失败', type: 'error' });
      } finally {
        setInitLoading(null);
      }
    },
    [refreshMenus]
  );

  // 彻底删除菜单，恢复到未设置状态（menu = null）
  const clearMenu = useCallback(
    async (locale: string, menuType: 'navigation' | 'footer') => {
      try {
        const res = await fetch(`/api/admin/menus/${locale}/${menuType}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setToast({ message: `已删除 ${locale} 站点的菜单，恢复为未设置状态`, type: 'success' });
          refreshMenus();
        } else {
          const err = await res.json();
          setToast({ message: err.error || '删除失败', type: 'error' });
        }
      } catch (error) {
        console.error('删除菜单失败:', error);
        setToast({ message: '删除失败，请稍后重试', type: 'error' });
      }
    },
    [refreshMenus]
  );

  const deleteCustomMenu = useCallback(
    async (locale: string, menuId: string) => {
      if (!confirm('删除菜单会同时删除其所有菜单项，确定吗？')) return;
      try {
        const currentData = allMenus[locale];
        if (!currentData) return;
        const updated = currentData.customMenus.filter((m) => m.id !== menuId);
        await fetch(`/api/admin/menus/${locale}/custom_menus`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setToast({ message: '删除成功', type: 'success' });
        refreshMenus();
      } catch {
        setToast({ message: '删除失败', type: 'error' });
      }
    },
    [allMenus, refreshMenus]
  );

  const addCustomMenu = useCallback(
    async (locale: string, name: string) => {
      const newMenu: Menu = {
        id: generateNumericId(),
        name,
        isEditable: true,
        items: [],
      };
      try {
        const currentData = allMenus[locale];
        const updated = [...(currentData?.customMenus || []), newMenu];
        await fetch(`/api/admin/menus/${locale}/custom_menus`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
        setToast({ message: `新增成功 (${locale})`, type: 'success' });
        refreshMenus();
      } catch {
        setToast({ message: '新增失败', type: 'error' });
      }
    },
    [allMenus, refreshMenus]
  );

  const handleAiTranslate = useCallback((
    sourceLocale: string,
    menuType: 'navigation' | 'footer' | 'custom_menus'
  ) => {
    if (!sourceLocale || !menuType) return;
    if (sourceLocale !== 'zh' && sourceLocale !== 'en') return;
    setAiHelperSourceLocale(sourceLocale);
    setAiHelperMenuType(menuType);
    setShowAiHelper(true);
  }, []);

  const categoryData = useMemo(() => {
    const locales = availableLocales;
    return {
      navigation: locales.map((locale) => ({
        locale,
        menu: allMenus[locale]?.navigation || null,
        isDefault: true,
      })),
      footer: locales.map((locale) => ({
        locale,
        menu: allMenus[locale]?.footer || null,
        isDefault: true,
      })),
      custom: locales.flatMap((locale) => {
        const menus = allMenus[locale]?.customMenus || [];
        return menus.map((menu) => ({
          locale,
          menu,
          isDefault: false,
        }));
      }),
    };
  }, [availableLocales, allMenus]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-2">加载菜单数据...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">菜单管理</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>新增自定义菜单</span>
        </button>
      </div>

      <div className="space-y-6">
        <MenuCategory
          title="主导航"
          entries={categoryData.navigation}
          type="navigation"
          onInit={initMenu}
          onClear={clearMenu}
          onAiTranslate={handleAiTranslate}
          initLoading={initLoading}
          availableLocales={availableLocales}
          onRefresh={refreshMenus}
        />
        <MenuCategory
          title="底部导航"
          entries={categoryData.footer}
          type="footer"
          onInit={initMenu}
          onClear={clearMenu}
          onAiTranslate={handleAiTranslate}
          initLoading={initLoading}
          availableLocales={availableLocales}
          onRefresh={refreshMenus}
        />
        <MenuCategory
          title="自定义菜单"
          entries={categoryData.custom}
          type="custom"
          onDelete={deleteCustomMenu}
          onAiTranslate={handleAiTranslate}
          availableLocales={availableLocales}
          onRefresh={refreshMenus}
        />
      </div>

      {showAddModal && (
        <AddMenuModal
          onClose={() => setShowAddModal(false)}
          onSave={addCustomMenu}
          availableLocales={availableLocales}
          defaultLocale={availableLocales[0] || 'zh'}
        />
      )}

      {showAiHelper && (
        <AiHelperMenuModal
          sourceLocale={aiHelperSourceLocale}
          menuType={aiHelperMenuType}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            refreshMenus();
            setShowAiHelper(false);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}