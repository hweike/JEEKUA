'use client';
import { useEffect, useState } from 'react';
import { Trash2, ExternalLink, Image, FileText, Film, Edit2, Check, X } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';

interface FileItem {
  id: string;
  storage_key: string;
  display_name: string;
  mime_type: string;
  size: number;
  url: string;
  referenceCount: number;
  created_at: string;
  alt_text: string | null;
}

export default function FileListTable({ onRefresh }: { onRefresh: () => void }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingAltFor, setEditingAltFor] = useState<string | null>(null);
  const [tempAltText, setTempAltText] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/files?page=${page}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setFiles(data.files);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      alert('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除文件吗？只有未被任何内容引用的文件才能删除。')) return;
    try {
      const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFiles();
        onRefresh();
      } else {
        let errorMsg = '删除失败';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const err = await res.json();
            errorMsg = err.error || errorMsg;
          } catch {
            errorMsg = '服务器返回了无效的响应格式';
          }
        } else {
          errorMsg = await res.text().catch(() => '未知错误');
        }
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error('删除请求异常:', err);
      alert('网络错误或服务器无响应');
    }
  };

  const startEditAlt = (file: FileItem) => {
    setEditingAltFor(file.id);
    setTempAltText(file.alt_text || '');
  };

  const cancelEditAlt = () => {
    setEditingAltFor(null);
    setTempAltText('');
  };

  const saveAltText = async (fileId: string) => {
    if (!fileId || fileId === 'undefined') {
      alert('无效的文件ID，请刷新页面后重试');
      return;
    }
    try {
      const res = await fetch(`/api/admin/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: tempAltText }),
      });
      if (!res.ok) throw new Error('保存失败');
      setFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, alt_text: tempAltText } : f))
      );
      setEditingAltFor(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image size={16} />;
    if (mime.startsWith('video/')) return <Film size={16} />;
    return <FileText size={16} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预览</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">替代文本</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">引用数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">上传时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {files.map(file => (
              <tr key={file.id}>
                <td className="px-6 py-4">
                  {file.mime_type.startsWith('image/') ? (
                    <img
                      src={getImageUrl(file.url)}
                      alt={file.alt_text || file.display_name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      {getIcon(file.mime_type)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{file.display_name}</td>
                <td className="px-6 py-4">
                  {editingAltFor === file.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempAltText}
                        onChange={(e) => setTempAltText(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button onClick={() => saveAltText(file.id)} className="text-green-600 hover:text-green-800">
                        <Check size={16} />
                      </button>
                      <button onClick={cancelEditAlt} className="text-red-600 hover:text-red-800">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span className="text-sm text-gray-600 truncate max-w-xs">
                        {file.alt_text || <span className="text-gray-400">—</span>}
                      </span>
                      <button
                        onClick={() => startEditAlt(file)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{file.mime_type.split('/')[1]}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{formatSize(file.size)}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{file.referenceCount}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(file.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <a href={getImageUrl(file.url)} target="_blank" className="text-blue-600 hover:text-blue-800" rel="noopener noreferrer">
                    <ExternalLink size={18} />
                  </a>
                  <button onClick={() => handleDelete(file.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 flex justify-between items-center">
        <div className="text-sm text-gray-500">共 {total} 个文件</div>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border rounded disabled:opacity-50">上一页</button>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded disabled:opacity-50">下一页</button>
        </div>
      </div>
    </div>
  );
}