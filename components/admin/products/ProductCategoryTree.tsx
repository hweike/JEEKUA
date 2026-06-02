'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface CategoryNode {
  id: string;
  name: string;
  isProductLine?: boolean;
  parentId?: string;
  categoryId?: string;
  children?: CategoryNode[];
}

interface ProductCategoryTreeProps {
  locale?: string;
  onSelect: (categoryId: string, seriesId: string) => void;
  selectedCategoryId?: string;
  selectedSeriesId?: string;
}

export default function ProductCategoryTree({
  locale = 'zh',
  onSelect,
  selectedCategoryId = '',
  selectedSeriesId = '',
}: ProductCategoryTreeProps) {
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch(`/api/admin/products/categories?locale=${locale}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const lines = data.productLines || [];
        const categories = data.categories || [];

        const tree: CategoryNode[] = lines.map((line: any) => ({
          id: line.id,
          name: line.name,
          isProductLine: true,
          children: [],
        }));

        const lineMap = new Map(tree.map(node => [node.id, node]));

        categories.forEach((cat: any) => {
          const parentLine = lineMap.get(cat.productLineId);
          if (parentLine) {
            const node: CategoryNode = {
              id: cat.id,
              name: cat.name,
              isProductLine: false,
              parentId: parentLine.id,
              children: cat.series?.map((s: any) => ({
                id: s.id,
                name: s.name,
                isProductLine: false,
                parentId: cat.id,
                categoryId: cat.id,
              })) || [],
            };
            parentLine.children!.push(node);
          }
        });

        setCategoryTree(tree);
        setExpandedNodes(new Set(lines.map(line => line.id)));
        setError(null);
      } catch (err) {
        console.error('加载分类树失败', err);
        setError('加载失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, [locale]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const handleSelect = (node: CategoryNode) => {
    if (node.isProductLine) return; // 产品线不可选
    let newCategoryId = '';
    let newSeriesId = '';
    if (node.categoryId) {
      // 二级分类
      newCategoryId = node.categoryId;
      newSeriesId = node.id;
    } else {
      // 一级分类
      newCategoryId = node.id;
      newSeriesId = '';
    }
    onSelect(newCategoryId, newSeriesId);
  };

  const isSelected = (node: CategoryNode) => {
    if (node.isProductLine) return false;
    if (node.categoryId) {
      return node.id === selectedSeriesId;
    } else {
      return node.id === selectedCategoryId;
    }
  };

  const renderTree = (nodes: CategoryNode[], level = 0) => {
    if (!nodes.length) return null;
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const selected = isSelected(node);
      const isProductLine = node.isProductLine === true;
      const paddingLeft = level === 0 ? 0 : 16;

      // 处理行点击（整行区域）
      const handleRowClick = () => {
        if (isProductLine) {
          // 产品线：只折叠/展开
          toggleNode(node.id);
        } else if (hasChildren) {
          // 一级分类（有二级子项）：选中 + 折叠/展开二级列表
          handleSelect(node);
          toggleNode(node.id);
        } else {
          // 二级分类（无子项）：只选中
          handleSelect(node);
        }
      };

      return (
        <div key={node.id}>
          <div
            className={`flex items-center justify-between py-1.5 hover:bg-gray-100 cursor-pointer ${isProductLine ? 'text-gray-500' : ''}`}
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={handleRowClick}
          >
            <div className="flex items-center flex-1">
              {hasChildren && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation(); // 防止触发行点击
                    toggleNode(node.id);
                  }}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {expandedNodes.has(node.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {!hasChildren && <span className="w-4 mr-1" />}
              <span
                className={`text-sm ${isProductLine ? '' : 'cursor-pointer'} ${
                  selected && !isProductLine ? 'text-blue-600 font-medium' : isProductLine ? '' : 'text-gray-900'
                }`}
              >
                {node.name}
              </span>
            </div>
            {selected && !isProductLine && (
              <Check size={14} className="text-blue-600 mr-1" />
            )}
          </div>
          {hasChildren && expandedNodes.has(node.id) && (
            <div>{renderTree(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (loading) return <div className="text-center py-4 text-gray-500">加载分类中...</div>;
  if (error) return <div className="text-center py-4 text-red-500">{error}</div>;
  if (categoryTree.length === 0) return <div className="text-center py-4 text-gray-500">暂无分类</div>;

  return <div className="overflow-auto h-full">{renderTree(categoryTree)}</div>;
}