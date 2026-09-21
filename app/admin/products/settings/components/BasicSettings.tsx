'use client';

import { DefaultSettings } from '../page';

interface Props {
  settings: DefaultSettings;
  onUpdate: (settings: DefaultSettings) => void;
  locale: string;  // 接收 locale 参数（保留，便于将来扩展）
}

export default function BasicSettings({ settings, onUpdate, locale }: Props) {
  const handleChange = (field: keyof DefaultSettings, value: any) => {
    onUpdate({ ...settings, [field]: value });
  };

  // 处理店铺链接更新
  const handleStoreLinkChange = (index: number, field: 'name' | 'url', value: string) => {
    const currentLinks = settings.storeLinks || [{ name: '', url: '' }, { name: '', url: '' }];
    const newLinks = [...currentLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onUpdate({ ...settings, storeLinks: newLinks });
  };

  // 获取当前的 storeLinks，若不存在则返回两个空对象
  const storeLinks = settings.storeLinks || [{ name: '', url: '' }, { name: '', url: '' }];

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* 商品默认值卡片 */}
      <div className="border rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">商品默认值</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">默认最小起订量</label>
              <input
                type="number"
                value={settings.default_min_order_qty ?? 1}
                onChange={(e) => handleChange('default_min_order_qty', parseInt(e.target.value) || 1)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">默认库存状态</label>
              <select
                value={settings.default_availability ?? 'in_stock'}
                onChange={(e) => handleChange('default_availability', e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="in_stock">现货</option>
                <option value="out_of_stock">缺货</option>
                <option value="preorder">预定</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">品牌</label>
              <input
                type="text"
                value={settings.default_brand ?? 'Neutral'}
                onChange={(e) => handleChange('default_brand', e.target.value)}
                className="border rounded p-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">不填写时，产品默认品牌为 Generic</p>
            </div>
            <div>
              <label className="block font-medium mb-1">SKU 生成规则</label>
              <input
                type="text"
                value={settings.sku_rule ?? 'P-{timestamp}'}
                onChange={(e) => handleChange('sku_rule', e.target.value)}
                className="border rounded p-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">{'{timestamp}'} 会被替换为时间戳</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">货币</label>
              <select
                value={settings.default_currency ?? 'USD'}
                onChange={(e) => handleChange('default_currency', e.target.value)}
                className="border rounded p-2 w-full"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">运费</label>
              <input
                type="number"
                step="0.01"
                value={settings.default_shipping_cost ?? 0}
                onChange={(e) => handleChange('default_shipping_cost', parseFloat(e.target.value) || 0)}
                className="border rounded p-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">默认0（包邮），运费可在Offer中声明</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">退货天数</label>
              <input
                type="number"
                value={settings.default_return_days ?? 30}
                onChange={(e) => handleChange('default_return_days', parseInt(e.target.value) || 0)}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">制造商零件号 (MPN)</label>
              <input
                type="text"
                value={settings.default_mpn ?? '{SKU}'}
                onChange={(e) => handleChange('default_mpn', e.target.value)}
                placeholder="默认MPN为空值"
                className="border rounded p-2 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">输入 {`{SKU}`} 表示使用产品的 SKU 作为 MPN，留空则不填充 MPN</p>
            </div>
          </div>
        </div>
      </div>

      {/* 新增：商品详情页跳转交易店铺卡片 */}
      <div className="border rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-2">商品详情页跳转交易店铺</h2>
        <p className="text-sm text-gray-500 mb-4">
          配置店铺名称和网址，将在商品详情页显示，引导客户进入您的阿里国际站、Shopify 等交易平台。
        </p>
        <div className="space-y-4">
          {storeLinks.map((store, index) => (
            <div key={index} className="border p-4 rounded space-y-2">
              <div className="font-medium text-sm">店铺 {index + 1}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">店铺名称</label>
                  <input
                    type="text"
                    value={store.name}
                    onChange={(e) => handleStoreLinkChange(index, 'name', e.target.value)}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="例如：阿里国际站"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">店铺网址</label>
                  <input
                    type="url"
                    value={store.url}
                    onChange={(e) => handleStoreLinkChange(index, 'url', e.target.value)}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">提示：店铺网址需以 http:// 或 https:// 开头</p>
      </div>
    </div>
  );
}