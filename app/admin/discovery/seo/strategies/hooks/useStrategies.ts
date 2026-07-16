// app/admin/discovery/seo/strategies/hooks/useStrategies.ts

import { useState, useEffect, useCallback } from 'react';
import type { Strategy, GlobalConfig } from '../types';
import { fetchStrategies, fetchStrategy, saveStrategy, fetchGlobalConfig, saveGlobalConfig } from '../services/api';
import { createDefaultStrategy } from '../constants';

export function useStrategies(initialPageType: string) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState<Strategy | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(initialPageType);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [strategiesRes, globalRes] = await Promise.all([
        fetchStrategies().catch(() => []),
        fetchGlobalConfig().catch(() => null),
      ]);
      setStrategies(strategiesRes);
      setGlobalConfig(globalRes);

      const existing = strategiesRes.find((s) => s.page_type === selectedType);
      if (existing) {
        setCurrentStrategy(existing);
      } else {
        const label = strategiesRes.find((s) => s.page_type === selectedType)?.label || selectedType;
        setCurrentStrategy(createDefaultStrategy(selectedType, label));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectType = (type: string) => {
    setSelectedType(type);
  };

  const updateStrategy = (updates: Partial<Strategy>) => {
    if (!currentStrategy) return;
    setCurrentStrategy({ ...currentStrategy, ...updates });
  };

  const updateField = (field: keyof Strategy['fields'], updates: Partial<Strategy['fields'][typeof field]>) => {
    if (!currentStrategy) return;
    setCurrentStrategy({
      ...currentStrategy,
      fields: {
        ...currentStrategy.fields,
        [field]: {
          ...currentStrategy.fields[field],
          ...updates,
        },
      },
    });
  };

  const saveCurrentStrategy = async () => {
    if (!currentStrategy) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveStrategy(currentStrategy);
      setCurrentStrategy(saved);
      setStrategies((prev) => {
        const idx = prev.findIndex((s) => s.page_type === saved.page_type);
        if (idx >= 0) {
          const newList = [...prev];
          newList[idx] = saved;
          return newList;
        }
        return [...prev, saved];
      });
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveGlobal = async (config: GlobalConfig) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveGlobalConfig(config);
      setGlobalConfig(saved);
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存全局配置失败');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    strategies,
    currentStrategy,
    globalConfig,
    loading,
    saving,
    error,
    selectedType,
    selectType,
    updateStrategy,
    updateField,
    saveCurrentStrategy,
    saveGlobal,
    reload: loadData,
  };
}