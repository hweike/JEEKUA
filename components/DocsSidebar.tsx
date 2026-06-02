'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface DocNode {
  id: string;
  title: string;
  slug: string;
  children?: DocNode[];
}

export default function DocsSidebar({ tree, locale, libSlug }: { tree: DocNode[]; locale: string; libSlug: string }) {
  const pathname = usePathname();
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null);

  const toggleExpand = (nodeId: string) => {
    setExpandedRoot(prev => (prev === nodeId ? null : nodeId));
  };

  const renderNode = (node: DocNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isRoot = depth === 0;
    const isExpanded = isRoot && expandedRoot === node.id;
    // 关键修复：使用 libSlug 而不是 node.id
    const href = `/${locale}/docs/${libSlug}/${node.slug}`;
    const isActive = pathname === href;

    if (isRoot) {
      return (
        <li key={node.id} className="mb-2">
          <div
            className={`flex items-center justify-between w-full py-2 rounded-md text-sm ${
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <Link
              href={href}
              onClick={() => toggleExpand(node.id)}
              className="flex-1 py-1 px-2"
            >
              {node.title}
            </Link>
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="shrink-0 rounded-sm p-0.5 hover:bg-accent/50 transition-colors mr-2"
                aria-label={isExpanded ? '折叠' : '展开'}
              >
                <svg
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2"
                  height="18"
                  className={`transition-transform duration-200 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          {hasChildren && isExpanded && (
            <ul className="space-y-2 mt-1">
              {node.children!.map(child => renderNode(child, depth + 1))}
            </ul>
          )}
        </li>
      );
    }

    // 子文档（不包含展开按钮）
    const isActiveChild = pathname === href;
    return (
      <li key={node.id} className="mb-2">
        <Link
          href={href}
          className={`block py-2 px-2 rounded-md text-sm ${
            isActiveChild
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-foreground hover:bg-accent'
          } pl-6`}
        >
          {node.title}
        </Link>
      </li>
    );
  };

  return (
    <aside className="w-80 bg-background h-full sticky top-16 overflow-auto border-r border-border">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">文档</h2>
        {!tree || tree.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">暂无文档</div>
        ) : (
          <ul className="space-y-2">
            {tree.map(node => renderNode(node, 0))}
          </ul>
        )}
      </div>
    </aside>
  );
}