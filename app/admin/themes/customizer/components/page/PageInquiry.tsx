// app/admin/themes/customizer/components/page/PageInquiry.tsx
'use client';

import { ThemeData } from '../../types';
import { VARIABLE_LABELS } from '../../config/variables';
import {
  getPageVariableGroups,
  getPageVariableConfig,
  PAGE_GROUP_LABELS,
  getGlobalGroupName,
} from '../../config/page-variables.config';
import { COLOR_GROUPS } from '../../config/global-groups.config';
import InheritedColorPicker from '../shared/InheritedColorPicker';

interface PageInquiryProps {
  theme: ThemeData;
  globalTheme?: ThemeData;
  onUpdate: (category: keyof ThemeData, key: string, value: string) => void;
  onDarkModeUpdate: (value: string) => void;
}

export default function PageInquiry({ theme, globalTheme, onUpdate }: PageInquiryProps) {
  const { colors } = theme;
  const globalColors = globalTheme?.colors || {};

  // 判断变量是否被覆盖（页面有值且与全局同名键不同）
  const isOverridden = (key: string) => {
    if (!globalTheme) return false;
    return colors[key] !== undefined && colors[key] !== globalTheme.colors?.[key];
  };

  // ✅ 判断变量是否可继承（该变量在全局主题中注册）
  const isGlobalInheritable = (key: string): boolean => {
    return COLOR_GROUPS.some((group) => group.keys.includes(key));
  };

  // ✅ 获取全局有效值（允许空字符串）
  const getEffectiveGlobalValue = (key: string): string => {
    // 先从全局取同名键
    if (globalColors[key] !== undefined) {
      return globalColors[key];
    }

    // 若有 fallback 键，取 fallback 的值
    const config = getPageVariableConfig('inquiry', key);
    if (config?.fallback && globalColors[config.fallback] !== undefined) {
      return globalColors[config.fallback];
    }

    return '';
  };

  // 获取询盘页的分组配置
  const groups = getPageVariableGroups('inquiry');
  const groupKeys = Object.keys(groups);

  // 如果没有任何分组，显示提示
  if (groupKeys.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        询盘页暂无可配置的变量
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groupKeys.map((groupId) => {
        const variableKeys = groups[groupId];
        const groupLabel = PAGE_GROUP_LABELS[groupId] || groupId;

        // ✅ 计算继承来源（全局分组名称）
        const globalGroupName = getGlobalGroupName(groupId, COLOR_GROUPS);
        const hint = globalGroupName
          ? `继承全局值：${globalGroupName}，点击"页面"色块覆盖`
          : '点击"页面"色块自定义颜色';

        return (
          <SectionCard key={groupId} title={groupLabel} hint={hint}>
            {variableKeys.map((key) => {
              const config = getPageVariableConfig('inquiry', key);
              const label = config?.label || VARIABLE_LABELS[key] || key;
              const globalValue = getEffectiveGlobalValue(key);
              const currentValue = colors[key] || '';

              return (
                <InheritedColorPicker
                  key={key}
                  label={label}
                  globalValue={globalValue}
                  currentValue={currentValue}
                  isInheritable={isGlobalInheritable(key)}
                  onOverride={(val) => onUpdate('colors', key, val)}
                  onReset={() => onUpdate('colors', key, '')}
                />
              );
            })}
          </SectionCard>
        );
      })}
    </div>
  );
}

function SectionCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-sm font-semibold mb-1 text-gray-700">{title}</h3>
      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}