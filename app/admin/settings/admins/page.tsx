'use client';

import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  englishName: string;
  createdAt: string;
  mustChangePassword: boolean;
}

export default function AdminsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', englishName: '', password: '' });

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 打开添加表单并重置所有字段
  const handleOpenAddForm = () => {
    setNewUser({ email: '', name: '', englishName: '', password: '' });
    setShowAddForm(true);
  };

  // 取消添加
  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewUser({ email: '', name: '', englishName: '', password: '' });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: '管理员添加成功' });
      handleCancelAdd(); // 关闭表单并重置
      fetchUsers();
    } else {
      setMessage({ type: 'error', text: data.error || '添加失败' });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('确定删除该管理员吗？')) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE', credentials: 'include' });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: 'success', text: '删除成功' });
      fetchUsers();
    } else {
      setMessage({ type: 'error', text: data.error || '删除失败' });
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">网站管理员</h1>
        {users.length < 3 && (
          <button
            onClick={handleOpenAddForm}  // 使用重置函数
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + 添加管理员
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddUser} className="mb-6 p-4 border rounded bg-gray-50" autoComplete="off">
          <h2 className="text-lg font-semibold mb-3">添加新管理员</h2>
          <div className="grid grid-cols-1 gap-3">
            <input
              type="email"
              placeholder="邮箱 (登录账号)"
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value})}
              required
              className="border p-2 rounded"
              autoComplete="off"
            />
            <input
              type="text"
              placeholder="姓名"
              value={newUser.name}
              onChange={e => setNewUser({...newUser, name: e.target.value})}
              required
              className="border p-2 rounded"
              autoComplete="off"
            />
            <input
              type="text"
              placeholder="英文名"
              value={newUser.englishName}
              onChange={e => setNewUser({...newUser, englishName: e.target.value})}
              required
              className="border p-2 rounded"
              autoComplete="off"
            />
            <input
              type="password"
              placeholder="初始密码"
              value={newUser.password}
              onChange={e => setNewUser({...newUser, password: e.target.value})}
              required
              className="border p-2 rounded"
              autoComplete="new-password"  // 防止浏览器自动填充
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">确认添加</button>
              <button type="button" onClick={handleCancelAdd} className="bg-gray-300 px-4 py-2 rounded">取消</button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">英文名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.englishName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {users.length > 1 && (
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500 mt-4">最多可添加 3 个管理员账号（包括当前登录账号）。</p>
    </div>
  );
}