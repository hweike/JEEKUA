// app/admin/products/categories/hooks/useCategories.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ProductLine {
  id: string;
  name: string;
  order?: number;
  templateId?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface Category {
  id: string;
  productLineId: string;
  [key: string]: any;
}

export interface AttributeTemplate {
  id: string;
  name: string;
  attributes: { key: string; value: string }[];
}

// 内存缓存
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export function useCategories(locale: string) {
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributeTemplates, setAttributeTemplates] = useState<AttributeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherLocaleHasLines, setOtherLocaleHasLines] = useState(false);
  const [loadingOtherStatus, setLoadingOtherStatus] = useState(false);

  const loadController = useRef<AbortController | null>(null);
  const saveController = useRef<AbortController | null>(null);
  const versionRef = useRef(0);

  // 用于保存函数的最新状态（避免闭包陈旧）
  const latestLocaleRef = useRef(locale);
  const latestAttrTemplatesRef = useRef(attributeTemplates);
  const latestOtherHasRef = useRef(otherLocaleHasLines);

  useEffect(() => {
    latestLocaleRef.current = locale;
    latestAttrTemplatesRef.current = attributeTemplates;
    latestOtherHasRef.current = otherLocaleHasLines;
  }, [locale, attributeTemplates, otherLocaleHasLines]);

  // ---------- 防抖保存函数 ----------
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveData = useCallback((lines: ProductLine[], cats: Category[]) => {
    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    return new Promise<void>((resolve, reject) => {
      saveTimerRef.current = setTimeout(async () => {
        const currentLocale = latestLocaleRef.current;
        const currentAttrTemplates = latestAttrTemplatesRef.current;
        const currentOtherHas = latestOtherHasRef.current;

        // 取消进行中的保存请求
        saveController.current?.abort();
        const controller = new AbortController();
        saveController.current = controller;
        const currentVersion = ++versionRef.current;
        setSaving(true);
        setError(null);

        try {
          const res = await fetch(`/api/admin/products/categories?locale=${currentLocale}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productLines: lines, categories: cats }),
            signal: controller.signal,
          });

          if (!res.ok) {
            let errMsg = '保存失败，请重试';
            try {
              const errData = await res.json();
              if (errData.error) errMsg = errData.error;
            } catch {}
            throw new Error(errMsg);
          }

          // 更新缓存
          const cacheKey = `categories_${currentLocale}`;
          cache.set(cacheKey, {
            data: {
              productLines: lines,
              categories: cats,
              attributeTemplates: currentAttrTemplates,
              otherLocaleHasLines: currentOtherHas,
            },
            timestamp: Date.now(),
          });

          resolve();
        } catch (err: any) {
          if (err.name === 'AbortError') {
            // 请求被取消，不 reject，避免外部捕获
            return;
          }
          setError(err.message || '保存失败');
          reject(err);
        } finally {
          setSaving(false);
          if (saveController.current === controller) {
            saveController.current = null;
          }
        }
      }, 500);
    });
  }, []); // 空依赖保证引用稳定

  // ---------- 加载数据 ----------
  const loadData = useCallback(async (ignoreCache = false) => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const signal = controller.signal;

    const currentVersion = ++versionRef.current;
    setLoading(true);
    setError(null);
    setLoadingOtherStatus(true);

    const cacheKey = `categories_${locale}`;

    if (!ignoreCache && cache.has(cacheKey) && Date.now() - cache.get(cacheKey)!.timestamp < CACHE_TTL) {
      const cached = cache.get(cacheKey)!.data;
      setProductLines(cached.productLines || []);
      setCategories(cached.categories || []);
      setAttributeTemplates(cached.attributeTemplates || []);
      setOtherLocaleHasLines(cached.otherLocaleHasLines || false);
      setLoading(false);
      setLoadingOtherStatus(false);
      return;
    }

    try {
      const targetLocale = locale === 'en' ? 'zh' : 'en';
      const [categoriesRes, settingsRes, otherRes] = await Promise.all([
        fetch(`/api/admin/products/categories?locale=${locale}`, { signal }),
        fetch(`/api/admin/products/settings?locale=${locale}`, { signal }),
        fetch(`/api/admin/products/categories?locale=${targetLocale}`, { signal }),
      ]);

      if (!categoriesRes.ok) {
        let errMsg = '加载失败，请稍后重试';
        try {
          const errData = await categoriesRes.json();
          if (errData.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }
      const categoriesData = await categoriesRes.json();

      let templates: AttributeTemplate[] = [];
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        templates = settingsData.attributeTemplates || [];
      } else {
        console.warn('Failed to load attribute templates');
      }

      let hasOther = false;
      if (otherRes.ok) {
        const otherData = await otherRes.json();
        hasOther = (otherData.productLines || []).length > 0;
      }

      if (currentVersion !== versionRef.current) return;

      const lines = categoriesData.productLines || [];
      const cats = categoriesData.categories || [];

      setProductLines(lines);
      setCategories(cats);
      setAttributeTemplates(templates);
      setOtherLocaleHasLines(hasOther);
      setLoadingOtherStatus(false);

      cache.set(cacheKey, {
        data: {
          productLines: lines,
          categories: cats,
          attributeTemplates: templates,
          otherLocaleHasLines: hasOther,
        },
        timestamp: Date.now(),
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || '加载数据失败');
    } finally {
      if (currentVersion === versionRef.current) {
        setLoading(false);
        setLoadingOtherStatus(false);
      }
      if (loadController.current === controller) loadController.current = null;
    }
  }, [locale]);

  // ---------- 强制刷新 ----------
  const refresh = useCallback(() => {
    const cacheKey = `categories_${locale}`;
    cache.delete(cacheKey);
    loadData(true);
  }, [locale, loadData]);

  // ---------- 首次加载和清理 ----------
  useEffect(() => {
    loadData();
    return () => {
      loadController.current?.abort();
      saveController.current?.abort();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [loadData]);

  return {
    productLines,
    categories,
    setCategories,
    setProductLines,
    attributeTemplates,
    loading,
    saving,
    error,
    otherLocaleHasLines,
    loadingOtherStatus,
    saveData,       // 返回 Promise 的保存函数
    refresh,
    loadData,
    setError,
  };
}