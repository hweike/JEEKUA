// app/admin/products/manage/hooks/useBatchOperations.ts
import { useState, useCallback } from 'react';
import { ToastType } from './useToast';

export function useBatchOperations(
  locale: string,
  selectedIds: string[],
  refetch: () => void,
  setToast: (toast: ToastType) => void,
  setSelectedIds: (ids: Set<string>) => void
) {
  const [batchLoading, setBatchLoading] = useState(false);

  const batchOperation = useCallback(
    async (action: string, payload: any = {}) => {
      if (selectedIds.length === 0) {
        setToast({ message: '请先选择商品', type: 'error' });
        return false;
      }
      setBatchLoading(true);
      try {
        const res = await fetch('/api/admin/products/batch', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ids: selectedIds, locale, ...payload }),
        });
        const data = await res.json();
        if (res.ok) {
          setToast({ message: data.message || '操作成功', type: 'success' });
          setSelectedIds(new Set()); // 清空选中
          refetch();
          return true;
        } else {
          setToast({ message: data.error || '操作失败', type: 'error' });
          return false;
        }
      } catch (err) {
        setToast({ message: '网络错误', type: 'error' });
        return false;
      } finally {
        setBatchLoading(false);
      }
    },
    [selectedIds, locale, refetch, setToast, setSelectedIds]
  );

  return { batchLoading, batchOperation };
}