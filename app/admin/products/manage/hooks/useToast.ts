// app/admin/products/manage/hooks/useToast.ts
import { useState, useEffect } from 'react';

export type ToastType = { message: string; type: 'success' | 'error' } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastType>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return { toast, setToast };
}