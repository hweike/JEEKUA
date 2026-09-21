'use client';

import { useEffect, useState } from 'react';

interface MenuSelectorProps {
  value: string;
  onChange: (menuId: string) => void;
  locale: string;
  label?: string;
  filter?: (menu: any) => boolean; // 过滤函数
}

export default function MenuSelector({ value, onChange, locale, label, filter }: MenuSelectorProps) {
  const [menus, setMenus] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!locale) return;
    fetch(`/api/admin/menus?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        // data 结构: { navigation, footer, customMenus }
        const menuList = [];
        // 导航菜单
        if (data.navigation && data.navigation.id) {
          menuList.push({ id: data.navigation.id, name: data.navigation.name || '主导航' });
        }
        // 底部菜单
        if (data.footer && data.footer.id) {
          menuList.push({ id: data.footer.id, name: data.footer.name || '底部菜单' });
        }
        // 自定义菜单
        if (Array.isArray(data.customMenus)) {
          data.customMenus.forEach((menu: any) => {
            if (menu && menu.id) {
              menuList.push({ id: menu.id, name: menu.name });
            }
          });
        }

        // 应用过滤函数（如果提供）
        const filtered = filter ? menuList.filter(filter) : menuList;
        setMenus(filtered);
      })
      .catch(err => {
        console.error('Failed to fetch menus:', err);
        setMenus([]);
      });
  }, [locale, filter]);

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        <option value="">请选择菜单</option>
        {menus.map((menu, index) => (
          <option key={menu.id || `menu-${index}`} value={menu.id}>
            {menu.name}
          </option>
        ))}
      </select>
    </div>
  );
}