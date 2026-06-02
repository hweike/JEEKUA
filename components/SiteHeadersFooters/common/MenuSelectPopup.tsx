'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface MenuOption {
  id: string;
  name: string;
  type: string;      // 'navigation' | 'footer' | 'custom' 等
}

interface MenuSelectPopupProps {
  value: string;
  onChange: (menuId: string) => void;
  locale: string;
  label?: string;
}

export default function MenuSelectPopup({ value, onChange, locale, label }: MenuSelectPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedMenu = menus.find(m => m.id === value);

  // 获取菜单列表 - 使用实例中的 API
  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/menus/list?locale=${locale}`);
        if (!res.ok) throw new Error('获取菜单失败');
        const data = await res.json();
        // 实例中返回的是直接数组，如 [{ id, name, type }, ...]
        setMenus(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('获取菜单失败:', err);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, [locale]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (menuId: string) => {
    onChange(menuId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm bg-white hover:border-gray-400 transition"
        >
          <span className={selectedMenu ? 'text-gray-900' : 'text-gray-400'}>
            {selectedMenu ? `${selectedMenu.name} (${selectedMenu.type === 'navigation' ? '主导航' : selectedMenu.type === 'footer' ? '底部菜单' : '其他'})` : (loading ? '加载中...' : '请选择菜单')}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
            {menus.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">暂无菜单数据</div>
            ) : (
              menus.map(menu => (
                <div
                  key={menu.id}
                  onClick={() => handleSelect(menu.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                    value === menu.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {menu.name} ({menu.type === 'navigation' ? '主导航' : menu.type === 'footer' ? '底部菜单' : '自定义'})
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}