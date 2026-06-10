'use client';
import { useState, useEffect } from 'react';

interface Product {
  id: number;
  title: string;
  price: number;
  currency: string;
  main_image_url: string;
  platform: string;
  status: 'unclaimed' | 'claimed';
  documents?: { name: string; url: string }[];
}

export default function ProductCollectPage() {
  const [activeTab, setActiveTab] = useState<'link' | 'plugin'>('link');
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState({ all: 0, unclaimed: 0, claimed: 0 });
  const [filterStatus, setFilterStatus] = useState<'all' | 'unclaimed' | 'claimed'>('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [alibabaCookie, setAlibabaCookie] = useState('');
  const [cookieSaved, setCookieSaved] = useState(false);

  const fetchProducts = async (status = filterStatus, page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collected-products?status=${status}&page=${page}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.items || []);
      setSummary(data.summary || { all: 0, unclaimed: 0, claimed: 0 });
      setPagination((prev) => ({ ...prev, total: data.total || 0, current: page }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterStatus]);

  useEffect(() => {
    fetch('/api/admin/users/token?type=alibaba')
      .then((res) => res.json())
      .then((data) => data.cookie && setAlibabaCookie(data.cookie))
      .catch(console.error);
  }, []);

  const saveAlibabaCookie = async () => {
    const res = await fetch('/api/admin/users/token?type=alibaba', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: alibabaCookie }),
    });
    if (res.ok) {
      setCookieSaved(true);
      setTimeout(() => setCookieSaved(false), 3000);
    } else {
      alert('保存失败');
    }
  };

  const fetchApiToken = async () => {
    setTokenLoading(true);
    try {
      const res = await fetch('/api/admin/users/token');
      const data = await res.json();
      if (data.token) setApiToken(data.token);
    } catch (error) {
      console.error(error);
    } finally {
      setTokenLoading(false);
    }
  };

  const refreshApiToken = async () => {
    setTokenLoading(true);
    try {
      const res = await fetch('/api/admin/users/token', { method: 'POST' });
      const data = await res.json();
      if (data.token) {
        setApiToken(data.token);
        alert('Token已刷新');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleLinkCollect = async () => {
    const urlList = urls.split('\n').filter((u) => u.trim());
    if (!urlList.length) return;
    setLoading(true);
    for (const url of urlList) {
      try {
        const res = await fetch('/api/collect/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) alert(`采集成功: ${url}`);
        else alert(`采集失败: ${url}`);
      } catch {
        alert(`采集失败: ${url}`);
      }
    }
    setUrls('');
    setLoading(false);
    fetchProducts();
  };

  const handleClaim = async (id: number) => {
    await fetch('/api/collected-products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'claimed' }),
    });
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await fetch('/api/collected-products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchProducts();
  };

  const handleEdit = (product: Product) => setEditingProduct(product);

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get('title') as string;
    const price = parseFloat(formData.get('price') as string);
    const main_image_url = formData.get('main_image_url') as string;
    await fetch('/api/collected-products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingProduct!.id, title, price, main_image_url }),
    });
    setEditingProduct(null);
    fetchProducts();
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/upload/collect', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        alert('文件上传成功');
        const newDocs = [...(editingProduct?.documents || []), { name: file.name, url: data.url }];
        await fetch('/api/collected-products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProduct!.id, documents: newDocs }),
        });
        setEditingProduct((prev) => (prev ? { ...prev, documents: newDocs } : null));
      }
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">产品采集</h1>

      {/* 选项卡 */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${
            activeTab === 'link' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('link')}
        >
          链接采集
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === 'plugin' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('plugin')}
        >
          插件采集
        </button>
      </div>

      {/* 链接采集区域 */}
      {activeTab === 'link' && (
        <div className="mb-8">
          <textarea
            rows={6}
            className="w-full border border-gray-300 rounded-md p-3"
            placeholder="请输入商品链接，每行一个"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
          />
          <div className="mt-4 space-x-2">
            <button
              onClick={handleLinkCollect}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
            >
              {loading ? '采集中...' : '开始采集'}
            </button>
            <button onClick={() => setUrls('')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md">
              清空
            </button>
          </div>
          <details className="mt-4 border rounded p-2 bg-gray-50">
            <summary className="cursor-pointer text-sm text-gray-600">阿里国际站 Cookie 配置（提升链接采集成功率）</summary>
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                1. 登录阿里国际站（买家账号）
                <br />
                2. 按F12 → Application → Cookies → 复制整个cookie字符串
                <br />
                3. 粘贴到下方
              </p>
              <textarea
                rows={3}
                className="w-full border rounded p-2 mt-1 text-sm"
                placeholder="粘贴 Cookie"
                value={alibabaCookie}
                onChange={(e) => setAlibabaCookie(e.target.value)}
              />
              <button onClick={saveAlibabaCookie} className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm">
                保存 Cookie
              </button>
              {cookieSaved && <span className="ml-2 text-green-600 text-sm">已保存</span>}
            </div>
          </details>
          <p className="text-gray-500 text-sm mt-2">支持平台：阿里巴巴国际站、1688等</p>
        </div>
      )}

      {/* 插件采集区域 */}
      {activeTab === 'plugin' && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <p>
            您还未安装采集插件，建议 <a href="/crawler-plugin.crx" download className="text-blue-600">安装采集插件</a>
            ，功能更稳定更快速。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={fetchApiToken} disabled={tokenLoading} className="bg-blue-600 text-white px-3 py-1 rounded">
              获取API Token
            </button>
            <button
              onClick={refreshApiToken}
              disabled={tokenLoading}
              className="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              刷新 Token
            </button>
          </div>
          {apiToken && (
            <div className="mt-2 p-2 bg-white rounded border flex items-center justify-between flex-wrap gap-2">
              <code className="break-all text-sm">{apiToken}</code>
              <button
                onClick={() => navigator.clipboard.writeText(apiToken)}
                className="text-blue-600 text-sm hover:underline"
              >
                复制
              </button>
            </div>
          )}
          <p className="mt-2 text-sm text-gray-500">
            提示：刷新 Token 将使旧 Token 立即失效，请同步更新插件中的配置。
          </p>
        </div>
      )}

      {/* 产品列表 */}
      <div>
        <div className="flex space-x-4 mb-4">
          <button
            className={`px-3 py-1 rounded-full ${
              filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setFilterStatus('all')}
          >
            全部 ({summary.all})
          </button>
          <button
            className={`px-3 py-1 rounded-full ${
              filterStatus === 'unclaimed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setFilterStatus('unclaimed')}
          >
            未认领 ({summary.unclaimed})
          </button>
          <button
            className={`px-3 py-1 rounded-full ${
              filterStatus === 'claimed' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setFilterStatus('claimed')}
          >
            已认领 ({summary.claimed})
          </button>
        </div>

        {loading && <div className="text-center py-10">加载中...</div>}
        {!loading && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-2 text-left">图片</th>
                  <th className="px-4 py-2 text-left">标题</th>
                  <th className="px-4 py-2 text-left">价格</th>
                  <th className="px-4 py-2 text-left">平台</th>
                  <th className="px-4 py-2 text-left">状态</th>
                  <th className="px-4 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {product.main_image_url ? (
                        <img src={product.main_image_url} className="w-12 h-12 object-cover" alt="" />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2 max-w-md truncate">{product.title}</td>
                    <td className="px-4 py-2">{product.price ? `${product.currency} ${product.price}` : '-'}</td>
                    <td className="px-4 py-2">{product.platform || '-'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          product.status === 'claimed' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {product.status === 'claimed' ? '已认领' : '未认领'}
                      </span>
                    </td>
                    <td className="px-4 py-2 space-x-2">
                      <button onClick={() => handleEdit(product)} className="text-blue-600 hover:underline">
                        编辑
                      </button>
                      {product.status === 'unclaimed' && (
                        <button onClick={() => handleClaim(product.id)} className="text-green-600 hover:underline">
                          认领
                        </button>
                      )}
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:underline">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && (
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => fetchProducts(filterStatus, pagination.current - 1)}
              disabled={pagination.current === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-3 py-1">
              第 {pagination.current} 页 / 共 {Math.ceil(pagination.total / pagination.pageSize)} 页
            </span>
            <button
              onClick={() => fetchProducts(filterStatus, pagination.current + 1)}
              disabled={pagination.current === Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      {/* 编辑模态框 */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">编辑产品</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">标题</label>
                <input name="title" defaultValue={editingProduct.title} className="w-full border rounded px-3 py-2" required />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">价格</label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={editingProduct.price || ''}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">主图链接</label>
                <input
                  name="main_image_url"
                  defaultValue={editingProduct.main_image_url || ''}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">产品说明书</label>
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={uploading}
                />
                {editingProduct.documents?.map((doc, i) => (
                  <div key={i}>
                    <a href={doc.url} target="_blank" className="text-blue-600 text-sm">
                      {doc.name}
                    </a>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 border rounded">
                  取消
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}