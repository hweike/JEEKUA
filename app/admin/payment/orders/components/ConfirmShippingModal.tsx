// app/admin/payment/orders/components/ConfirmShippingModal.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Loader2,
  Search,
  Plus,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Save,
  XCircle,
} from 'lucide-react';
import { createPortal } from 'react-dom';
// ✅ 删除：import { carrierService } from '@/lib/payment/services/carrier.service';
import type { Carrier } from '@/lib/payment/types/carrier';
import type { ShippingRecord } from '@/lib/payment/types/order';
import ImageUpload from '@/components/ImageUpload';

interface ConfirmShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    shippingMethod: string;
    trackingNumber: string;
    carrierKey: string;
    carrierName: string;
    trackingImage: string;
  }) => void;
  onSaveRecords?: (records: ShippingRecord[]) => void;
  orderShippingMethod?: string;
  siteId?: string;
  loading?: boolean;
  existingRecords?: ShippingRecord[];
  orderStatus?: string;
  mode?: 'confirm' | 'management';
  orderId?: string;
}

const SHIPPING_METHODS = ['快递', '多式联运', '海运', '空运', '陆运', '邮政'];
const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function ConfirmShippingModal({
  isOpen,
  onClose,
  onConfirm,
  onSaveRecords,
  orderShippingMethod = '快递',
  siteId,
  loading = false,
  existingRecords = [],
  orderStatus = 'paid',
  mode = 'confirm',
  orderId,
}: ConfirmShippingModalProps) {
  const [formData, setFormData] = useState({
    shippingMethod: orderShippingMethod || '快递',
    trackingNumber: '',
    carrierKey: '',
    carrierName: '',
    trackingImage: '',
  });
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [isCarrierOpen, setIsCarrierOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [carriersHasMore, setCarriersHasMore] = useState(true);
  const [carriersPage, setCarriersPage] = useState(0);
  const [isCustomInput, setIsCustomInput] = useState(false);
  const [customCarrierName, setCustomCarrierName] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    tracking_number: string;
    carrier_name_cn: string;
    carrier_key: string;
    shipping_method: string;
    tracking_image: string;
  } | null>(null);

  const [records, setRecords] = useState<ShippingRecord[]>(existingRecords);

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const carrierButtonRef = useRef<HTMLButtonElement>(null);
  const carrierListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ✅ 同步外部数据
  useEffect(() => {
    setRecords(existingRecords);
  }, [existingRecords]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isCarrierOpen) {
      setCarriersPage(0);
      setCarriers([]);
      setCarriersHasMore(true);
      loadCarriers(0, true, carrierSearch);
    }
  }, [isCarrierOpen]);

  const updateDropdownPosition = useCallback(() => {
    if (carrierButtonRef.current) {
      const rect = carrierButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const handleOpenCarrierDropdown = useCallback(() => {
    updateDropdownPosition();
    setIsCarrierOpen(true);
    const currentName = formData.carrierName || '';
    setSearchInputValue(currentName);
    setCarrierSearch(currentName);
  }, [updateDropdownPosition, formData.carrierName]);

  // ============================================================
  // ✅ 改动：用 fetch 替代 carrierService
  // ============================================================
  const loadCarriers = async (page: number, reset: boolean = false, searchTerm?: string) => {
    if (carriersLoading) return;
    if (!reset && !carriersHasMore) return;

    setCarriersLoading(true);
    try {
      const params = new URLSearchParams({
        shippingMethod: formData.shippingMethod || '快递',
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (siteId) params.set('siteId', siteId);
      if (searchTerm) params.set('search', searchTerm);

      const res = await fetch(`/api/admin/payment/carriers?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();

      const newCarriers = result.items || [];
      setCarriersHasMore(result.hasMore || false);
      setCarriersPage(page + 1);

      if (reset) {
        setCarriers(newCarriers);
      } else {
        setCarriers((prev) => [...prev, ...newCarriers]);
      }
    } catch (error) {
      console.error('加载承运商失败:', error);
    } finally {
      setCarriersLoading(false);
    }
  };
  // ============================================================

  const handleSearchChange = useCallback((value: string) => {
    setSearchInputValue(value);
    setCarrierSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCarriersPage(0);
      setCarriers([]);
      setCarriersHasMore(true);
      loadCarriers(0, true, value);
    }, 300);
  }, []);

  const handleCarrierScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 50 && !carriersLoading && carriersHasMore) {
        loadCarriers(carriersPage, false);
      }
    },
    [carriersLoading, carriersHasMore, carriersPage]
  );

  useEffect(() => {
    if (isOpen && isCarrierOpen) {
      setCarriersPage(0);
      setCarriers([]);
      setCarriersHasMore(true);
      loadCarriers(0, true, carrierSearch);
    }
  }, [formData.shippingMethod]);

  const selectCarrier = (carrier: Carrier) => {
    const displayName = carrier.name_cn || carrier.name_en || carrier.key;

    if (editingId) {
      setEditFormData((prev) => ({
        ...prev!,
        carrier_key: carrier.key,
        carrier_name_cn: carrier.name_cn,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        carrierKey: carrier.key,
        carrierName: displayName,
      }));
    }
    setIsCarrierOpen(false);
    setCarrierSearch('');
    setSearchInputValue('');
    setIsCustomInput(false);
    setCustomCarrierName('');
  };

  const selectEditCarrier = (carrier: Carrier) => {
    const displayName = carrier.name_cn || carrier.name_en || carrier.key;
    setEditFormData((prev) => ({
      ...prev!,
      carrier_key: carrier.key,
      carrier_name_cn: displayName,
    }));
    setIsCarrierOpen(false);
    setCarrierSearch('');
    setSearchInputValue('');
    setIsCustomInput(false);
    setCustomCarrierName('');
  };

  const switchToCustomInput = () => {
    setIsCustomInput(true);
    setIsCarrierOpen(false);
    setCarrierSearch('');
    setSearchInputValue('');
    if (editingId) {
      setEditFormData((prev) => ({
        ...prev!,
        carrier_key: '',
        carrier_name_cn: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        carrierKey: '',
        carrierName: '',
      }));
    }
  };

  const handleCustomInputChange = (value: string) => {
    setCustomCarrierName(value);
    if (editingId) {
      setEditFormData((prev) => ({
        ...prev!,
        carrier_key: '',
        carrier_name_cn: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        carrierKey: '',
        carrierName: value,
      }));
    }
  };

  const getDisplayCarrierName = (carrier: Carrier) => {
    return carrier.name_cn || carrier.name_en || carrier.key;
  };

  const getCurrentCarrierDisplayName = () => {
    if (isCustomInput && customCarrierName) {
      return customCarrierName;
    }
    if (formData.carrierName) {
      return formData.carrierName;
    }
    if (!formData.carrierKey) return '请选择承运商';
    const carrier = carriers.find((c) => c.key === formData.carrierKey);
    return carrier ? getDisplayCarrierName(carrier) : formData.carrierKey;
  };

  const filteredCarriers = carriers;

  const startEditing = (record: ShippingRecord) => {
    setEditingId(record.id);
    setEditFormData({
      tracking_number: record.tracking_number || '',
      carrier_name_cn:
        record.carrier_name_cn || record.carrier_name_en || record.carrier_key || '',
      carrier_key: record.carrier_key || '',
      shipping_method: record.shipping_method || '',
      tracking_image: record.tracking_image || '',
    });
    setShowHistory(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const saveEdit = () => {
    if (!editingId || !editFormData) return;

    if (!editFormData.tracking_number?.trim()) {
      alert('请输入物流单号');
      return;
    }
    if (!editFormData.carrier_name_cn?.trim() && !editFormData.carrier_key) {
      alert('请选择或输入物流承运商');
      return;
    }

    const updatedRecords = records.map((record) => {
      if (record.id === editingId) {
        return {
          ...record,
          carrier_key: editFormData.carrier_key || '',
          carrier_name_cn: editFormData.carrier_name_cn || '',
          carrier_name_en: editFormData.carrier_name_cn || '',
          tracking_number: editFormData.tracking_number || '',
          shipping_method: editFormData.shipping_method || record.shipping_method || '',
          tracking_image: editFormData.tracking_image || '',
        };
      }
      return record;
    });

    setRecords(updatedRecords);
    if (onSaveRecords) {
      onSaveRecords(updatedRecords);
    }
    setEditingId(null);
    setEditFormData(null);
  };

  const deleteRecord = (id: string) => {
    if (!confirm('确定要删除该发货记录吗？')) return;
    const updatedRecords = records.filter((r) => r.id !== id);
    setRecords(updatedRecords);
    if (onSaveRecords) {
      onSaveRecords(updatedRecords);
    }
    if (editingId === id) {
      setEditingId(null);
      setEditFormData(null);
    }
  };

  const addNewRecord = () => {
    if (!formData.trackingNumber.trim()) {
      alert('请输入物流单号');
      return;
    }
    if (!formData.carrierKey && !formData.carrierName.trim()) {
      alert('请选择或输入物流承运商');
      return;
    }

    const newRecord: ShippingRecord = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2),
      carrier_key: formData.carrierKey || '',
      carrier_name_cn: formData.carrierName || '',
      carrier_name_en: formData.carrierName || '',
      tracking_number: formData.trackingNumber,
      shipping_method: formData.shippingMethod,
      tracking_image: formData.trackingImage || '',
      created_at: new Date().toISOString(),
    };

    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    if (onSaveRecords) {
      onSaveRecords(updatedRecords);
    }

    setFormData({
      shippingMethod: formData.shippingMethod,
      trackingNumber: '',
      carrierKey: '',
      carrierName: '',
      trackingImage: '',
    });
    setIsCustomInput(false);
    setCustomCarrierName('');
    setShowHistory(true);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trackingNumber.trim()) {
      alert('请输入物流单号');
      return;
    }
    if (!formData.carrierKey && !formData.carrierName.trim()) {
      alert('请选择或输入物流承运商');
      return;
    }

    onConfirm({
      shippingMethod: formData.shippingMethod,
      trackingNumber: formData.trackingNumber,
      carrierKey: formData.carrierKey,
      carrierName: formData.carrierName,
      trackingImage: formData.trackingImage,
    });

    setFormData({
      shippingMethod: formData.shippingMethod,
      trackingNumber: '',
      carrierKey: '',
      carrierName: '',
      trackingImage: '',
    });
    setIsCustomInput(false);
    setCustomCarrierName('');
  };

  const handleTrackingNumberChange = (value: string) => {
    if (editingId) {
      setEditFormData((prev) => ({ ...prev!, tracking_number: value }));
      return;
    }
    setFormData((prev) => ({ ...prev, trackingNumber: value }));

    if (isCustomInput) return;

    const upper = value.toUpperCase();
    const matched = carriers.find(
      (c) => upper.includes(c.key.toUpperCase()) || value.startsWith(c.key)
    );
    if (matched && !formData.carrierKey) {
      const displayName = matched.name_cn || matched.name_en || matched.key;
      setFormData((prev) => ({
        ...prev,
        carrierKey: matched.key,
        carrierName: displayName,
      }));
    }
  };

  const renderRecord = (record: ShippingRecord) => {
    const isEditing = editingId === record.id;
    const carrierDisplayName =
      record.carrier_name_cn || record.carrier_name_en || record.carrier_key;

    if (isEditing && editFormData) {
      return (
        <div
          key={record.id}
          className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-600">✏️ 编辑发货记录</span>
            <button
              type="button"
              onClick={cancelEditing}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle size={18} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物流单号 *</label>
            <input
              type="text"
              value={editFormData.tracking_number || ''}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev!, tracking_number: e.target.value }))
              }
              placeholder="请输入物流单号..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物流承运商 *</label>
            <div className="relative">
              <input
                type="text"
                value={editFormData.carrier_name_cn || ''}
                onChange={(e) => {
                  setEditFormData((prev) => ({
                    ...prev!,
                    carrier_key: '',
                    carrier_name_cn: e.target.value,
                  }));
                }}
                placeholder="请输入承运商名称..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  setIsCarrierOpen(true);
                  setSearchInputValue(editFormData.carrier_name_cn || '');
                  setCarrierSearch(editFormData.carrier_name_cn || '');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Search size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">运输方式</label>
            <select
              value={editFormData.shipping_method || ''}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev!, shipping_method: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择运输方式</option>
              {SHIPPING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">物流凭证（运单）</label>
            <ImageUpload
              value={editFormData.tracking_image || ''}
              onChange={(url) => {
                const imageUrl = Array.isArray(url) ? url[0] : url;
                setEditFormData((prev) => ({ ...prev!, tracking_image: imageUrl }));
              }}
              maxCount={1}
              billMode={true}
              showUploadButtons={true}
              className="inline-block"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEditing}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              取消编辑
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Save size={14} />
              保存
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={record.id}
        className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100 group hover:bg-gray-100 transition-colors"
      >
        <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-medium">
          #
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-800">
              {carrierDisplayName || record.carrier_key}
            </span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm text-gray-600 font-mono">{record.tracking_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-0.5">
            {record.shipping_method && (
              <span className="text-xs text-gray-500">
                运输方式: {record.shipping_method}
              </span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(record.created_at)}
            </span>
          </div>
          {record.tracking_image && (
            <div className="mt-1">
              <img
                src={record.tracking_image}
                alt="物流凭证"
                className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(record.tracking_image, '_blank')}
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
          )}
        </div>
        {mode === 'management' && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => startEditing(record)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="编辑"
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => deleteRecord(record.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!mounted || !isOpen) return null;

  const isManagementMode = mode === 'management';
  const hasExistingRecords = records && records.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package size={20} className="text-indigo-600" />
            {isManagementMode ? '发货管理' : '确认发货'}
            {hasExistingRecords && (
              <span className="text-xs text-gray-400 font-normal">
                ({records.length} 条记录)
              </span>
            )}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {hasExistingRecords && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-700">
                  📦 发货记录 ({records.length})
                </span>
                {showHistory ? (
                  <ChevronUp size={16} className="text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-400" />
                )}
              </button>
              {showHistory && (
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {records.map(renderRecord)}
                </div>
              )}
            </div>
          )}

          <div className={hasExistingRecords ? 'border-t border-gray-200 pt-4 mt-2' : ''}>
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
              <Plus size={16} className="text-indigo-600" />
              {isManagementMode ? '新增发货记录' : '填写发货信息'}
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">运输方式</label>
              <select
                value={formData.shippingMethod}
                onChange={(e) => {
                  const newMethod = e.target.value;
                  setFormData((prev) => ({ ...prev, shippingMethod: newMethod }));
                  setFormData((prev) => ({ ...prev, carrierKey: '', carrierName: '' }));
                  setCarrierSearch('');
                  setSearchInputValue('');
                  setIsCustomInput(false);
                  setCustomCarrierName('');
                  setCarriersPage(0);
                  setCarriers([]);
                  setCarriersHasMore(true);
                  loadCarriers(0, true, '');
                }}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SHIPPING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                物流单号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.trackingNumber}
                onChange={(e) => handleTrackingNumberChange(e.target.value)}
                placeholder="请输入物流单号..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                物流承运商 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {isCustomInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customCarrierName}
                      onChange={(e) => handleCustomInputChange(e.target.value)}
                      placeholder="输入承运商名称..."
                      className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomInput(false);
                        setCustomCarrierName('');
                        if (!formData.carrierKey) {
                          setFormData((prev) => ({ ...prev, carrierName: '' }));
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    ref={carrierButtonRef}
                    type="button"
                    onClick={handleOpenCarrierDropdown}
                    className="w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span
                      className={
                        formData.carrierKey || formData.carrierName
                          ? 'text-gray-700 truncate'
                          : 'text-gray-400'
                      }
                    >
                      {getCurrentCarrierDisplayName()}
                    </span>
                    <Search size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                物流凭证（运单）
              </label>
              <ImageUpload
                value={formData.trackingImage}
                onChange={(url) => {
                  const imageUrl = Array.isArray(url) ? url[0] : url;
                  setFormData((prev) => ({ ...prev, trackingImage: imageUrl }));
                }}
                maxCount={1}
                billMode={true}
                showUploadButtons={true}
                className="inline-block"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
            {isManagementMode ? (
              <>
                <button
                  type="button"
                  onClick={addNewRecord}
                  disabled={
                    !formData.trackingNumber.trim() ||
                    (!formData.carrierKey && !formData.carrierName.trim())
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  新增记录
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.trackingNumber.trim() ||
                    (!formData.carrierKey && !formData.carrierName.trim())
                  }
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  确认发货
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {isCarrierOpen &&
        !isCustomInput &&
        createPortal(
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width || 280,
              minWidth: 200,
              maxWidth: 400,
              zIndex: 99999,
            }}
          >
            <div className="fixed inset-0 z-0" onClick={() => setIsCarrierOpen(false)} />
            <div className="relative z-10">
              <div className="sticky top-0 bg-white z-10 p-2 border-b border-gray-100">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchInputValue}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="搜索承运商..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchInputValue && (
                    <button
                      type="button"
                      onClick={() => handleSearchChange('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div
                ref={carrierListRef}
                className="max-h-48 overflow-y-auto"
                onScroll={handleCarrierScroll}
              >
                {carriersLoading && carriers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-gray-400 text-sm">
                    <Loader2 size={16} className="animate-spin inline mr-2" />
                    搜索中...
                  </div>
                ) : filteredCarriers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-gray-400 text-sm">
                    {searchInputValue ? (
                      <>
                        未找到 "{searchInputValue}" 的承运商
                        <button
                          type="button"
                          onClick={switchToCustomInput}
                          className="block mx-auto mt-2 text-blue-600 hover:underline text-sm"
                        >
                          点击输入其他承运商
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <p className="text-gray-400">暂无承运商</p>
                        <button
                          type="button"
                          onClick={switchToCustomInput}
                          className="mt-2 text-blue-600 hover:underline text-sm"
                        >
                          点击输入其他承运商
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {filteredCarriers.map((carrier) => {
                      const isSelected = editingId
                        ? editFormData?.carrier_key === carrier.key
                        : formData.carrierKey === carrier.key;
                      return (
                        <div
                          key={carrier.id}
                          onClick={() => {
                            if (editingId) {
                              selectEditCarrier(carrier);
                            } else {
                              selectCarrier(carrier);
                            }
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                            isSelected ? 'bg-blue-50 text-blue-600' : ''
                          }`}
                        >
                          {carrier.logo && (
                            <img
                              src={carrier.logo}
                              alt={carrier.name_cn}
                              className="w-6 h-6 object-contain flex-shrink-0"
                              onError={(e) =>
                                ((e.target as HTMLImageElement).style.display = 'none')
                              }
                            />
                          )}
                          <span className="truncate">{carrier.name_cn}</span>
                        </div>
                      );
                    })}
                    {carriersLoading && carriers.length > 0 && (
                      <div className="px-3 py-2 text-center text-gray-400 text-sm">
                        <Loader2 size={14} className="animate-spin inline mr-1" />
                        加载更多...
                      </div>
                    )}
                    {!carriersLoading && carriersHasMore && (
                      <div className="px-3 py-2 text-center text-gray-400 text-sm">
                        滚动加载更多...
                      </div>
                    )}
                    <div className="border-t border-gray-100">
                      <button
                        type="button"
                        onClick={switchToCustomInput}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg w-full justify-center"
                      >
                        <Plus size={16} />
                        <span>输入其他承运商</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
}