'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface DocNode {
  id: string;
  title: string;
  slug: string;
  children?: DocNode[];
  badge?: string;
}

interface DocsTreeProps {
  tree: DocNode[];
  librarySlug: string;
  currentDocSlug: string;
  locale: string;
  basePath: string;
  onSelect: (slug: string) => void;
  theme: {
    text: string;
    groupLabel: string;
    activeBg: string;
    activeText: string;
    activeBorder: string;
    hoverBg: string;
    hoverText: string;
    badgeBg: string;
    badgeText: string;
    border: string;
  };
}

export default function DocsTree({
  tree,
  currentDocSlug,
  onSelect,
  theme,
}: DocsTreeProps) {
  const {
    text,
    groupLabel,
    activeBg,
    activeText,
    hoverBg,
    hoverText,
    badgeBg,
    badgeText,
  } = theme;

  // ============================================================
  // ✅ 全局标准变量（对应 VARIABLE_COMPONENT_MAP）
  // ============================================================
  const FONT_SIZE_SM   = 'var(--font-size-sm, 14px)';           // 二级节点
  const FONT_SIZE_BASE = 'var(--font-size-base, 16px)';         // 一级节点
  const FW_NORMAL      = 'var(--font-weight-normal, 400)';      // 叶子
  const FW_MEDIUM      = 'var(--font-weight-medium, 500)';      // 二级
  const FW_SEMIBOLD    = 'var(--font-weight-semibold, 600)';    // 一级 / 选中
  const LINE_HEIGHT    = 'var(--line-height-normal, 1.5)';
  const LETTER_SPACING = 'var(--letter-spacing-normal, normal)';
  const SPACING_2      = 'var(--spacing-2, 0.5rem)';            // 分组间距
  const SPACING_4      = 'var(--spacing-4, 1rem)';              // 一级缩进

  // ============================================================
  // ✅ 硬编码尺寸（全局标准里没有）
  // ============================================================
  const NODE_HEIGHT = '36px';
  const INDENT_L1   = SPACING_4;   // 16px
  const INDENT_L2   = '2rem';      // 32px

  // ============================================================
  // ✅ 展开状态（替代 <details>，避免"详情"）
  // 默认展开一级
  // ============================================================
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    const collect = (nodes: DocNode[], level: number, prefix: string) => {
      nodes.forEach((node, i) => {
        const key = `${prefix}-${i}`;
        if (level === 0) init[key] = true;   // 一级默认展开
        if (node.children) collect(node.children, level + 1, key);
      });
    };
    collect(tree, 0, 'group');
    return init;
  });

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNode = (node: DocNode, level: number, key: string) => {
    const isActive = currentDocSlug === node.slug;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = !!expandedKeys[key];
    const indentCss = level === 1 ? INDENT_L1 : level === 2 ? INDENT_L2 : '0px';

    const levelFontSize = level === 0 ? FONT_SIZE_BASE : FONT_SIZE_SM;
    const levelWeight =
      level === 0 ? FW_SEMIBOLD :
      level === 1 ? FW_MEDIUM :
      FW_NORMAL;

    // ============================================================
    // 有子节点：一级节点也可点击（选中 + 展开子节点）
    // ============================================================
    if (hasChildren) {
      return (
        <li key={key} style={{ marginBottom: SPACING_2 }}>
          <div
            className="flex items-center gap-1 rounded-md transition-colors"
            style={{
              height: NODE_HEIGHT,
              paddingLeft: `calc(${indentCss} + 8px)`,
              paddingRight: '8px',
              backgroundColor: isActive ? activeBg : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = hoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* ✅ 标题：点击 → 选中 + 展开子节点 */}
            <button
              type="button"
              onClick={() => {
                onSelect(node.slug);
                if (!isExpanded) toggleExpand(key);
              }}
              className="truncate flex-1 text-left cursor-pointer"
              style={{
                fontSize: levelFontSize,
                fontWeight: isActive ? FW_SEMIBOLD : levelWeight,
                lineHeight: LINE_HEIGHT,
                letterSpacing: LETTER_SPACING,
                color: isActive ? activeText : (level === 0 ? groupLabel : text),
                background: 'none',
                border: 'none',
                padding: 0,
              }}
            >
              {node.title}
            </button>

            {/* ✅ 箭头：点击 → 只展开/收起 */}
            <button
              type="button"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={() => toggleExpand(key)}
              className="flex-shrink-0 cursor-pointer"
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                color: isActive ? activeText : (level === 0 ? groupLabel : text),
                display: 'flex',
                alignItems: 'center',
                transition: 'transform var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {isExpanded && (
            <ul style={{ marginTop: SPACING_2 }}>
              {node.children!.map((child, i) =>
                renderNode(child, level + 1, `${key}-${i}`)
              )}
            </ul>
          )}
        </li>
      );
    }

    // ============================================================
    // 叶子节点
    // ============================================================
    return (
      <li key={key} style={{ marginBottom: '2px' }}>
        <button
          type="button"
          onClick={() => onSelect(node.slug)}
          className="w-full text-left flex items-center gap-2 rounded-md transition-colors relative"
          style={{
            height: NODE_HEIGHT,
            paddingLeft: `calc(${indentCss} + 8px)`,
            paddingRight: '8px',
            fontSize: levelFontSize,
            fontWeight: isActive ? FW_SEMIBOLD : levelWeight,
            lineHeight: LINE_HEIGHT,
            letterSpacing: LETTER_SPACING,
            color: isActive ? activeText : text,
            backgroundColor: isActive ? activeBg : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = hoverBg;
              e.currentTarget.style.color = hoverText;
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = text;
            }
          }}
        >
          <span className="truncate flex-1">{node.title}</span>

          {node.badge && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                backgroundColor: badgeBg,
                color: badgeText,
              }}
            >
              {node.badge}
            </span>
          )}
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Documentation navigation">
      <ul>
        {tree.map((group, i) => renderNode(group, 0, `group-${i}`))}
      </ul>
    </nav>
  );
}