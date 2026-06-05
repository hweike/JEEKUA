'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Plus, Star, Edit, Check, X, Eye, Search } from 'lucide-react';
import type { Customer } from '@/lib/CRM/types';
import { STAGES } from '@/lib/CRM/types';

export default function CRMListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // 行内编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'flag' | 'email' | 'phone' | 'stage' | 'importance' | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');

  // 获取客户列表（带错误处理）
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/crm');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // 确保 data 是数组，防止后续 slice 报错
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载客户列表失败:', err);
      alert('加载失败，请刷新页面重试');
      setCustomers([]); // 失败时置为空数组
    } finally {
      setLoading(false);
    }
  };

  // 搜索过滤
  useEffect(() => {
    // 确保 customers 是数组
    const customersArray = Array.isArray(customers) ? customers : [];
    if (!searchTerm.trim()) {
      setFilteredCustomers(customersArray);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = customersArray.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.companyName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.country?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term) ||
        c.flag?.toLowerCase().includes(term)
      );
      setFilteredCustomers(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, customers]);

  const handleDelete = async (id: string) => {
    if (confirm('确定删除该客户吗？')) {
      await fetch(`/api/admin/crm/${id}`, { method: 'DELETE' });
      fetchCustomers();
    }
  };

  const startEdit = (id: string, field: 'flag' | 'email' | 'phone' | 'stage' | 'importance', currentValue: string | number) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingId || !editField) return;
    const customer = customers.find(c => c.id === editingId);
    if (!customer) return;

    let updatedValue: any = editValue;
    if (editField === 'importance') updatedValue = Number(editValue);

    const updated = { ...customer, [editField]: updatedValue };
    const res = await fetch(`/api/admin/crm/${editingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      fetchCustomers();
    } else {
      alert('更新失败');
    }
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditField(null);
    setEditValue('');
  };

  // 确保 filteredCustomers 是数组再调用 slice
  const safeFilteredCustomers = Array.isArray(filteredCustomers) ? filteredCustomers : [];
  const totalPages = Math.ceil(safeFilteredCustomers.length / pageSize);
  const paginatedCustomers = safeFilteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 星星渲染组件
  const renderStars = (importance: number, isEditing: boolean, onChange?: (val: number) => void) => {
    if (isEditing) {
      return (
        <div className="flex gap-1">
          {[1, 2, 3].map(star => (
            <button key={star} type="button" onClick={() => onChange?.(star)}>
              <Star size={18} className={star <= (editValue as number) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map(star => (
          <Star key={star} size={16} className={star <= importance ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
    );
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (loading) return <div className="p-8 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 顶部搜索栏 + 操作按钮 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索名称/公司/邮箱/国家/电话/标记..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Link href="/admin/crm/subscribe" className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
            邮件订阅
          </Link>
          <Link href="/admin/crm/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} /> 新增客户
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标记</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">国家</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订阅状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">阶段</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">重要等级</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 group">
                {/* 标记 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === c.id && editField === 'flag' ? (
                    <div className="flex items-center gap-1">
                      <input type="text" value={editValue as string} onChange={(e) => setEditValue(e.target.value)} className="border rounded px-1 py-0.5 text-sm" autoFocus />
                      <button onClick={saveEdit} className="text-green-600"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span>{c.flag || '-'}</span>
                      <button onClick={() => startEdit(c.id, 'flag', c.flag || '')} className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-blue-600">
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>

                {/* 客户名称：点击进入编辑页，悬浮显示预览图标 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/crm/${c.id}/edit`} className="text-blue-600 hover:underline">
                      {c.name || '未命名'}
                    </Link>
                    <Link href={`/admin/crm/${c.id}`} className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-blue-600" title="预览客户详情">
                      <Eye size={14} />
                    </Link>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">{c.country}</td>

                {/* 邮箱 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === c.id && editField === 'email' ? (
                    <div className="flex items-center gap-1">
                      <input type="email" value={editValue as string} onChange={(e) => setEditValue(e.target.value)} className="border rounded px-1 py-0.5 text-sm" autoFocus />
                      <button onClick={saveEdit} className="text-green-600"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span>{c.email || '-'}</span>
                      <button onClick={() => startEdit(c.id, 'email', c.email || '')} className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-blue-600">
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>

                {/* 电话 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === c.id && editField === 'phone' ? (
                    <div className="flex items-center gap-1">
                      <input type="tel" value={editValue as string} onChange={(e) => setEditValue(e.target.value)} className="border rounded px-1 py-0.5 text-sm" autoFocus />
                      <button onClick={saveEdit} className="text-green-600"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span>{c.phone || '-'}</span>
                      <button onClick={() => startEdit(c.id, 'phone', c.phone || '')} className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-blue-600">
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.emailSubscribed === '已订阅' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {c.emailSubscribed}
                  </span>
                </td>

                {/* 阶段 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === c.id && editField === 'stage' ? (
                    <div className="flex items-center gap-1">
                      <select value={editValue as string} onChange={(e) => setEditValue(e.target.value)} className="border rounded px-1 py-0.5 text-sm" autoFocus>
                        <option value="">请选择</option>
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={saveEdit} className="text-green-600"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span>{c.stage || '-'}</span>
                      <button onClick={() => startEdit(c.id, 'stage', c.stage || '')} className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-blue-600">
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>

                {/* 重要等级 */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === c.id && editField === 'importance' ? (
                    <div className="flex items-center gap-1">
                      {renderStars(c.importance || 0, true, (val) => setEditValue(val))}
                      <button onClick={saveEdit} className="text-green-600 ml-1"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="text-red-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      {renderStars(c.importance || 0, false)}
                      <button onClick={() => startEdit(c.id, 'importance', c.importance || 0)} className="opacity-0 group-hover:opacity-100 transition ml-2 text-gray-400 hover:text-blue-600">
                        <Edit size={14} />
                      </button>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.createdAt}</td>

                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <Link href={`/admin/crm/${c.id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-3 inline-block">
                    <Pencil size={18} />
                  </Link>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedCustomers.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-gray-500">暂无客户数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
          <span className="text-sm">第 {currentPage} / {totalPages} 页</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
        </div>
      )}
    </div>
  );
}