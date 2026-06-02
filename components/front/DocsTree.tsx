'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DocNode {
  id: string;
  title: string;
  slug: string;
  children?: DocNode[];
}

interface DocsTreeProps {
  tree: DocNode[];
  librarySlug: string;
  currentDocSlug: string;
  locale: string;
  basePath?: string;
}

export default function DocsTree({
  tree,
  librarySlug,
  currentDocSlug,
  locale,
  basePath = 'docs',
}: DocsTreeProps) {
  // 记录当前展开的一级节点ID
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null);
  // 记录展开的二级及更深节点的ID集合
  const [expandedInner, setExpandedInner] = useState<Set<string>>(new Set());

  // 构建完整的URL
  const getHref = (slug: string) => `/${locale}/${basePath}/${librarySlug}/${slug}`;

  // 根据当前文档自动展开上层节点
  useEffect(() => {
    if (!currentDocSlug || !tree.length) return;

    const findParent = (nodes: DocNode[], targetSlug: string): { root: string | null; ancestors: string[] } => {
      for (const node of nodes) {
        if (node.slug === targetSlug) {
          return { root: node.id, ancestors: [] };
        }
        if (node.children) {
          for (const child of node.children) {
            if (child.slug === targetSlug) {
              return { root: node.id, ancestors: [] };
            }
            // 如果存在更深层级，遍历子节点的子节点...
          }
        }
      }
      return { root: null, ancestors: [] };
    };

    const { root } = findParent(tree, currentDocSlug);
    if (root) {
      setExpandedRoot(root);
    }
  }, [tree, currentDocSlug]);

  // 切换一级节点的展开/折叠
  const toggleRoot = (nodeId: string) => {
    setExpandedRoot(prev => (prev === nodeId ? null : nodeId));
  };

  // 切换二级或更深节点的展开/折叠
  const toggleInner = (nodeId: string) => {
    setExpandedInner(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // 主题变量
  const textColor = 'var(--navbar-text, var(--foreground))';
  const hoverTextColor = 'var(--navbar-hover-text, var(--primary))';
  const hoverBgColor = 'var(--navbar-hover-bg, transparent)';
  const activeTextColor = 'var(--navbar-active-text, var(--primary))';
  const activeBgColor = 'var(--navbar-active-bg, color-mix(in oklch, var(--primary) 10%, transparent))';

  const renderNode = (node: DocNode, depth: number = 0): React.ReactNode => {
    const isRoot = depth === 0;
    const hasChildren = node.children && node.children.length > 0;
    const isActive = node.slug === currentDocSlug;
    const isExpanded = isRoot ? expandedRoot === node.id : expandedInner.has(node.id);
    const href = getHref(node.slug);

    // 整行容器：负责高亮激活背景
    return (
      <div key={node.id} className="relative">
        <div
          className="flex items-center justify-between w-full rounded-md transition-all"
          style={{
            backgroundColor: isActive ? activeBgColor : 'transparent',
          }}
        >
          {/* 整行点击跳转：Link 组件撑满整个容器 */}
          <Link
            href={href}
            className="flex-1 py-1.5 px-2 text-sm font-medium"
            style={{
              color: isActive ? activeTextColor : textColor,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = hoverTextColor;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = textColor;
            }}
          >
            {node.title}
          </Link>

          {/* 折叠/展开按钮（仅存在于有子节点的节点） */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isRoot) {
                  toggleRoot(node.id);
                } else {
                  toggleInner(node.id);
                }
              }}
              className="p-1 rounded-md"
              style={{
                color: textColor,
                transition: 'color 150ms ease',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = hoverTextColor;
                if (hoverBgColor !== 'transparent') e.currentTarget.style.backgroundColor = hoverBgColor;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = textColor;
                if (hoverBgColor !== 'transparent') e.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* 子节点列表 */}
        {hasChildren && isExpanded && (
          <ul className="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-2">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full md:w-64 flex-shrink-0 bg-gray-50">
      <div className="sticky top-16 pb-8">
        <div className="space-y-1 p-4">
          {tree.map(node => renderNode(node, 0))}
        </div>
      </div>
    </aside>
  );
}