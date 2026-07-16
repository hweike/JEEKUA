// app/admin/discovery/seo/strategies/components/FieldConfigCard.tsx

'use client';

import type { FieldConfig, FieldKey } from '../types';

interface FieldConfigCardProps {
  fieldKey: FieldKey;
  label: string;
  description: string;
  config: FieldConfig;
  isKeyword?: boolean;
  onChange: (updates: Partial<FieldConfig>) => void;
}

export function FieldConfigCard({
  fieldKey,
  label,
  description,
  config,
  isKeyword = false,
  onChange,
}: FieldConfigCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-800">{label}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            启用
          </label>
          {!isKeyword && (
            <label className="inline-flex items-center gap-1 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={config.required || false}
                onChange={(e) => onChange({ required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              必填
            </label>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {!isKeyword ? (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最小长度</label>
                <input
                  type="number"
                  value={config.minLength || 0}
                  onChange={(e) =>
                    onChange({ minLength: parseInt(e.target.value) || undefined })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最大长度</label>
                <input
                  type="number"
                  value={config.maxLength || 0}
                  onChange={(e) =>
                    onChange({ maxLength: parseInt(e.target.value) || undefined })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最少关键词数</label>
                <input
                  type="number"
                  value={config.minCount || 0}
                  onChange={(e) =>
                    onChange({ minCount: parseInt(e.target.value) || undefined })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">最多关键词数</label>
                <input
                  type="number"
                  value={config.maxCount || 0}
                  onChange={(e) =>
                    onChange({ maxCount: parseInt(e.target.value) || undefined })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Prompt 模板</label>
          <textarea
            value={config.promptTemplate}
            onChange={(e) => onChange({ promptTemplate: e.target.value })}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="输入 AI 提示词模板，可使用变量如 {page_title}, {brand_name} 等"
          />
          <p className="text-xs text-gray-500 mt-1">
            可用变量：{' '}
            <code className="bg-gray-100 px-1 rounded">
              {'{page_title}'}, {'{brand_name}'}, {'{site_name}'}, {'{analyzed_keywords}'},
              {'{analyzed_summary}'}, {'{target_language}'}, {'{minLength}'}, {'{maxLength}'}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}