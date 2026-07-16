'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import MenuTreeEditor, { MenuTreeEditorRef } from '@/components/admin/menus/MenuTreeEditor';
import Toast from '@/components/common/Toast';
import { getLanguageDisplayName } from '@/lib/languages/config';

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
      editorRef.current?.save();
    } catch (error) {
      console.error(error);
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

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
        await fetchMenuData();
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

  if (loading) return <div className="p-8">加载中...</div>;
  if (!menu) return <div className="p-8">菜单不存在</div>;

  const siteName = getLanguageDisplayName(locale, 'zh');

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">编辑菜单（{siteName}）</h1>
      </div>

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

      <div className="border rounded-lg bg-white shadow-sm">
        <MenuTreeEditor
          key={treeKey}
          ref={editorRef}
          initialItems={menu.items || []}
          onSave={onEditorSave}
          onCancel={handleCancel}
          locale={locale}   // ✅ 传递 locale，使 LinkInput 使用正确的语言
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
        >
          返回菜单列表
        </button>
        <button
          type="submit"
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存菜单'}
        </button>
      </div>
    </div>
  );
}