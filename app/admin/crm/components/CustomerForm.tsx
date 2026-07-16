'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star, User } from 'lucide-react';
import type { CustomerStage, CustomerScale, Customer } from '@/lib/CRM/types';
import { STAGES, SCALES } from '@/lib/CRM/types';
import { COUNTRIES, getCountryNameZh } from '@/lib/countries';

// 可搜索国家选择组件（返回国家中文名，用于管理员 country 字段）
function CountrySelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = COUNTRIES.filter(c => c.nameZh.includes(search));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (countryName: string) => {
    onChange(countryName);
    setSearch('');
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="选择或搜索国家"
        className="mt-1 w-full border rounded-md p-2"
      />
      {isOpen && filteredCountries.length > 0 && (
        <ul className="absolute z-10 w-full max-h-60 overflow-auto bg-white border rounded-md shadow-lg mt-1">
          {filteredCountries.map((country, idx) => (
            <li
              key={country.code}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${idx === highlightIndex ? 'bg-blue-100' : ''}`}
              onClick={() => handleSelect(country.nameZh)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              {country.nameZh}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredCountries.length === 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 p-2 text-gray-500">
          未找到匹配的国家
        </div>
      )}
    </div>
  );
}

interface Props {
  initialData?: Partial<Customer>;
  isEdit?: boolean;
}

export default function CustomerForm({ initialData = {}, isEdit = false }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
    name: initialData.name || '',
    country: initialData.country || '', // 管理员用，存储文本
    // country_code 不放在表单中，仅用于预览
    companyName: initialData.companyName || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    whatsapp: initialData.whatsapp || '',
    website: initialData.website || '',
    flag: initialData.flag || '',
    address: initialData.address || '',
    stage: initialData.stage || '',
    importance: initialData.importance || 0,
    scale: initialData.scale || '',
    notes: initialData.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const isRegisterUser = initialData.source === 'register';
  const customerCountryCode = initialData.country_code || ''; // 用于预览

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert('请填写客户名称');
      return;
    }
    if (!form.country.trim()) {
      alert('请选择/填写国家');
      return;
    }

    setLoading(true);

    let website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = 'https://' + website;
    }

    const submitData = {
      first_name: form.first_name,
      last_name: form.last_name,
      name: form.name,
      country: form.country, // 管理员填写的文本
      // country_code 不提交，保留原值（由 initialData 携带，我们不会修改它）
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      website,
      flag: form.flag,
      address: form.address,
      stage: form.stage || undefined,
      importance: form.importance === 0 ? undefined : form.importance,
      scale: form.scale || undefined,
      notes: form.notes,
      emailSubscribed: '未订阅',
    };

    const url = isEdit ? `/api/admin/crm/${initialData.id}` : '/api/admin/crm';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      body: JSON.stringify(submitData),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) router.push('/admin/crm');
    else alert('保存失败');
    setLoading(false);
  };

  const renderStars = () => (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setForm({ ...form, importance: star as 1 | 2 | 3 })}
        >
          <Star
            size={28}
            className={star <= form.importance ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );

  // 预览用的国家中文名
  const previewCountry = customerCountryCode ? getCountryNameZh(customerCountryCode) : '未设置';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 注册用户预览信息卡片 */}
      {isRegisterUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <User size={16} /> 客户注册信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium text-gray-600">Name:</span>{' '}
              {[form.first_name, form.last_name].filter(Boolean).join(' ') || '-'}
            </div>
            <div>
              <span className="font-medium text-gray-600">Country:</span> {previewCountry}
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-600">Email:</span> {form.email}
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-600">Address:</span>{' '}
              {form.address || '暂无地址'}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">{isEdit ? '编辑客户' : '新增客户'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 客户名称（管理员使用） */}
          <div>
            <label className="block text-sm font-medium">客户名称 *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 国家（管理员使用，存储于 country 字段） */}
          <div>
            <label className="block text-sm font-medium">国家（管理员） *</label>
            <CountrySelect
              value={form.country}
              onChange={(val) => setForm({ ...form, country: val })}
            />
            <p className="text-xs text-gray-400 mt-1">此信息仅管理员可见，独立于客户的国家设置</p>
          </div>

          {/* 公司名称 */}
          <div>
            <label className="block text-sm font-medium">公司名称</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 邮箱：注册用户只读 */}
          <div>
            <label className="block text-sm font-medium">邮箱</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              readOnly={isRegisterUser}
              className={`mt-1 w-full border rounded-md p-2 ${
                isRegisterUser ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
              }`}
            />
            {isRegisterUser && (
              <p className="text-xs text-gray-400 mt-1">注册用户邮箱不可修改</p>
            )}
          </div>

          {/* 联系电话 */}
          <div>
            <label className="block text-sm font-medium">联系电话</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 官网 */}
          <div>
            <label className="block text-sm font-medium">官网</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="example.com 或 https://example.com"
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 标记 */}
          <div>
            <label className="block text-sm font-medium">标记</label>
            <input
              type="text"
              value={form.flag}
              onChange={(e) => setForm({ ...form, flag: e.target.value })}
              placeholder="例如 VIP"
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 地址（管理员可见） */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">地址</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>

          {/* 客户阶段（非必填） */}
          <div>
            <label className="block text-sm font-medium">客户阶段</label>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            >
              <option value="">请选择</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 重要等级（非必填） */}
          <div>
            <label className="block text-sm font-medium">重要等级</label>
            {renderStars()}
            {form.importance === 0 && <p className="text-xs text-gray-400 mt-1">未评级</p>}
          </div>

          {/* 客户规模（非必填） */}
          <div>
            <label className="block text-sm font-medium">客户规模</label>
            <select
              value={form.scale}
              onChange={(e) => setForm({ ...form, scale: e.target.value })}
              className="mt-1 w-full border rounded-md p-2"
            >
              <option value="">请选择</option>
              {SCALES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 备注 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="mt-1 w-full border rounded-md p-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}