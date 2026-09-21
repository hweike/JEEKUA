// app/admin/payment/orders/components/OrderSearchBar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, Users } from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '@/lib/countries';

interface OrderSearchBarProps {
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  country: string;
  onCountryChange: (country: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  createdBy: string;
  onCreatedByChange: (createdBy: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

// 状态选项（使用视图状态）
const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '准备发货' },
  { value: 'completed', label: '已完成' },
];

export default function OrderSearchBar({
  keyword,
  onKeywordChange,
  country,
  onCountryChange,
  status,
  onStatusChange,
  createdBy,
  onCreatedByChange,
  onSearch,
  onClear,
}: OrderSearchBarProps) {
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCreatedByOpen, setIsCreatedByOpen] = useState(false);
  const [createdBySearch, setCreatedBySearch] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const countryRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const createdByRef = useRef<HTMLDivElement>(null);

  // 加载用户列表（业务员）
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          // 假设 API 返回用户列表，每个用户有 id, name, email
          setUsers(data.users || data || []);
        }
      } catch (error) {
        console.error('加载用户列表失败:', error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
      if (createdByRef.current && !createdByRef.current.contains(event.target as Node)) {
        setIsCreatedByOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取当前国家显示名称
  const getCountryDisplay = (code: string) => {
    if (!code) return '全部国家';
    const country = getCountryByCode(code);
    return country ? `${country.flag} ${country.nameZh} (${country.nameEn})` : code;
  };

  // 过滤国家列表
  const filteredCountries = COUNTRIES.filter(c => {
    const search = countrySearch.toLowerCase().trim();
    if (!search) return true;
    return (
      c.nameZh.includes(search) ||
      c.nameEn.toLowerCase().includes(search) ||
      c.code.toLowerCase().includes(search)
    );
  });

  // 获取状态显示名称
  const getStatusLabel = (value: string) => {
    const option = STATUS_OPTIONS.find(s => s.value === value);
    return option ? option.label : '全部';
  };

  // 获取业务员显示名称
  const getCreatedByDisplay = (value: string) => {
    if (!value) return '全部业务员';
    const user = users.find(u => u.id === value);
    return user ? user.name : value;
  };

  // 过滤用户列表
  const filteredUsers = users.filter(u => {
    const search = createdBySearch.toLowerCase().trim();
    if (!search) return true;
    return (
      (u.name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  });

  const handleClear = () => {
    onKeywordChange('');
    onCountryChange('');
    onStatusChange('all');
    onCreatedByChange('');
    setCountrySearch('');
    setCreatedBySearch('');
    onClear();
  };

  const hasFilters = keyword || country || (status && status !== 'all') || createdBy;

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4 flex-wrap">
      {/* 搜索框 */}
      <div className="relative flex-1 md:w-72">
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="搜索订单号/合同号/买家名称/邮箱..."
          className="w-full border rounded-lg px-3 py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        {keyword && (
          <button
            type="button"
            onClick={() => {
              onKeywordChange('');
              onSearch();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 业务员下拉框 */}
      <div className="relative" ref={createdByRef}>
        <button
          type="button"
          onClick={() => {
            setIsCreatedByOpen(!isCreatedByOpen);
            setIsCountryOpen(false);
            setIsStatusOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors min-w-[140px] ${
            createdBy ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <Users size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm truncate flex-1 text-left">
            {getCreatedByDisplay(createdBy)}
          </span>
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          {createdBy && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCreatedByChange('');
                onSearch();
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
        </button>

        {isCreatedByOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 flex flex-col">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={createdBySearch}
                  onChange={(e) => setCreatedBySearch(e.target.value)}
                  placeholder="搜索业务员..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <div
                onClick={() => {
                  onCreatedByChange('');
                  setIsCreatedByOpen(false);
                  setCreatedBySearch('');
                  onSearch();
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                  !createdBy ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                👤 全部业务员
              </div>
              {loadingUsers ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  加载中...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  {createdBySearch ? '未找到匹配的业务员' : '暂无业务员数据'}
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onCreatedByChange(u.id);
                      setIsCreatedByOpen(false);
                      setCreatedBySearch('');
                      onSearch();
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                      createdBy === u.id ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs flex-shrink-0">
                      {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{u.name || u.email}</div>
                      {u.email && u.email !== u.name && (
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 国家/地区下拉 */}
      <div className="relative" ref={countryRef}>
        <button
          type="button"
          onClick={() => {
            setIsCountryOpen(!isCountryOpen);
            setIsStatusOpen(false);
            setIsCreatedByOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors min-w-[160px] ${
            country ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <span className="text-sm truncate flex-1 text-left">
            {getCountryDisplay(country)}
          </span>
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          {country && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onCountryChange('');
                onSearch();
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
        </button>

        {isCountryOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 flex flex-col">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="搜索国家..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <div
                onClick={() => {
                  onCountryChange('');
                  setIsCountryOpen(false);
                  setCountrySearch('');
                  onSearch();
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                  !country ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                🌍 全部国家
              </div>
              {filteredCountries.map((c) => (
                <div
                  key={c.code}
                  onClick={() => {
                    onCountryChange(c.code);
                    setIsCountryOpen(false);
                    setCountrySearch('');
                    onSearch();
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                    country === c.code ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.nameZh}</span>
                  <span className="text-gray-400 text-xs">({c.nameEn})</span>
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                  未找到匹配的国家
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 订单状态下拉 */}
      <div className="relative" ref={statusRef}>
        <button
          type="button"
          onClick={() => {
            setIsStatusOpen(!isStatusOpen);
            setIsCountryOpen(false);
            setIsCreatedByOpen(false);
          }}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors min-w-[120px] ${
            status !== 'all' ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <span className="text-sm truncate flex-1 text-left">
            {getStatusLabel(status)}
          </span>
          <Filter size={14} className="text-gray-400 flex-shrink-0" />
          {status !== 'all' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange('all');
                onSearch();
              }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
        </button>

        {isStatusOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
            {STATUS_OPTIONS.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onStatusChange(option.value);
                  setIsStatusOpen(false);
                  onSearch();
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                  status === option.value ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索按钮 */}
      <button
        type="button"
        onClick={onSearch}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        搜索
      </button>

      {/* 清空筛选 */}
      {hasFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
        >
          清空筛选
        </button>
      )}
    </div>
  );
}