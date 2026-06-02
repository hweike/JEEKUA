'use client';

import { useEffect, useState } from 'react';

interface MenuSelectorProps {
  value: string;
  onChange: (menuId: string) => void;
  locale: string;        // 关键：接收当前语言
  label?: string;
}

export default function MenuSelector({ value, onChange, locale, label }: MenuSelectorProps) {
  const [menus, setMenus] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!locale) return;
    fetch(`/api/admin/menus/list?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        // 兼容两种返回格式：直接数组 或 { menus: [] }
        const menuList = Array.isArray(data) ? data : data.menus || [];
        setMenus(menuList);
      })
      .catch(console.error);
  }, [locale]);   // 依赖 locale，语言切换时重新获取

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      >
        <option value="">请选择菜单</option>
        {menus.map(menu => (
          <option key={menu.id} value={menu.id}>{menu.name}</option>
        ))}
      </select>
    </div>
  );
}