'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Plus, RefreshCw, X } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import SiteSyncDialog from '@/components/common/SiteSyncDialog';
import SyncLogsDialog from '@/components/common/SyncLogsDialog';
import Toast from '@/components/common/Toast';

interface Menu {
  id: string;
  name: string;
  isEditable: boolean;
  items: any[];
}

function generateNumericId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// 新增自定义菜单的悬浮窗口组件
function AddMenuModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入菜单名称');
      return;
    }
    setLoading(true);
    await onSave(name.trim());
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">新增自定义菜单</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">菜单名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：帮助中心"
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-100">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenusPage() {
  const [locale, setLocale] = useState('zh');
  const [navigation, setNavigation] = useState<Menu | null>(null);
  const [footer, setFooter] = useState<Menu | null>(null);
  const [customMenus, setCustomMenus] = useState<Menu[]>([]);
  const [initLoading, setInitLoading] = useState<{ type: string; loading: boolean } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchMenus = async () => {
    try {
      const res = await fetch(`/api/admin/menus?locale=${locale}`);
      const data = await res.json();
      setNavigation(data.navigation || null);
      setFooter(data.footer || null);
      setCustomMenus(Array.isArray(data.customMenus) ? data.customMenus : []);
    } catch (error) {
      console.error('Failed to fetch menus:', error);
      setCustomMenus([]);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [locale]);

  const addCustomMenu = async (name: string) => {
    const newMenu: Menu = {
      id: generateNumericId(),
      name,
      isEditable: true,
      items: [],
    };
    const updated = [...customMenus, newMenu];
    await fetch(`/api/admin/menus/${locale}/custom_menus`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    fetchMenus();
  };

  const deleteCustomMenu = async (menuId: string) => {
    if (!confirm('删除菜单会同时删除其所有菜单项，确定吗？')) return;
    const updated = customMenus.filter(m => m.id !== menuId);
    await fetch(`/api/admin/menus/${locale}/custom_menus`, {
      method: 'PUT',
      body: JSON.stringify(updated),
    });
    fetchMenus();
  };

  const initMenu = async (type: 'navigation' | 'footer') => {
    if (!confirm(`确定要将“${type === 'navigation' ? '主导航' : '底部菜单'}”恢复为默认预设吗？当前菜单将被覆盖。`)) return;
    setInitLoading({ type, loading: true });
    try {
      const res = await fetch('/api/admin/menus/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, menuType: type }),
      });
      if (res.ok) {
        setToast({ message: '初始化成功', type: 'success' });
        fetchMenus();
      } else {
        const err = await res.json();
        setToast({ message: err.error || '初始化失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '初始化失败', type: 'error' });
    } finally {
      setInitLoading(null);
    }
  };

  const handleSync = async (sourceLocale: string, targetLocales: string[]) => {
    try {
      const res = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'menu',
          sourceLocale,
          targetLocales,
          itemId: 'menus', // 固定标识，同步所有菜单文件
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失败');
      const failed = data.results?.filter((r: any) => r.status === 'failed') || [];
      if (failed.length > 0) {
        setToast({ message: `同步完成，但 ${failed.length} 个站点失败`, type: 'error' });
        return { success: false };
      }
      setToast({ message: `成功同步到 ${targetLocales.length} 个站点`, type: 'success' });
      return { success: true };
    } catch (error: any) {
      setToast({ message: error.message || '同步失败', type: 'error' });
      throw error;
    }
  };

  const MenuCard = ({ menu, type }: { menu: Menu; type: 'default' | 'custom' }) => {
    const editUrl = type === 'default'
      ? `/admin/menus/${locale}/${menu.id}/edit`
      : `/admin/menus/${locale}/custom_menus/${menu.id}/edit`;
    const showInitButton = type === 'default' && (locale === 'zh' || locale === 'en');

    return (
      <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow bg-white">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{menu.name}</h3>
            {type === 'default' && (
              <p className="text-sm text-gray-500 mt-1">默认菜单</p>
            )}
          </div>
          <div className="flex space-x-1">
            <Link
              href={editUrl}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition"
              title="编辑菜单项"
            >
              <Edit className="w-5 h-5" />
            </Link>
            {showInitButton && (
              <button
                onClick={() => initMenu(menu.id as 'navigation' | 'footer')}
                disabled={initLoading?.loading}
                className="p-2 text-gray-500 hover:text-orange-600 rounded-full hover:bg-orange-50 transition"
                title="初始化菜单（恢复预设）"
              >
                {initLoading?.type === menu.id && initLoading.loading ? (
                  <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
              </button>
            )}
            {type === 'custom' && (
              <button
                onClick={() => deleteCustomMenu(menu.id)}
                className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                title="删除菜单"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-400">
          共 {menu.items?.length || 0} 个菜单项
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">菜单管理</h1>
        <div className="flex items-center space-x-3">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={setLocale}
            displayMode="zh"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>新增自定义菜单</span>
          </button>
          {/* 仅当 locale 为 zh 或 en 时显示同步按钮 */}
          {(locale === 'zh' || locale === 'en') && (
            <button
              onClick={() => setShowSyncDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
            >
              🌐 多语言站点一键同步
            </button>
          )}
          <button
            onClick={() => setShowLogsDialog(true)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            📋 同步日志
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-3">默认菜单</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navigation && <MenuCard menu={navigation} type="default" />}
            {footer && <MenuCard menu={footer} type="default" />}
          </div>
        </div>

        {customMenus.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-gray-700 mb-3">自定义菜单</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customMenus.map(menu => (
                <MenuCard key={menu.id} menu={menu} type="custom" />
              ))}
            </div>
          </div>
        )}
        {customMenus.length === 0 && (
          <div className="text-center py-12 text-gray-400 border rounded-lg bg-gray-50">
            暂无自定义菜单，点击上方按钮添加
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMenuModal
          onClose={() => setShowAddModal(false)}
          onSave={addCustomMenu}
        />
      )}

      <SiteSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        onSync={handleSync}
        currentLocale={locale}
        title="同步菜单数据到其他语言"
      />

      <SyncLogsDialog
        isOpen={showLogsDialog}
        onClose={() => setShowLogsDialog(false)}
        syncType="menu"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}