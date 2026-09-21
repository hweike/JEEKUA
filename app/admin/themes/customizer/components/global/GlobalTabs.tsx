'use client';

import { useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { USED_VARIABLES, VARIABLE_LABELS, VARIABLE_COMPONENT_MAP } from '../../config/variables';
import { COLOR_GROUPS, EXCLUDED_FROM_COLOR_GROUPS } from '../../config/global-groups.config';
import ColorPicker from '../shared/ColorPicker';

// ============================================================
// 工具函数
// ============================================================

const safeString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.backgroundColor) return String(value.backgroundColor);
    if (value.color) return String(value.color);
    if (value.background) return String(value.background);
    const keys = Object.keys(value);
    if (keys.length === 1 && typeof value[keys[0]] === 'string') return value[keys[0]];
    return '';
  }
  return String(value);
};

const getNumberFromValue = (value: any, unit: string = 'rem'): number => {
  const str = safeString(value);
  const match = str.match(new RegExp(`([\\d.]+)${unit}`));
  if (match) return parseFloat(match[1]);
  if (str.endsWith('px')) return parseFloat(str) / 16;
  if (str.endsWith('rem')) return parseFloat(str);
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseShadow = (shadowStr: string) => {
  const str = safeString(shadowStr);
  const regex = /([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+([\-\d.]+)(\w+)?\s+(.+)/;
  const match = str.match(regex);
  if (match) {
    return { x: match[1], y: match[3], blur: match[5], spread: match[7], color: match[9] };
  }
  return { x: '0', y: '4px', blur: '6px', spread: '-1px', color: 'rgb(0 0 0 / 0.1)' };
};

/**
 * 获取默认值
 * 优先级：base.css 中的默认值
 */
const getDefaultValue = (
  baseCssDefaults: Record<string, string>,
  key: string
): string => {
  return baseCssDefaults[key] || '';
};

/**
 * 判断当前值是否等于默认值
 */
const isEqualToDefault = (
  currentValue: string,
  baseCssDefaults: Record<string, string>,
  key: string
): boolean => {
  const defaultValue = getDefaultValue(baseCssDefaults, key);
  return safeString(currentValue) === defaultValue;
};

// ============================================================
// 卡片分组组件
// ============================================================

function SectionCard({
  title,
  children,
  variableKeys,   // ✅ 新增：当前分组的变量键列表
}: {
  title: string;
  children: React.ReactNode;
  variableKeys?: string[];
}) {
  // 过滤出有映射的变量
  const relevantMappings = variableKeys
    ? variableKeys
        .filter((key) => VARIABLE_COMPONENT_MAP[key])
        .map((key) => ({ key, description: VARIABLE_COMPONENT_MAP[key] }))
    : [];

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-sm font-semibold mb-3 text-gray-700">{title}</h3>
      <div className="space-y-3">{children}</div>

      {/* ✅ 变量与组件对照表（放最后） */}
      {relevantMappings.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 mb-2">
            📋 变量与组件对照
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            {relevantMappings.map(({ key, description }) => (
              <div key={key} className="flex gap-2">
                <span className="font-mono text-gray-600 flex-shrink-0 min-w-[180px]">
                  {key}
                </span>
                <span className="text-gray-400">→</span>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 带「恢复默认」的变量行组件
// ============================================================

interface VariableRowProps {
  label: string;              // 中文名
  variableKey: string;        // 变量名（如 font-size-sm）
  currentValue: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onReset: () => void;
  showVariableName?: boolean; // 是否显示变量名（字体不显示）
  children: React.ReactNode;  // 具体的输入控件（滑块、输入框、下拉框等）
}

function VariableRow({
  label,
  variableKey,
  currentValue,
  defaultValue,
  onChange,
  onReset,
  showVariableName = true,
  children,
}: VariableRowProps) {
  const isDefault = safeString(currentValue) === defaultValue;

  return (
    <div className="flex items-center justify-between gap-2">
      {/* 标签 */}
      <label className="text-sm flex-shrink-0 w-48 truncate" title={`${label}（${variableKey}）`}>
        {label}
        {showVariableName && (
          <span className="text-xs text-gray-400 ml-1">（{variableKey}）</span>
        )}
      </label>

      {/* 输入控件 */}
      <div className="flex-1">{children}</div>

      {/* 恢复默认 */}
      <button
        onClick={onReset}
        disabled={isDefault}
        className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 transition ${
          isDefault
            ? 'text-gray-300 border-gray-200 cursor-not-allowed'
            : 'text-blue-500 border-blue-200 hover:bg-blue-50'
        }`}
        title={isDefault ? '当前已是默认值' : `恢复为默认值：${defaultValue}`}
      >
        恢复默认
      </button>
    </div>
  );
}

// ============================================================
// 分组配置
// ============================================================

// ---- 文字分组（已删除「文字颜色」） ----
const TYPOGRAPHY_GROUPS = [
  {
    name: '字体',
    // ✅ 新增 font-heading
    keys: ['font-sans', 'font-heading', 'font-serif', 'font-mono'],
    hideVariableName: true, // 字体不显示变量名
  },
  {
    name: '字号',
    keys: [
      'font-size-xs',
      'font-size-sm',
      'font-size-base',
      'font-size-lg',
      'font-size-xl',
      'font-size-2xl',
      'font-size-3xl',
      'font-size-4xl',
    ],
  },
  {
    name: '字重',
    keys: ['font-weight-normal', 'font-weight-medium', 'font-weight-semibold', 'font-weight-bold'],
  },
  {
    name: '行高与字间距',
    keys: [
      'line-height-tight',
      'line-height-normal',
      'line-height-relaxed',
      'letter-spacing-tight',
      'letter-spacing-normal',
      'letter-spacing-wide',
    ],
  },
];

// ---- 间距分组 ----
const SPACING_GROUPS = [
  {
    name: '基础间距',
    keys: [
      'spacing-unit',
      'spacing-1',
      'spacing-2',
      'spacing-3',
      'spacing-4',
      'spacing-5',
      'spacing-6',
      'spacing-8',
      'spacing-10',
      'spacing-12',
    ],
  },
  {
    name: '容器与区块',
    keys: ['container-padding', 'section-gap', 'grid-gap', 'product-card-padding'],
  },
];

// ---- 圆角分组 ----
const RADIUS_GROUPS = [
  {
    name: '通用圆角',
    keys: ['radius', 'radius-sm', 'radius-md', 'radius-lg', 'radius-xl', 'radius-2xl', 'radius-full'],
  },
  {
    name: '组件圆角',
    keys: ['product-card-radius', 'btn-radius', 'input-radius'],
  },
];

// ---- 阴影分组 ----
const SHADOW_GROUPS = [
  {
    name: '通用阴影',
    keys: ['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
  },
  {
    name: '组件阴影',
    keys: ['product-card-shadow', 'dropdown-shadow', 'btn-shadow'],
  },
];

// ---- 动效分组 ----
const ANIMATION_GROUPS = [
  {
    name: '持续时间',
    keys: [
      'transition-duration-75',
      'transition-duration-100',
      'transition-duration-150',
      'transition-duration-200',
      'transition-duration-300',
      'transition-duration-500',
    ],
  },
  {
    name: '缓动曲线',
    keys: [
      'transition-timing-ease',
      'transition-timing-linear',
      'transition-timing-in',
      'transition-timing-out',
    ],
  },
];

// ============================================================
// 标签页组件
// ============================================================

interface GlobalTabsProps {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animation: Record<string, string>;
  darkMode: string;
  baseCssDefaults: Record<string, string>; // ✅ 新增
  onUpdate: (category: string, key: string, value: string) => void;
  onDarkModeUpdate: (value: string) => void;
}

export default function GlobalTabs({
  colors,
  darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  darkMode,
  baseCssDefaults,
  onUpdate,
  onDarkModeUpdate,
}: GlobalTabsProps) {
  // ============================================================
  // ✅ 阴影高级模式状态（提升到组件顶层，符合 React Hooks 规则）
  // ============================================================
  const [isAdvanced, setIsAdvanced] = useState(false);

  // ============================================================
  // 辅助：渲染颜色分组（保持不变）
  // ============================================================
  const renderColorGroups = (
    colorObj: Record<string, string>,
    category: 'colors' | 'darkColors'
  ) => {
    const allKeys = USED_VARIABLES.colors.filter(
      (key: string) => !EXCLUDED_FROM_COLOR_GROUPS.includes(key)
    );
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLOR_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => allKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.id} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const currentValue = colorObj[key] || '';
                const hasValue = currentValue !== '';
                return (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm w-32">{VARIABLE_LABELS[key] || key}</label>
                    <div className="flex items-center gap-2">
                      <ColorPicker
                        value={currentValue}
                        onChange={(val) => onUpdate(category, key, val)}
                        editable={true}
                      />
                      {hasValue && (
                        <button
                          onClick={() => onUpdate(category, key, '')}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition flex-shrink-0"
                          title="清空颜色"
                        >
                          清空
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 亮色颜色
  // ============================================================
  const renderColorsTab = () => renderColorGroups(colors, 'colors');

  // ============================================================
  // Tab: 暗色颜色
  // ============================================================
  const renderDarkColorsTab = () => {
    if (Object.keys(darkColors).length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          暂无暗色配置，请从预设主题复制或手动添加
        </div>
      );
    }
    return renderColorGroups(darkColors, 'darkColors');
  };

  // ============================================================
  // Tab: 文字
  // ============================================================
  const renderTypographyTab = () => {
    const typoKeys = USED_VARIABLES.typography;
    return (
      <div className="space-y-6">
        {TYPOGRAPHY_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => typoKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.name} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const value = typography[key] || '';
                const label = VARIABLE_LABELS[key] || key;
                const defaultValue = getDefaultValue(baseCssDefaults, key);

                // ---- 字体：下拉框，不显示变量名 ----
                if (
                  key === 'font-sans' ||
                  key === 'font-heading' ||
                  key === 'font-serif' ||
                  key === 'font-mono'
                ) {
                  return (
                    <VariableRow
                      key={key}
                      label={label}
                      variableKey={key}
                      currentValue={value}
                      defaultValue={defaultValue}
                      onChange={(val) => onUpdate('typography', key, val)}
                      onReset={() => onUpdate('typography', key, defaultValue)}
                      showVariableName={false}
                    >
                      <select
                        value={safeString(value)}
                        onChange={(e) => onUpdate('typography', key, e.target.value)}
                        className="border rounded p-1 w-full text-sm"
                      >
                        {/* ============================================================
                            正文字体（font-sans）：Geist / Inter / Noto Sans SC
                            ============================================================ */}
                        {key === 'font-sans' && (
                          <>
                            <option value="'Geist', 'Inter', 'Noto Sans SC', system-ui, sans-serif">
                              Geist（服务器托管 · 推荐）
                            </option>
                            <option value="'Inter', 'Noto Sans SC', system-ui, sans-serif">
                              Inter（服务器托管）
                            </option>
                            <option value="'Noto Sans SC', system-ui, sans-serif">
                              Noto Sans SC（服务器托管 · 中文优先）
                            </option>
                            <option value="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif">
                              系统默认
                            </option>
                            <option value="'PingFang SC', 'Microsoft YaHei', sans-serif">
                              苹方/微软雅黑
                            </option>
                          </>
                        )}

                        {/* ============================================================
                            标题字体（font-heading）：Plus Jakarta Sans 打头
                            ============================================================ */}
                        {key === 'font-heading' && (
                          <>
                            <option value="'Plus Jakarta Sans', 'Noto Sans SC', system-ui, sans-serif">
                              Plus Jakarta Sans（服务器托管 · 推荐）
                            </option>
                            <option value="'Geist', 'Noto Sans SC', system-ui, sans-serif">
                              Geist（服务器托管）
                            </option>
                            <option value="'Inter', 'Noto Sans SC', system-ui, sans-serif">
                              Inter（服务器托管）
                            </option>
                            <option value="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif">
                              系统默认
                            </option>
                          </>
                        )}

                        {/* ============================================================
                            衬线字体（font-serif）：保持系统字体
                            ============================================================ */}
                        {key === 'font-serif' && (
                          <>
                            <option value="ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif">
                              系统衬线
                            </option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="'Times New Roman', Times, serif">
                              Times New Roman
                            </option>
                          </>
                        )}

                        {/* ============================================================
                            等宽字体（font-mono）：保持系统字体
                            ============================================================ */}
                        {key === 'font-mono' && (
                          <>
                            <option value="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace">
                              系统等宽
                            </option>
                            <option value="'SF Mono', monospace">SF Mono</option>
                            <option value="'Courier New', monospace">Courier New</option>
                            <option value="'Fira Code', monospace">Fira Code</option>
                          </>
                        )}
                      </select>
                    </VariableRow>
                  );
                }

                // ---- 字号、字重、行高、字间距：滑块 ----
                const isSize = key.includes('font-size');
                const isWeight = key.includes('font-weight');
                const isLineHeight = key.includes('line-height');
                const isLetterSpacing = key.includes('letter-spacing');

                let min = 0;
                let max = 0;
                let step = 0.1;
                let unit = '';
                let numValue = 0;

                if (isSize) {
                  unit = 'rem';
                  min = 0.5;
                  max = 4;
                  step = 0.05;
                  numValue = getNumberFromValue(value, 'rem');
                } else if (isWeight) {
                  unit = '';
                  min = 100;
                  max = 900;
                  step = 100;
                  numValue = parseInt(safeString(value)) || 400;
                } else if (isLineHeight) {
                  unit = '';
                  min = 1;
                  max = 2.8;
                  step = 0.1;
                  numValue = parseFloat(safeString(value)) || 1.5;
                } else if (isLetterSpacing) {
                  unit = 'em';
                  min = -0.05;
                  max = 0.15;
                  step = 0.005;
                  numValue = getNumberFromValue(value, 'em');
                } else {
                  return null;
                }

                return (
                  <VariableRow
                    key={key}
                    label={label}
                    variableKey={key}
                    currentValue={value}
                    defaultValue={defaultValue}
                    onChange={(val) => onUpdate('typography', key, val)}
                    onReset={() => onUpdate('typography', key, defaultValue)}
                  >
                    <div className="w-full">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={numValue}
                        onChange={(e) =>
                          onUpdate('typography', key, `${parseFloat(e.target.value)}${unit}`)
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {numValue}
                        {unit}
                      </div>
                    </div>
                  </VariableRow>
                );
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 间距
  // ============================================================
  const renderSpacingTab = () => {
    const spacingKeys = USED_VARIABLES.spacing;
    return (
      <div className="space-y-6">
        {SPACING_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => spacingKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.name} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const value = spacing[key] || '';
                const label = VARIABLE_LABELS[key] || key;
                const defaultValue = getDefaultValue(baseCssDefaults, key);
                const isUnit = key === 'spacing-unit';
                const numValue = getNumberFromValue(value, 'rem');
                let min = 0.125;
                let max = 0.5;
                let step = 0.025;
                if (!isUnit) {
                  min = 0.125;
                  max = 4;
                  step = 0.125;
                }
                if (key === 'container-padding' || key === 'product-card-padding') {
                  min = 0.25;
                  max = 3;
                  step = 0.25;
                }
                if (key === 'section-gap' || key === 'grid-gap') {
                  min = 0.5;
                  max = 5;
                  step = 0.25;
                }
                return (
                  <VariableRow
                    key={key}
                    label={label}
                    variableKey={key}
                    currentValue={value}
                    defaultValue={defaultValue}
                    onChange={(val) => onUpdate('spacing', key, val)}
                    onReset={() => onUpdate('spacing', key, defaultValue)}
                  >
                    <div className="w-full">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={numValue}
                        onChange={(e) =>
                          onUpdate('spacing', key, `${parseFloat(e.target.value)}rem`)
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {numValue}rem
                      </div>
                    </div>
                  </VariableRow>
                );
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 圆角
  // ============================================================
  const renderRadiusTab = () => {
    const radiusKeys = USED_VARIABLES.borderRadius;
    return (
      <div className="space-y-6">
        {RADIUS_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => radiusKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.name} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const value = borderRadius[key] || '';
                const label = VARIABLE_LABELS[key] || key;
                const defaultValue = getDefaultValue(baseCssDefaults, key);
                const isFull = key === 'radius-full';
                if (isFull) {
                  return (
                    <VariableRow
                      key={key}
                      label={label}
                      variableKey={key}
                      currentValue={value}
                      defaultValue={defaultValue}
                      onChange={(val) => onUpdate('borderRadius', key, val)}
                      onReset={() => onUpdate('borderRadius', key, defaultValue)}
                    >
                      <select
                        value={safeString(value)}
                        onChange={(e) => onUpdate('borderRadius', key, e.target.value)}
                        className="border rounded p-1 w-full text-sm"
                      >
                        <option value="9999px">完全圆形</option>
                        <option value="2rem">2rem</option>
                        <option value="1.5rem">1.5rem</option>
                        <option value="1rem">1rem</option>
                        <option value="0.75rem">0.75rem</option>
                        <option value="0.5rem">0.5rem</option>
                        <option value="0">无圆角</option>
                      </select>
                    </VariableRow>
                  );
                }
                const numValue = getNumberFromValue(value, 'rem');
                return (
                  <VariableRow
                    key={key}
                    label={label}
                    variableKey={key}
                    currentValue={value}
                    defaultValue={defaultValue}
                    onChange={(val) => onUpdate('borderRadius', key, val)}
                    onReset={() => onUpdate('borderRadius', key, defaultValue)}
                  >
                    <div className="w-full">
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.05}
                        value={numValue}
                        onChange={(e) =>
                          onUpdate('borderRadius', key, `${parseFloat(e.target.value)}rem`)
                        }
                        className="w-full"
                      />
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {numValue}rem
                      </div>
                    </div>
                  </VariableRow>
                );
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 阴影
  // ============================================================
  const renderShadowsTab = () => {
    const shadowKeys = USED_VARIABLES.shadows;
    // ✅ isAdvanced 已提升到组件顶层

    return (
      <div className="space-y-6">
        {SHADOW_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => shadowKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.name} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const value = shadows[key] || '';
                const label = VARIABLE_LABELS[key] || key;
                const defaultValue = getDefaultValue(baseCssDefaults, key);
                if (key === 'shadow-md') {
                  const shadowParts = parseShadow(value);
                  return (
                    <div key={key} className="space-y-2">
                      <VariableRow
                        label={label}
                        variableKey={key}
                        currentValue={value}
                        defaultValue={defaultValue}
                        onChange={(val) => onUpdate('shadows', key, val)}
                        onReset={() => onUpdate('shadows', key, defaultValue)}
                      >
                        <select
                          value={(() => {
                            const s = safeString(value);
                            if (s.includes('0 1px 3px')) return 'sm';
                            if (s.includes('0 4px 6px')) return 'md';
                            if (s.includes('0 10px 15px')) return 'lg';
                            return 'custom';
                          })()}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'sm')
                              onUpdate('shadows', 'shadow-md', '0 1px 3px 0 rgb(0 0 0 / 0.1)');
                            else if (val === 'md')
                              onUpdate('shadows', 'shadow-md', '0 4px 6px -1px rgb(0 0 0 / 0.1)');
                            else if (val === 'lg')
                              onUpdate('shadows', 'shadow-md', '0 10px 15px -3px rgb(0 0 0 / 0.1)');
                          }}
                          className="border rounded p-1 text-sm w-full"
                        >
                          <option value="sm">轻微</option>
                          <option value="md">中等</option>
                          <option value="lg">明显</option>
                          <option value="custom">自定义</option>
                        </select>
                      </VariableRow>

                      <div className="flex items-center gap-2 mt-2 pl-48">
                        <input
                          type="checkbox"
                          checked={isAdvanced}
                          onChange={(e) => setIsAdvanced(e.target.checked)}
                        />
                        <label className="text-sm">高级模式（自定义阴影值）</label>
                      </div>

                      {isAdvanced && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-48">
                          <div>
                            <label className="text-xs">X偏移</label>
                            <input
                              type="text"
                              value={shadowParts.x}
                              onChange={(e) => {
                                const ns = `${e.target.value} ${shadowParts.y} ${shadowParts.blur} ${shadowParts.spread} ${shadowParts.color}`;
                                onUpdate('shadows', 'shadow-md', ns);
                              }}
                              className="border rounded p-1 w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs">Y偏移</label>
                            <input
                              type="text"
                              value={shadowParts.y}
                              onChange={(e) => {
                                const ns = `${shadowParts.x} ${e.target.value} ${shadowParts.blur} ${shadowParts.spread} ${shadowParts.color}`;
                                onUpdate('shadows', 'shadow-md', ns);
                              }}
                              className="border rounded p-1 w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs">模糊半径</label>
                            <input
                              type="text"
                              value={shadowParts.blur}
                              onChange={(e) => {
                                const ns = `${shadowParts.x} ${shadowParts.y} ${e.target.value} ${shadowParts.spread} ${shadowParts.color}`;
                                onUpdate('shadows', 'shadow-md', ns);
                              }}
                              className="border rounded p-1 w-full text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs">扩散半径</label>
                            <input
                              type="text"
                              value={shadowParts.spread}
                              onChange={(e) => {
                                const ns = `${shadowParts.x} ${shadowParts.y} ${shadowParts.blur} ${e.target.value} ${shadowParts.color}`;
                                onUpdate('shadows', 'shadow-md', ns);
                              }}
                              className="border rounded p-1 w-full text-sm"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs">阴影颜色</label>
                            <input
                              type="text"
                              value={shadowParts.color}
                              onChange={(e) => {
                                const ns = `${shadowParts.x} ${shadowParts.y} ${shadowParts.blur} ${shadowParts.spread} ${e.target.value}`;
                                onUpdate('shadows', 'shadow-md', ns);
                              }}
                              className="border rounded p-1 w-full text-sm"
                            />
                          </div>
                        </div>
                      )}
                      <div
                        className="h-12 w-full bg-white rounded border mt-2"
                        style={{ boxShadow: safeString(shadows['shadow-md']) }}
                      />
                    </div>
                  );
                }
                return (
                  <VariableRow
                    key={key}
                    label={label}
                    variableKey={key}
                    currentValue={value}
                    defaultValue={defaultValue}
                    onChange={(val) => onUpdate('shadows', key, val)}
                    onReset={() => onUpdate('shadows', key, defaultValue)}
                  >
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => onUpdate('shadows', key, e.target.value)}
                      className="border rounded p-1 w-full text-sm"
                      placeholder="例如: 0 2px 4px rgba(0,0,0,0.1)"
                    />
                  </VariableRow>
                );
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 动效
  // ============================================================
  const renderAnimationTab = () => {
    const animKeys = USED_VARIABLES.animation;
    return (
      <div className="space-y-6">
        {ANIMATION_GROUPS.map((group) => {
          const groupKeys = group.keys.filter((key) => animKeys.includes(key));
          if (groupKeys.length === 0) return null;
          return (
            <SectionCard key={group.name} title={group.name} variableKeys={groupKeys}>
              {groupKeys.map((key) => {
                const value = animation[key] || '';
                const label = VARIABLE_LABELS[key] || key;
                const defaultValue = getDefaultValue(baseCssDefaults, key);
                const isDuration = key.includes('duration');
                const isTiming = key.includes('timing');

                if (isDuration) {
                  const numValue = getNumberFromValue(value, 'ms');
                  let min = 50;
                  let max = 800;
                  let step = 25;
                  if (key === 'transition-duration-75') {
                    min = 30;
                    max = 150;
                    step = 5;
                  }
                  if (key === 'transition-duration-100') {
                    min = 50;
                    max = 200;
                    step = 10;
                  }
                  if (key === 'transition-duration-150') {
                    min = 75;
                    max = 300;
                    step = 10;
                  }
                  if (key === 'transition-duration-200') {
                    min = 100;
                    max = 500;
                    step = 25;
                  }
                  if (key === 'transition-duration-300') {
                    min = 150;
                    max = 800;
                    step = 25;
                  }
                  if (key === 'transition-duration-500') {
                    min = 200;
                    max = 1200;
                    step = 50;
                  }
                  return (
                    <VariableRow
                      key={key}
                      label={label}
                      variableKey={key}
                      currentValue={value}
                      defaultValue={defaultValue}
                      onChange={(val) => onUpdate('animation', key, val)}
                      onReset={() => onUpdate('animation', key, defaultValue)}
                    >
                      <div className="w-full">
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={numValue}
                          onChange={(e) =>
                            onUpdate('animation', key, `${parseFloat(e.target.value)}ms`)
                          }
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          {numValue}ms
                        </div>
                      </div>
                    </VariableRow>
                  );
                }
                if (isTiming) {
                  return (
                    <VariableRow
                      key={key}
                      label={label}
                      variableKey={key}
                      currentValue={value}
                      defaultValue={defaultValue}
                      onChange={(val) => onUpdate('animation', key, val)}
                      onReset={() => onUpdate('animation', key, defaultValue)}
                    >
                      <select
                        value={safeString(value)}
                        onChange={(e) => onUpdate('animation', key, e.target.value)}
                        className="border rounded p-1 w-full text-sm"
                      >
                        <option value="ease">ease</option>
                        <option value="linear">linear</option>
                        <option value="ease-in">ease-in</option>
                        <option value="ease-out">ease-out</option>
                        <option value="ease-in-out">ease-in-out</option>
                        <option value="cubic-bezier(0.4, 0, 0.2, 1)">
                          cubic-bezier(0.4, 0, 0.2, 1)
                        </option>
                        <option value="cubic-bezier(0, 0, 0.2, 1)">
                          cubic-bezier(0, 0, 0.2, 1)
                        </option>
                        <option value="cubic-bezier(0.4, 0, 1, 1)">
                          cubic-bezier(0.4, 0, 1, 1)
                        </option>
                      </select>
                    </VariableRow>
                  );
                }
                return null;
              })}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // Tab: 深色模式
  // ============================================================
  const renderDarkModeTab = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block font-semibold mb-2">深色模式策略</label>
          <select
            value={darkMode || 'system'}
            onChange={(e) => onDarkModeUpdate(e.target.value)}
            className="border rounded p-2"
          >
            <option value="light">始终亮色</option>
            <option value="dark">始终深色</option>
            <option value="system">跟随系统</option>
          </select>
        </div>
      </div>
    );
  };

  // ============================================================
  // 主渲染
  // ============================================================
  return (
    <>
      <TabsPrimitive.Content value="colors">{renderColorsTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="darkColors">{renderDarkColorsTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="typography">{renderTypographyTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="spacing">{renderSpacingTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="radius">{renderRadiusTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="shadows">{renderShadowsTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="animation">{renderAnimationTab()}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="darkMode">{renderDarkModeTab()}</TabsPrimitive.Content>
    </>
  );
}