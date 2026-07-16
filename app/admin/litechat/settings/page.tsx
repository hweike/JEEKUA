// app/admin/litechat/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Loader2, ArrowLeft } from 'lucide-react';

interface AdminSettings {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  nickname?: string;
  online_status: 'online' | 'offline' | 'busy' | 'away';
  default_welcome: string;
  offline_reply: string;
  online_start_time: string;
  online_end_time: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/litechat/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过 2MB' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');
      const res = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(prev => prev ? { ...prev, avatar_url: data.url } : null);
        setMessage({ type: 'success', text: '头像上传成功' });
      } else {
        throw new Error(data.error || '上传失败');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '上传失败' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/litechat/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setMessage({ type: 'success', text: '保存成功' });
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  if (!settings) {
    return <div className="p-8 text-center text-red-500">加载失败</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* ===== 返回按钮（新增） ===== */}
      <Link
        href="/admin/litechat"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 transition mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回聊天</span>
      </Link>

      <h1 className="text-2xl font-bold mb-6">个人设置</h1>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow divide-y">
        {/* 头像 */}
        <div className="p-4 flex items-center gap-6">
          <div className="flex-shrink-0">
            {settings.avatar_url ? (
              <img
                src={settings.avatar_url}
                alt="头像"
                className="w-20 h-20 rounded-full object-cover bg-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                {settings.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">头像</p>
            <label className="mt-1 inline-block px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 cursor-pointer transition">
              {uploading ? '上传中...' : '选择图片'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG，最大 2MB</p>
          </div>
        </div>

        {/* 昵称 */}
        <div className="p-4">
          <label className="block text-sm text-gray-600 mb-1">昵称</label>
          <input
            value={settings.nickname || ''}
            onChange={(e) => setSettings({ ...settings, nickname: e.target.value })}
            placeholder="请输入昵称"
            className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">留空则使用管理员名称</p>
        </div>

        {/* 在线状态 */}
        <div className="p-4">
          <label className="block text-sm text-gray-600 mb-1">在线状态</label>
          <select
            value={settings.online_status}
            onChange={(e) => setSettings({ ...settings, online_status: e.target.value as any })}
            className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="online">在线</option>
            <option value="busy">忙碌</option>
            <option value="away">离开</option>
            <option value="offline">离线</option>
          </select>
        </div>

        {/* 在线时间 */}
        <div className="p-4">
          <label className="block text-sm text-gray-600 mb-1">在线时间段(北京时间)</label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={settings.online_start_time?.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, online_start_time: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400">至</span>
            <input
              type="time"
              value={settings.online_end_time?.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, online_end_time: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 默认欢迎语 */}
        <div className="p-4">
          <label className="block text-sm text-gray-600 mb-1">默认欢迎语</label>
          <textarea
            value={settings.default_welcome || ''}
            onChange={(e) => setSettings({ ...settings, default_welcome: e.target.value })}
            rows={2}
            className="w-full max-w-md border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">客户打开聊天窗口时显示的欢迎语</p>
        </div>

        {/* 离线回复 */}
        <div className="p-4">
          <label className="block text-sm text-gray-600 mb-1">离线自动回复</label>
          <textarea
            value={settings.offline_reply || ''}
            onChange={(e) => setSettings({ ...settings, offline_reply: e.target.value })}
            rows={2}
            className="w-full max-w-md border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">管理员离线时，自动发送给客户的回复</p>
        </div>

        {/* 保存按钮 */}
        <div className="p-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}