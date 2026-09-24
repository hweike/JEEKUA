// app/admin/payment/orders/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Toast from '@/components/Toast';
import OrderCard from './components/OrderCard';
import OrderSearchBar from './components/OrderSearchBar';
import ConfirmPaymentModal from './components/ConfirmPaymentModal';
import ConfirmShippingModal from './components/ConfirmShippingModal';
import { VIEW_STATUS_FILTERS } from '@/lib/payment/constants';
import type { Order, ShippingRecord } from '@/lib/payment/types/order';

// ✅ 站点配置
const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ✅ 用户类型
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ 当前用户类型
interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

// ✅ 扩展 Order 类型，添加 items（用于订单列表展示）
interface OrderWithItems extends Order {
  items?: Array<{
    id: string;
    product_name: string;
    specification: string;
    price: number;
    quantity: number;
    unit: string;
    total: number;
    product_image?: string;
    product_id?: string;
  }>;
}

// ============================================================
// ✅ 缓存配置
// ============================================================
const USERS_CACHE_KEY = 'orders_users_map_v1';
const USERS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

const SLUG_CACHE_KEY = 'orders_slug_map_v1';
const SLUG_CACHE_TTL = 10 * 60 * 1000; // 10分钟

// ✅ 内存缓存（同一页面会话，快速读取）
let cachedUsers: Record<string, User> | null = null;
let cachedUsersTimestamp = 0;

const slugCache = new Map<string, { slug: string; timestamp: number }>();

// ✅ 从 sessionStorage 恢复 slug 缓存（刷新页面不丢）
function hydrateSlugCacheFromSession() {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(SLUG_CACHE_KEY);
    if (!raw) return;
    const parsed: Record<string, { slug: string; timestamp: number }> = JSON.parse(raw);
    const now = Date.now();
    for (const [id, entry] of Object.entries(parsed)) {
      if (entry && now - entry.timestamp < SLUG_CACHE_TTL) {
        slugCache.set(id, entry);
      }
    }
  } catch {
    // ignore
  }
}

// ✅ 持久化 slug 缓存到 sessionStorage
function persistSlugCacheToSession() {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, { slug: string; timestamp: number }> = {};
    slugCache.forEach((v, k) => {
      obj[k] = v;
    });
    sessionStorage.setItem(SLUG_CACHE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

/**
 * 批量获取产品 slug（带内存 + sessionStorage 缓存，通过后端 API 查询）
 */
async function getProductSlugs(productIds: string[]): Promise<Record<string, string>> {
  if (!productIds || productIds.length === 0) return {};

  const uniqueIds = [...new Set(productIds)];
  const result: Record<string, string> = {};
  const uncachedIds: string[] = [];
  const now = Date.now();

  // 1. 从内存缓存读取
  for (const id of uniqueIds) {
    const cached = slugCache.get(id);
    if (cached && now - cached.timestamp < SLUG_CACHE_TTL) {
      result[id] = cached.slug;
    } else {
      uncachedIds.push(id);
    }
  }

  // 2. 通过后端 API 查询未缓存的数据
  if (uncachedIds.length > 0) {
    try {
      const res = await fetch(`/api/admin/products/slugs?ids=${uncachedIds.join(',')}`);
      if (res.ok) {
        const data = await res.json();
        const pages: Array<{ id: string; slug: string }> = data.pages || [];
        for (const item of pages) {
          if (item.id) {
            const slug = item.slug || '';
            result[item.id] = slug;
            slugCache.set(item.id, { slug, timestamp: now });
          }
        }
        // ✅ 持久化到 sessionStorage
        persistSlugCacheToSession();
      } else {
        console.warn('[getProductSlugs] 请求失败:', res.status);
      }
    } catch (error) {
      console.error('[getProductSlugs] 异常:', error);
    }
  }

  return result;
}

/**
 * 清除产品 slug 缓存（同时清内存 + sessionStorage）
 */
function clearProductSlugCache(productId?: string) {
  if (productId) {
    slugCache.delete(productId);
  } else {
    slugCache.clear();
  }
  persistSlugCacheToSession();
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string>(DEFAULT_SITE_ID);

  // ✅ 用户映射
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});

  // ✅ 产品 slug 映射
  const [productSlugMap, setProductSlugMap] = useState<Record<string, string>>({});

  // ✅ 当前语言
  const [locale, setLocale] = useState('en');

  // ✅ 当前用户（用于复制/再来一单）
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // ============================================================
  // ✅ 防竞态：请求 ID + AbortController
  // ============================================================
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const isFirstLoad = useRef(true);
  const isUsersLoaded = useRef(false);
  const slugLoadingRef = useRef<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 弹窗状态
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // ✅ 新增：发货弹窗模式状态
  const [shippingModalMode, setShippingModalMode] = useState<'confirm' | 'management'>('confirm');

  // ✅ Toast 自动消失
  useEffect(() => {
    if (toast) {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => {
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
      };
    }
  }, [toast]);

  // ✅ 从 sessionStorage 恢复 slug 缓存
  useEffect(() => {
    hydrateSlugCacheFromSession();
  }, []);

  // ✅ 在客户端获取 siteId 和 locale
  useEffect(() => {
    try {
      const siteIdFromCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('site_id='))
        ?.split('=')[1];

      if (siteIdFromCookie) {
        setSiteId(siteIdFromCookie);
      }

      const savedLocale =
        localStorage.getItem('locale') ||
        document.cookie.split('; ').find((row) => row.startsWith('locale='))?.split('=')[1] ||
        'en';
      setLocale(savedLocale);
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  }, []);

  // ✅ 加载当前用户信息（用于复制/再来一单）
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser({
            id: data.id,
            name: data.name || data.email || data.id,
            email: data.email || '',
          });
        }
      } catch (error) {
        console.error('获取当前用户失败:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // ============================================================
  // ✅ 加载用户列表（内存 + sessionStorage 双缓存）
  // ============================================================
  useEffect(() => {
    if (isUsersLoaded.current) return;

    const loadUsers = async () => {
      const now = Date.now();

      // 1. 内存缓存
      if (cachedUsers && now - cachedUsersTimestamp < USERS_CACHE_TTL) {
        setUsersMap(cachedUsers);
        isUsersLoaded.current = true;
        return;
      }

      // 2. sessionStorage 缓存
      if (typeof window !== 'undefined') {
        try {
          const raw = sessionStorage.getItem(USERS_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { map: Record<string, User>; ts: number };
            if (parsed?.map && now - parsed.ts < USERS_CACHE_TTL) {
              cachedUsers = parsed.map;
              cachedUsersTimestamp = parsed.ts;
              setUsersMap(parsed.map);
              isUsersLoaded.current = true;
              return;
            }
          }
        } catch {
          // ignore
        }
      }

      // 3. 从 API 拉取
      try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, User> = {};
          const userList = (data?.users ??
            data?.data ??
            data ??
            []) as Array<{ id: string; name?: string; email?: string }>;
          if (Array.isArray(userList)) {
            userList.forEach((user) => {
              if (user?.id) {
                map[user.id] = {
                  id: user.id,
                  name: user.name || user.email || user.id,
                  email: user.email || '',
                };
              }
            });
          }
          cachedUsers = map;
          cachedUsersTimestamp = now;
          setUsersMap(map);
          isUsersLoaded.current = true;

          // 写入 sessionStorage
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(
                USERS_CACHE_KEY,
                JSON.stringify({ map, ts: now })
              );
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error('加载用户列表失败:', error);
      }
    };

    loadUsers();
  }, []);

  // ============================================================
  // ✅ 加载订单列表（修复竞态：AbortController + 请求 ID）
  // ============================================================
  const loadOrders = useCallback(async () => {
    // ✅ 取消上一次未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    // ✅ 记录当前请求 ID
    const myRequestId = ++requestIdRef.current;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        site_id: siteId,
        status: statusFilter,
        keyword,
        country: countryFilter,
        created_by: createdByFilter,
        page: String(pagination.page),
        page_size: '20',
      });

      const res = await fetch(`/api/admin/payment/orders?${params}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      // ✅ 如果期间又发起了新请求，丢弃本次结果
      if (myRequestId !== requestIdRef.current) {
        return;
      }

      if (data.success) {
        const ordersWithItems = data.data.items
          .map((order: any) => ({
            ...order,
            items: order.items || order.order_items || [],
          }))
          .filter((order: any) => order && order.id);

        setOrders(ordersWithItems);
        setPagination({
          page: data.data.page,
          total: data.data.total,
          total_pages: data.data.total_pages,
        });

        // ✅ 提取所有 product_id
        const productIds: string[] = [];
        const seenIds = new Set<string>();

        ordersWithItems.forEach((order: any) => {
          (order.items || []).forEach((item: any) => {
            const productId = item.product_id as string | undefined;
            if (productId && !seenIds.has(productId)) {
              productIds.push(productId);
              seenIds.add(productId);
            }
          });
        });

        // ✅ 加载产品 slug
        if (productIds.length > 0) {
          const cachedSlugs: Record<string, string> = {};
          const needFetchIds: string[] = [];
          const now = Date.now();

          productIds.forEach((id) => {
            const cached = slugCache.get(id);
            if (cached && now - cached.timestamp < SLUG_CACHE_TTL) {
              cachedSlugs[id] = cached.slug;
            } else {
              needFetchIds.push(id);
            }
          });

          if (Object.keys(cachedSlugs).length > 0) {
            setProductSlugMap((prev) => ({ ...prev, ...cachedSlugs }));
          }

          if (needFetchIds.length > 0) {
            const idsToLoad = needFetchIds.filter((id) => !slugLoadingRef.current.has(id));

            if (idsToLoad.length > 0) {
              idsToLoad.forEach((id) => slugLoadingRef.current.add(id));

              const loadSlugs = () => {
                getProductSlugs(idsToLoad)
                  .then((newSlugs) => {
                    idsToLoad.forEach((id) => slugLoadingRef.current.delete(id));
                    setProductSlugMap((prev) => ({ ...prev, ...newSlugs }));
                  })
                  .catch((err) => {
                    console.warn('加载产品slug失败:', err);
                    idsToLoad.forEach((id) => slugLoadingRef.current.delete(id));
                  });
              };

              if (typeof window !== 'undefined' && 'queueMicrotask' in window) {
                queueMicrotask(loadSlugs);
              } else {
                setTimeout(loadSlugs, 50);
              }
            }
          }
        }
      }
    } catch (error: any) {
      // ✅ AbortError 是主动取消，不算错误
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('加载订单失败:', error);
      // ✅ 只有当前请求才弹错误
      if (myRequestId === requestIdRef.current) {
        setToast({ message: '加载失败', type: 'error' });
      }
    } finally {
      // ✅ 只有当前请求才结束 loading
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [siteId, statusFilter, keyword, countryFilter, createdByFilter, pagination.page]);

  // ============================================================
  // ✅ 筛选条件变化 → 重置到第1页
  // ============================================================
  useEffect(() => {
    if (!isFirstLoad.current) {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [statusFilter, keyword, countryFilter, createdByFilter]);

  // ============================================================
  // ✅ 分页变化 → 重新加载
  // ============================================================
  useEffect(() => {
    if (!isFirstLoad.current) {
      loadOrders();
    }
  }, [pagination.page, loadOrders]);

  // ✅ 初始加载
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      loadOrders();
    }
  }, [loadOrders]);

  // ✅ 页面卸载时取消未完成请求
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  // ============================================================
  // ✅ 搜索处理（带防抖）
  // ============================================================
  const handleSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setKeyword(searchInput);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchInput('');
    setKeyword('');
    setCountryFilter('');
    setCreatedByFilter('');
    setStatusFilter('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // ============================================================
  // ✅ 安全复制到剪贴板（带降级方案，静默处理错误）
  // ============================================================
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      // ✅ 先聚焦文档（修复 NotAllowedError）
      if (typeof window !== 'undefined' && document.hasFocus && !document.hasFocus()) {
        window.focus();
        await new Promise((r) => setTimeout(r, 50));
      }

      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[copyToClipboard] Clipboard API 失败，使用降级方案:', err);

      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);

        textarea.focus();
        textarea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (success) {
          return true;
        }
      } catch (fallbackErr) {
        console.warn('[copyToClipboard] 降级方案也失败:', fallbackErr);
      }

      return false;
    }
  }, []);

  // ============================================================
  // ✅ 复制订单号/合同号到剪贴板（使用安全方法）
  // ============================================================
  const copyOrderInfo = useCallback(
    async (orderNo: string, contractNo?: string) => {
      const text = contractNo ? `${orderNo} (${contractNo})` : orderNo;
      const success = await copyToClipboard(text);
      if (success) {
        setToast({ message: '已复制: ' + text, type: 'success' });
      }
    },
    [copyToClipboard]
  );

  // ============================================================
  // ✅ 获取订单详情
  // ============================================================
  const getOrderById = useCallback(
    (id: string) => {
      return orders.find((o) => o.id === id) || null;
    },
    [orders]
  );

  // ============================================================
  // ✅ 确认收款 - 弹窗
  // ============================================================
  const openPaymentModal = useCallback(
    (orderId: string) => {
      const order = getOrderById(orderId);
      if (order) {
        setSelectedOrderId(orderId);
        setSelectedOrder(order);
        setPaymentModalOpen(true);
      }
      setActionLoading(null);
    },
    [getOrderById]
  );

  const handleConfirmPayment = useCallback(
    async (data: { depositAmount: number; depositPercent: number }) => {
      if (!selectedOrderId) return;

      setModalLoading(true);
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${selectedOrderId}/actions?action=confirm_payment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              depositAmount: data.depositAmount,
              depositPercent: data.depositPercent,
            }),
          }
        );
        const result = await res.json();

        if (result.success) {
          const isFirstPayment = (selectedOrder?.deposit_amount || 0) === 0;
          setToast({
            message: isFirstPayment
              ? '✅ 已确认收款，订单状态更新为"已付款"'
              : '✅ 收款成功，已累加付款金额',
            type: 'success',
          });
          setPaymentModalOpen(false);
          loadOrders();
        } else {
          setToast({ message: result.error || '操作失败', type: 'error' });
        }
      } catch (error) {
        setToast({ message: '操作失败', type: 'error' });
      } finally {
        setModalLoading(false);
      }
    },
    [selectedOrderId, selectedOrder?.deposit_amount, loadOrders]
  );

  // ============================================================
  // ✅ 确认发货 - 弹窗（支持两种模式）
  // ============================================================
  const openShippingModal = useCallback(
    (orderId: string, mode: 'confirm' | 'management' = 'confirm') => {
      const order = getOrderById(orderId);
      if (order) {
        setSelectedOrderId(orderId);
        setSelectedOrder(order);
        setShippingModalMode(mode);
        setShippingModalOpen(true);
      }
      setActionLoading(null);
    },
    [getOrderById]
  );

  // ============================================================
  // ✅ 确认发货（paid → completed）
  // ============================================================
  const handleConfirmShipping = useCallback(
    async (data: {
      shippingMethod: string;
      trackingNumber: string;
      carrierKey: string;
      carrierName: string;
      trackingImage: string;
    }) => {
      if (!selectedOrderId) return;

      setModalLoading(true);
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${selectedOrderId}/actions?action=confirm_shipping`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shippingMethod: data.shippingMethod,
              trackingNumber: data.trackingNumber,
              carrierKey: data.carrierKey,
              carrierName: data.carrierName,
              trackingImage: data.trackingImage,
            }),
          }
        );
        const result = await res.json();

        if (result.success) {
          setToast({ message: '✅ 已确认发货，订单状态更新为"已完成"', type: 'success' });
          setShippingModalOpen(false);
          loadOrders();
        } else {
          setToast({ message: result.error || '操作失败', type: 'error' });
        }
      } catch (error) {
        setToast({ message: '操作失败', type: 'error' });
      } finally {
        setModalLoading(false);
      }
    },
    [selectedOrderId, loadOrders]
  );

  // ============================================================
  // ✅ 保存发货记录（用于管理模式 - 已完成订单编辑发货信息）
  // ============================================================
  const handleSaveShippingRecords = useCallback(
    async (records: ShippingRecord[]) => {
      if (!selectedOrderId) return;

      setModalLoading(true);
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${selectedOrderId}/shipping-records`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipping_records: records }),
          }
        );
        const result = await res.json();

        if (result.success) {
          setToast({ message: '✅ 发货信息已更新', type: 'success' });
          loadOrders();
        } else {
          setToast({ message: result.error || '保存失败', type: 'error' });
        }
      } catch (error) {
        console.error('保存发货记录失败:', error);
        setToast({ message: '保存失败，请重试', type: 'error' });
      } finally {
        setModalLoading(false);
      }
    },
    [selectedOrderId, loadOrders]
  );

  // ============================================================
  // ✅ 提交订单（使用安全复制方法）
  // ============================================================
  const handleSubmit = useCallback(
    async (id: string) => {
      if (!confirm('提交后订单将发送给买家，确定提交吗？')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=submit`,
          {
            method: 'POST',
          }
        );
        const data = await res.json();
        if (data.success && data.data?.shareUrl) {
          const copied = await copyToClipboard(data.data.shareUrl);
          if (copied) {
            setToast({ message: '✅ 订单已提交，分享链接已复制', type: 'success' });
          } else {
            setToast({
              message: `✅ 订单已提交。分享链接：${data.data.shareUrl}（请手动复制）`,
              type: 'success',
            });
          }
          loadOrders();
        } else {
          setToast({ message: data.error || '提交失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('提交失败:', error);
        setToast({ message: '提交失败，请重试', type: 'error' });
        throw error;
      }
    },
    [loadOrders, copyToClipboard]
  );

  // ============================================================
  // ✅ 撤回订单
  // ============================================================
  const handleRecall = useCallback(
    async (id: string) => {
      if (!confirm('确定要撤回该订单吗？撤回后订单将回到草稿状态。')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=recall`,
          {
            method: 'POST',
          }
        );
        const data = await res.json();
        if (data.success) {
          setToast({ message: '✅ 已撤回，订单回到草稿状态', type: 'success' });
          loadOrders();
        } else {
          setToast({ message: data.error || '撤回失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('撤回失败:', error);
        setToast({ message: '撤回失败，请重试', type: 'error' });
        throw error;
      }
    },
    [loadOrders]
  );

  // ============================================================
  // ✅ 取消订单
  // ============================================================
  const handleCancel = useCallback(
    async (id: string) => {
      if (!confirm('确定要取消该订单吗？')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=cancel`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: '用户取消' }),
          }
        );
        const data = await res.json();
        if (data.success) {
          setToast({ message: '✅ 取消成功', type: 'success' });
          loadOrders();
        } else {
          setToast({ message: data.error || '取消失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('取消失败:', error);
        setToast({ message: '取消失败，请重试', type: 'error' });
        throw error;
      }
    },
    [loadOrders]
  );

  // ============================================================
  // ✅ 再来一单（传递当前用户信息）
  // ============================================================
  const handleReorder = useCallback(
    async (id: string) => {
      if (!confirm('确定要复制该订单吗？将生成一份新的草稿订单。')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=reorder`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operator: currentUser?.id || currentUser?.name || 'system',
            }),
          }
        );
        const data = await res.json();
        if (data.success && data.data?.newOrderId) {
          setToast({
            message: `✅ 已创建新订单，订单号: ${data.data.orderNo || '请查看列表'}`,
            type: 'success',
          });
          setTimeout(() => {
            router.push(`/admin/payment/orders/${data.data.newOrderId}/edit`);
          }, 1500);
        } else {
          setToast({ message: data.error || '操作失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('复制失败:', error);
        setToast({ message: '操作失败，请重试', type: 'error' });
        throw error;
      }
    },
    [router, currentUser]
  );

  // ============================================================
  // ✅ 复制订单（传递当前用户信息）
  // ============================================================
  const handleDuplicate = useCallback(
    async (id: string) => {
      if (!confirm('确定要复制该订单吗？将生成一份新的草稿订单。')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=duplicate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operator: currentUser?.id || currentUser?.name || 'system',
            }),
          }
        );
        const data = await res.json();
        if (data.success && data.data?.newOrderId) {
          setToast({ message: '✅ 已复制订单', type: 'success' });
          setTimeout(() => {
            router.push(`/admin/payment/orders/${data.data.newOrderId}/edit`);
          }, 1500);
        } else {
          setToast({ message: data.error || '操作失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('复制失败:', error);
        setToast({ message: '操作失败，请重试', type: 'error' });
        throw error;
      }
    },
    [router, currentUser]
  );

  // ============================================================
  // ✅ 复制账单链接（使用安全复制方法）
  // ============================================================
  const handleCopyLink = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/admin/payment/orders/${id}/actions?action=copy_link`,
          {
            method: 'POST',
          }
        );
        const data = await res.json();
        if (data.success && data.data?.shareUrl) {
          const copied = await copyToClipboard(data.data.shareUrl);
          if (copied) {
            setToast({ message: '✅ 分享链接已复制', type: 'success' });
          } else {
            setToast({
              message: `分享链接：${data.data.shareUrl}（请手动复制）`,
              type: 'success',
            });
          }
        } else {
          setToast({ message: data.error || '获取链接失败', type: 'error' });
        }
      } catch (error) {
        setToast({ message: '获取链接失败', type: 'error' });
      }
    },
    [copyToClipboard]
  );

  // ============================================================
  // ✅ 下载 PDF
  // ============================================================
  const handleDownloadPdf = useCallback(async (id: string) => {
    try {
      window.open(`/api/admin/payment/orders/${id}/pdf`, '_blank');
      setToast({ message: '正在下载...', type: 'success' });
    } catch (error) {
      setToast({ message: '下载失败', type: 'error' });
    }
  }, []);

  // ============================================================
  // ✅ 删除订单（清理相关产品 slug 缓存）
  // ============================================================
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('确定要删除该订单吗？此操作不可恢复！')) {
        throw new Error('操作已取消');
      }
      try {
        const res = await fetch(`/api/admin/payment/orders/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          // ✅ 删除订单后清掉该订单里产品的 slug 缓存
          // （产品本身没删，清缓存只是让下次重新拉一次，防止产品 slug 变更后不一致）
          const order = orders.find((o) => o.id === id);
          if (order?.items) {
            order.items.forEach((item) => {
              if (item.product_id) {
                clearProductSlugCache(item.product_id);
              }
            });
          }
          setToast({ message: '✅ 删除成功', type: 'success' });
          loadOrders();
        } else {
          setToast({ message: data.error || '删除失败', type: 'error' });
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }
        console.error('删除失败:', error);
        setToast({ message: '删除失败，请重试', type: 'error' });
        throw error;
      }
    },
    [loadOrders, orders]
  );

  // ============================================================
  // ✅ 判断是否为网络超时错误
  // ============================================================
  const isNetworkTimeoutError = useCallback((error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('abort')
    );
  }, []);

  // ============================================================
  // ✅ 操作处理函数
  // ============================================================
  const handleAction = useCallback(
    async (action: string, orderId: string) => {
      setActionLoading(orderId);

      try {
        switch (action) {
          case 'view':
            router.push(`/admin/payment/orders/${orderId}`);
            setActionLoading(null);
            return;

          case 'edit':
            router.push(`/admin/payment/orders/${orderId}/edit`);
            setActionLoading(null);
            return;

          case 'submit':
            await handleSubmit(orderId);
            break;

          case 'confirm_payment':
            openPaymentModal(orderId);
            return;

          case 'confirm_shipping':
            openShippingModal(orderId, 'confirm');
            return;

          case 'shipping_management':
            openShippingModal(orderId, 'management');
            return;

          case 'reorder':
            await handleReorder(orderId);
            break;

          case 'duplicate':
            await handleDuplicate(orderId);
            break;

          case 'recall':
            await handleRecall(orderId);
            break;

          case 'copy_link':
            await handleCopyLink(orderId);
            break;

          case 'download_pdf':
            await handleDownloadPdf(orderId);
            break;

          case 'cancel':
            await handleCancel(orderId);
            break;

          case 'delete':
            await handleDelete(orderId);
            break;

          default:
            break;
        }
      } catch (error) {
        if (error instanceof Error && error.message === '操作已取消') {
          return;
        }

        if (isNetworkTimeoutError(error)) {
          console.warn(`操作超时 (${action}):`, error);
          setToast({
            message: '操作超时，请稍后刷新页面查看订单状态',
            type: 'error',
          });
        } else {
          console.error(`操作失败 (${action}):`, error);
          setToast({ message: '操作失败，请重试', type: 'error' });
        }
      } finally {
        if (
          !['view', 'edit', 'confirm_payment', 'confirm_shipping', 'shipping_management'].includes(
            action
          )
        ) {
          setActionLoading(null);
        }
      }
    },
    [
      router,
      openPaymentModal,
      openShippingModal,
      handleSubmit,
      handleReorder,
      handleDuplicate,
      handleRecall,
      handleCopyLink,
      handleDownloadPdf,
      handleCancel,
      handleDelete,
      isNetworkTimeoutError,
    ]
  );

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="p-4 md:p-6 pb-48">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">订单管理</h1>
          <p className="text-gray-500 text-sm mt-0.5">共 {pagination.total} 个订单</p>
        </div>
        <button
          onClick={() => router.push('/admin/payment/orders/create')}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} /> 创建订单
        </button>
      </div>

      {/* 状态标签筛选 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {VIEW_STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              setStatusFilter(s.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all whitespace-nowrap ${
              statusFilter === s.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 搜索组件 */}
      <OrderSearchBar
        keyword={searchInput}
        onKeywordChange={setSearchInput}
        country={countryFilter}
        onCountryChange={setCountryFilter}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        createdBy={createdByFilter}
        onCreatedByChange={setCreatedByFilter}
        onSearch={handleSearch}
        onClear={clearSearch}
      />

      {/* 订单列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-lg">暂无订单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={handleAction}
              onCopyOrderInfo={copyOrderInfo}
              actionLoading={actionLoading}
              usersMap={usersMap}
              productSlugMap={productSlugMap}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-between items-center mt-4 bg-white px-4 py-3 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500">
            共 {pagination.total} 条，第 {pagination.page}/{pagination.total_pages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
              }
              disabled={pagination.page === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              上一页
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.total_pages, prev.page + 1),
                }))
              }
              disabled={pagination.page === pagination.total_pages}
              className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 确认收款弹窗 */}
      <ConfirmPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        totalAmount={selectedOrder?.total_amount || 0}
        currency={selectedOrder?.currency || 'USD'}
        loading={modalLoading}
        paidAmount={selectedOrder?.deposit_amount || 0}
        orderStatus={selectedOrder?.status || 'formal'}
      />

      {/* 确认发货弹窗 */}
      <ConfirmShippingModal
        isOpen={shippingModalOpen}
        onClose={() => setShippingModalOpen(false)}
        onConfirm={handleConfirmShipping}
        onSaveRecords={handleSaveShippingRecords}
        orderShippingMethod={selectedOrder?.shipping_method || ''}
        siteId={siteId}
        loading={modalLoading}
        mode={shippingModalMode}
        orderId={selectedOrderId || ''}
        existingRecords={selectedOrder?.shipping_records || []}
        orderStatus={selectedOrder?.status || 'paid'}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}