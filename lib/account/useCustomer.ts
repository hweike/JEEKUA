'use client';
import { useState, useEffect } from 'react';

export function useCustomer() {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetch('/api/account/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        console.log('[useCustomer] 数据:', data);
        if (data && data.id) setCustomer(data);
        else localStorage.removeItem('token');
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setIsLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setCustomer(null);
  };

  return { customer, isLoading, logout };
}