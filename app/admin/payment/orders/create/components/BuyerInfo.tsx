// app/admin/payment/orders/create/components/BuyerInfo.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { COUNTRIES, getCountryByCode } from '@/lib/countries';
import type { Customer } from '@/lib/CRM/types';

interface BuyerInfoProps {
  value: {
    buyer_name: string;
    buyer_company: string;
    buyer_country: string;
    buyer_phone: string;
    buyer_email: string;
    buyer_address: string;
    customer_id?: string;  // ✅ 添加 customer_id
  };
  onChange: (field: string, value: string) => void;
}

// ✅ 扩展 Customer 类型以包含 company_name
interface ExtendedCustomer extends Customer {
  company_name?: string;
}

export default function BuyerInfo({ value, onChange }: BuyerInfoProps) {
  const [customers, setCustomers] = useState<ExtendedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * 将国家名称转换为国家代码
   */
  const convertCountryToCode = (input: string): string => {
    if (!input || input.trim() === '') return '';

    const trimmed = input.trim();

    // 1. 如果已经是 code（如 US, GB, CN），直接返回
    const exactCode = COUNTRIES.find(c => c.code === trimmed);
    if (exactCode) return trimmed;

    // 2. 中文名精确匹配
    const byZh = COUNTRIES.find(c => c.nameZh === trimmed);
    if (byZh) return byZh.code;

    // 3. 英文名精确匹配（不区分大小写）
    const byEn = COUNTRIES.find(c => c.nameEn.toLowerCase() === trimmed.toLowerCase());
    if (byEn) return byEn.code;

    // 4. 中文名包含匹配
    const byZhContains = COUNTRIES.find(c => c.nameZh.includes(trimmed) || trimmed.includes(c.nameZh));
    if (byZhContains) return byZhContains.code;

    // 5. 英文名包含匹配
    const trimmedLower = trimmed.toLowerCase();
    const byEnContains = COUNTRIES.find(c => 
      c.nameEn.toLowerCase().includes(trimmedLower) || 
      trimmedLower.includes(c.nameEn.toLowerCase())
    );
    if (byEnContains) return byEnContains.code;

    return '';
  };

  // ============================================================
  // 加载客户数据
  // ============================================================
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/crm');
        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setCustomers(data);
        } else {
          setCustomers([]);
        }
      } catch (error) {
        console.error('加载客户失败:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, []);

  // ============================================================
  // ✅ 选择买家 - 保存 customer_id
  // ============================================================
  const selectCustomer = (customer: ExtendedCustomer) => {
    // ✅ 尝试多种可能的字段名
    const companyName = customer.company_name || 
                        (customer as any).companyName || 
                        (customer as any).company || 
                        '';

    // 强制转换为国家代码
    const countryCode = convertCountryToCode(customer.country || '');

    // ✅ 调用 onChange 填充所有字段
    onChange('buyer_name', customer.name || '');
    onChange('buyer_company', companyName);
    onChange('buyer_country', countryCode);
    onChange('buyer_phone', customer.phone || '');
    onChange('buyer_email', customer.email || '');
    onChange('buyer_address', customer.address || '');
    onChange('customer_id', customer.id || '');  // ✅ 保存 customer_id

    setModalOpen(false);
    setSearchTerm('');
  };

  // 过滤客户
  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return true;
    const companyName = c.company_name || (c as any).companyName || (c as any).company || '';
    return (
      (c.name || '').toLowerCase().includes(search) ||
      companyName.toLowerCase().includes(search) ||
      (c.email || '').toLowerCase().includes(search) ||
      (c.phone || '').includes(search)
    );
  });

  // 获取国家完整显示名称
  const getCountryFullName = (codeOrName: string) => {
    if (!codeOrName) return '-';
    const byCode = getCountryByCode(codeOrName);
    if (byCode) {
      return `${byCode.nameZh} ${byCode.nameEn}`;
    }
    const byZh = COUNTRIES.find(c => c.nameZh === codeOrName);
    if (byZh) {
      return `${byZh.nameZh} ${byZh.nameEn}`;
    }
    return codeOrName;
  };

  const getCountryOptionLabel = (country: typeof COUNTRIES[0]) => {
    return `${country.nameZh} ${country.nameEn}`;
  };

  const currentCountryCode = convertCountryToCode(value.buyer_country || '');

  return (
    <div>
      {/* 买家信息表单 */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              买家名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value.buyer_name}
              onChange={(e) => onChange('buyer_name', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入买家名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">公司名称</label>
            <input
              type="text"
              value={value.buyer_company}
              onChange={(e) => onChange('buyer_company', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入公司名称"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">联系电话</label>
            <input
              type="text"
              value={value.buyer_phone}
              onChange={(e) => onChange('buyer_phone', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入联系电话"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              买家邮箱 <span className="text-gray-400 text-xs">（可选）</span>
            </label>
            <input
              type="email"
              value={value.buyer_email}
              onChange={(e) => onChange('buyer_email', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">国家/地区</label>
            <select
              value={currentCountryCode}
              onChange={(e) => onChange('buyer_country', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">请选择</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {getCountryOptionLabel(country)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium mb-1">收货地址</label>
            <input
              type="text"
              value={value.buyer_address}
              onChange={(e) => onChange('buyer_address', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入收货地址"
            />
          </div>
        </div>
      </div>

      {/* 当前选中的买家信息展示 */}
      {value.buyer_name && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">买家名称</div>
              <div className="font-medium">{value.buyer_name || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">公司名称</div>
              <div className="font-medium">{value.buyer_company || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">联系电话</div>
              <div className="font-medium">{value.buyer_phone || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">买家邮箱</div>
              <div className="font-medium">{value.buyer_email || '-'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-400 uppercase tracking-wider">国家/地区 · 收货地址</div>
              <div className="font-medium">
                {getCountryFullName(currentCountryCode)}
                {value.buyer_address && ` · ${value.buyer_address}`}
              </div>
            </div>
            {/* ✅ 显示 customer_id（调试用，可移除） */}
            {value.customer_id && (
              <div className="md:col-span-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider">客户ID</div>
                <div className="font-mono text-xs text-gray-500">{value.customer_id}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 选择买家按钮 */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Search size={16} />
          <span>从 CRM 选择买家</span>
          <span className="text-xs text-gray-400 ml-1">({customers.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 选择买家模态窗口 */}
      {/* ============================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">👤 选择买家</h3>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSearchTerm('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 border-b">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索买家名称、公司、邮箱、电话..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  加载客户数据...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchTerm ? '未找到匹配的客户' : '暂无客户数据'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map((customer) => {
                    const countryCode = convertCountryToCode(customer.country || '');
                    const countryDisplay = countryCode ? getCountryFullName(countryCode) : (customer.country || '-');
                    const companyName = customer.company_name || (customer as any).companyName || (customer as any).company || '';
                    
                    return (
                      <div
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                      >
                        <div>
                          <div className="font-medium">{customer.name || '未命名'}</div>
                          {companyName && (
                            <div className="text-sm text-gray-500">{companyName}</div>
                          )}
                          <div className="text-sm text-gray-400">
                            {customer.email && `${customer.email}`}
                            {customer.email && customer.phone && ' · '}
                            {customer.phone && `${customer.phone}`}
                          </div>
                          <div className="text-sm text-gray-400">
                            {countryDisplay !== '-' ? countryDisplay : ''}
                            {customer.address && ` · ${customer.address}`}
                          </div>
                        </div>
                        <button 
                          className="text-blue-600 text-sm font-medium whitespace-nowrap ml-4"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectCustomer(customer);
                          }}
                        >
                          选择
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-400">
                {filteredCustomers.length} 个客户
              </span>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSearchTerm('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}