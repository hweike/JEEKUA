// app/admin/menus/[locale]/[menuType]/edit/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import MenuTreeEditor, { MenuTreeEditorRef } from '@/components/admin/menus/MenuTreeEditor';
import Toast from '@/components/common/Toast';

const localeNames: Record<string, string> = {
  zh: '中文',
  en: 'English',
};

export default function EditDefaultMenuPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const menuType = params.menuType as string;

  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuName, setMenuName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [treeKey, setTreeKey] = useState(0);
  const editorRef = useRef<MenuTreeEditorRef>(null);

  const fetchMenuData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/menus/${locale}/${menuType}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMenu(data);
      setMenuName(data.name || '');
      setTreeKey(prev => prev + 1);
    } catch (error) {
      console.error(error);
      setToast({ message: '加载菜单失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [locale, menuType]);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 调用子组件的 save 方法，子组件内部会执行 onSave 回调
      editorRef.current?.save();
      // 注意：子组件的 onSave 会异步更新，我们需要等待它完成？目前设计是子组件调用父组件传入的 onSave，然后父组件再调用 API。
      // 但这里直接调用 editorRef.current?.save() 会触发子组件内部的 handleSave，而 handleSave 会调用 onSave(props)，
      // 所以我们需要将实际的 API 调用放在 onSave 回调中。
    } catch (error) {
      console.error(error);
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 子组件的 onSave 回调：接收最新的 items 并调用 API 保存
  const onEditorSave = async (items: any[]) => {
    try {
      const updatedMenu = { ...menu, items, name: menuName };
      const res = await fetch(`/api/admin/menus/${locale}/${menuType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMenu),
      });
      if (res.ok) {
        setToast({ message: '保存成功', type: 'success' });
        await fetchMenuData(); // 重新加载数据，刷新编辑器
      } else {
        const err = await res.json();
        setToast({ message: err.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setToast({ message: '保存失败，请稍后重试', type: 'error' });
    }
  };

  const handleCancel = () => {
    router.push('/admin/menus');
  };

  const handleAddTopLevel = () => {
    editorRef.current?.addTopLevel();
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!menu) return <div className="p-8">菜单不存在</div>;

  const siteName = localeNames[locale] || locale;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">编辑菜单（{siteName}）</h1>
      </div>

      {/* 菜单名称卡片 */}
      <div className="border rounded-lg bg-white shadow-sm mb-6">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">菜单名称</h2>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 菜单项卡片 */}
      <div className="border rounded-lg bg-white shadow-sm">
        <MenuTreeEditor
          key={treeKey}
          ref={editorRef}
          initialItems={menu.items || []}
          onSave={onEditorSave}
          onCancel={handleCancel}
        />
      </div>

      {/* 独立按钮行 */}
      <div className="flex justify-end space-x-3 mt-6">
        <button onClick={handleCancel} className="px-4 py-2 border rounded-md hover:bg-gray-100">
          返回菜单列表
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          保存菜单
        </button>
      </div>
    </div>
  );
}