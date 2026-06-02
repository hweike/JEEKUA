'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { STAGES, SCALES, COUNTRIES } from '@/lib/CRM/types';
import type { CustomerStage, CustomerScale } from '@/lib/CRM/types';

// 可搜索国家选择组件（保持不变）
function CountrySelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = COUNTRIES.filter(c => c.includes(search));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country: string) => {
    onChange(country);
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
              key={country}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${idx === highlightIndex ? 'bg-blue-100' : ''}`}
              onClick={() => handleSelect(country)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              {country}
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
    name: initialData.name || '',
    country: initialData.country || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 仅校验必填项
    if (!form.name.trim()) {
      alert('请填写客户名称');
      return;
    }
    if (!form.country) {
      alert('请选择国家');
      return;
    }

    setLoading(true);
    
    // 处理官网：自动补全 https://
    let website = form.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = 'https://' + website;
    }
    
    const submitData = {
      name: form.name,
      country: form.country,
      companyName: form.companyName,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      website: website,
      flag: form.flag,
      address: form.address,
      stage: form.stage || undefined,      // 空字符串转为 undefined
      importance: form.importance === 0 ? undefined : form.importance,
      scale: form.scale || undefined,
      notes: form.notes,
      emailSubscribed: '未订阅',
    };
    
    const url = isEdit ? `/api/admin/crm/${initialData.id}` : '/api/admin/crm';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: JSON.stringify(submitData), headers: { 'Content-Type': 'application/json' } });
    if (res.ok) router.push('/admin/crm');
    else alert('保存失败');
    setLoading(false);
  };

  const renderStars = () => (
    <div className="flex gap-2 mt-2">
      {[1, 2, 3].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => setForm({ ...form, importance: star as 1|2|3 })}
        >
          <Star
            size={28}
            className={star <= form.importance ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">{isEdit ? '编辑客户' : '新增客户'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 客户名称 */}
        <div>
          <label className="block text-sm font-medium">客户名称 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 国家 */}
        <div>
          <label className="block text-sm font-medium">国家 *</label>
          <CountrySelect
            value={form.country}
            onChange={(val) => setForm({...form, country: val})}
          />
        </div>

        {/* 公司名称 */}
        <div>
          <label className="block text-sm font-medium">公司名称</label>
          <input
            type="text"
            value={form.companyName}
            onChange={e => setForm({...form, companyName: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 邮箱 */}
        <div>
          <label className="block text-sm font-medium">邮箱</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 联系电话 */}
        <div>
          <label className="block text-sm font-medium">联系电话</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium">WhatsApp</label>
          <input
            type="text"
            value={form.whatsapp}
            onChange={e => setForm({...form, whatsapp: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 官网 */}
        <div>
          <label className="block text-sm font-medium">官网</label>
          <input
            type="text"
            value={form.website}
            onChange={e => setForm({...form, website: e.target.value})}
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
            onChange={e => setForm({...form, flag: e.target.value})}
            placeholder="例如 VIP"
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 地址 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">地址</label>
          <textarea
            value={form.address}
            onChange={e => setForm({...form, address: e.target.value})}
            rows={2}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        {/* 客户阶段（非必填） */}
        <div>
          <label className="block text-sm font-medium">客户阶段</label>
          <select
            value={form.stage}
            onChange={e => setForm({...form, stage: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          >
            <option value="">请选择</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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
            onChange={e => setForm({...form, scale: e.target.value})}
            className="mt-1 w-full border rounded-md p-2"
          >
            <option value="">请选择</option>
            {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* 备注 */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">备注</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({...form, notes: e.target.value})}
            rows={3}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded-md">取消</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}