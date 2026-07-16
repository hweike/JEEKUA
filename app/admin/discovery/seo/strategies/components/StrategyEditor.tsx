// app/admin/discovery/seo/strategies/components/StrategyEditor.tsx

'use client';

import { Save, Loader2 } from 'lucide-react';
import type { Strategy } from '../types';
import { FieldConfigCard } from './FieldConfigCard';
import { FIELD_CONFIGS } from '../constants';

interface StrategyEditorProps {
  strategy: Strategy;
  saving: boolean;
  onUpdate: (updates: Partial<Strategy>) => void;
  onUpdateField: (field: keyof Strategy['fields'], updates: any) => void;
  onSave: () => void;
}

export function StrategyEditor({
  strategy,
  saving,
  onUpdate,
  onUpdateField,
  onSave,
}: StrategyEditorProps) {
  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">{strategy.label}</h2>
          <p className="text-sm text-gray-500">
            {strategy.page_type}
            {strategy.id && (
              <span className="ml-2 text-xs text-gray-400">
                ID: {strategy.id.slice(0, 8)}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '保存中...' : '保存策略'}
        </button>
      </div>

      {/* 全局上下文提示（只读） */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-600">
          ℹ️ 站点信息（品牌、名称、目标受众等）将自动从系统设置中读取，用于 AI 生成上下文。
        </p>
      </div>

      {/* 字段配置卡片 */}
      {FIELD_CONFIGS.map(({ key, label, description, isKeyword }) => (
        <FieldConfigCard
          key={key}
          fieldKey={key}
          label={label}
          description={description}
          config={strategy.fields[key]}
          isKeyword={isKeyword}
          onChange={(updates) => onUpdateField(key, updates)}
        />
      ))}

      {/* 底部提示 */}
      <div className="text-xs text-gray-400 border-t border-gray-200 pt-4">
        <p>
          Prompt 模板中的变量将在生成时被替换为实际内容。建议在模板中明确说明 SEO 规则。
        </p>
      </div>
    </div>
  );
}