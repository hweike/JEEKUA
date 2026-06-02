// app/admin/menus/[locale]/[menuType]/[id]/edit/page.tsx
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MenuTreeEditor from '@/components/admin/menus/MenuTreeEditor';

export default function EditCustomMenuPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const menuType = params.menuType as string; // 应该是 'custom_menus'
  const menuId = params.id as string;

  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // 获取所有自定义菜单
        const res = await fetch(`/api/admin/menus?locale=${locale}`);
        const data = await res.json();
        const found = data.customMenus?.find((m: any) => m.id === menuId);
        setMenu(found);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [locale, menuType, menuId]);

  const saveMenu = async (updatedMenu: any) => {
    // 获取当前所有自定义菜单
    const res = await fetch(`/api/admin/menus?locale=${locale}`);
    const data = await res.json();
    const updatedCustom = data.customMenus.map((m: any) => m.id === menuId ? updatedMenu : m);
    await fetch(`/api/admin/menus/${locale}/custom_menus`, {
      method: 'PUT',
      body: JSON.stringify(updatedCustom),
    });
    router.push('/admin/menus');
  };

  const handleCancel = () => {
    router.push('/admin/menus');
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!menu) return <div className="p-8">菜单不存在</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">编辑菜单：{menu.name}</h1>
      <MenuTreeEditor
        initialItems={menu.items || []}
        onSave={saveMenu}
        onCancel={handleCancel}
      />
    </div>
  );
}