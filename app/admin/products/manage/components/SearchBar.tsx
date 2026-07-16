// components/admin/products/SearchBar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, X, Check } from 'lucide-react';

// 定义数据类型接口
interface ProductLine {
  id: string;
  name: string;
  order?: number;
  templateId?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

interface Series {
  id: string;
  name: string;
  slug?: string;
  order?: number;
  image?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

interface Category {
  id: string;
  name: string;
  productLineId: string;
  slug?: string;
  order?: number;
  image?: string;
  description?: string;
  attributeTemplateId?: string;
  pageTemplate?: string;
  series?: Series[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

interface ApiResponse {
  productLines: ProductLine[];
  categories: Category[];
}

interface CategoryNode {
  id: string;
  name: string;
  isProductLine?: boolean;
  parentId?: string;
  categoryId?: string;   // 如果是二级分类，记录所属的一级分类ID
  children?: CategoryNode[];
}

interface SearchBarProps {
  onSearch: (data: { keyword: string; categoryId: string; seriesId: string }) => void;
  initialKeyword: string;
  initialCategoryId: string;
  initialSeriesId?: string;
  locale: string; // 新增：当前语言
}

export function SearchBar({ 
  onSearch, 
  initialKeyword, 
  initialCategoryId, 
  initialSeriesId = '', 
  locale // 接收当前语言
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [seriesId, setSeriesId] = useState(initialSeriesId);
  const [displayName, setDisplayName] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [treeOpen, setTreeOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 🔥 关键修改：依赖 locale，并使用 locale 请求分类树
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await fetch(`/api/admin/products/categories?locale=${locale}`);
        const data: ApiResponse = await res.json();
        const lines = data.productLines || [];
        const categories = data.categories || [];

        // 构建产品线节点
        const tree: CategoryNode[] = lines.map((line: ProductLine) => ({
          id: line.id,
          name: line.name,
          isProductLine: true,
          children: [],
        }));

        const lineMap = new Map(tree.map(node => [node.id, node]));

        // 递归构建分类树
        categories.forEach((cat: Category) => {
          const parentLine = lineMap.get(cat.productLineId);
          if (parentLine) {
            const node: CategoryNode = {
              id: cat.id,
              name: cat.name,
              isProductLine: false,
              parentId: parentLine.id,
              children: cat.series?.map((s: Series) => ({
                id: s.id,
                name: s.name,
                isProductLine: false,
                parentId: cat.id,
                categoryId: cat.id,   // 记录所属一级分类ID
              })) || [],
            };
            parentLine.children!.push(node);
          }
        });

        setCategoryTree(tree);
        setExpandedNodes(new Set(lines.map((line: ProductLine) => line.id)));
      } catch (err) {
        console.error(err);
      }
    };
    fetchTree();
  }, [locale]); // 🔥 依赖 locale，切换语言时重新请求

  // 根据当前选中的分类ID查找显示名称和实际存储的ID
  useEffect(() => {
    const findNode = (
      nodes: CategoryNode[],
      targetId: string,
      parentCatId?: string
    ): { node: CategoryNode | null; catId: string; seriesId: string } => {
      for (const node of nodes) {
        if (node.id === targetId) {
          if (node.isProductLine) {
            return { node: null, catId: '', seriesId: '' };
          }
          if (node.categoryId) {
            // 二级分类
            return { node, catId: node.categoryId, seriesId: node.id };
          } else {
            // 一级分类
            return { node, catId: node.id, seriesId: '' };
          }
        }
        if (node.children) {
          const found = findNode(node.children, targetId, node.isProductLine ? undefined : node.id);
          if (found.node) return found;
        }
      }
      return { node: null, catId: '', seriesId: '' };
    };

    if (categoryId || seriesId) {
      const targetId = seriesId || categoryId;
      if (targetId) {
        const { node, catId: newCatId, seriesId: newSeriesId } = findNode(categoryTree, targetId);
        if (node) {
          setDisplayName(node.name);
          if (newSeriesId) {
            setCategoryId(newCatId);
            setSeriesId(newSeriesId);
          } else {
            setCategoryId(newCatId);
            setSeriesId('');
          }
          return;
        }
      }
    }
    setDisplayName('');
  }, [categoryId, seriesId, categoryTree]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setTreeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) newSet.delete(nodeId);
      else newSet.add(nodeId);
      return newSet;
    });
  };

  const selectCategory = (node: CategoryNode) => {
    if (node.isProductLine) return;
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
    setCategoryId(newCategoryId);
    setSeriesId(newSeriesId);
    setTreeOpen(false);
    onSearch({ keyword, categoryId: newCategoryId, seriesId: newSeriesId });
  };

  const clearCategory = () => {
    setCategoryId('');
    setSeriesId('');
    setDisplayName('');
    setTreeOpen(false);
    onSearch({ keyword, categoryId: '', seriesId: '' });
  };

  const clearKeyword = () => {
    setKeyword('');
    onSearch({ keyword: '', categoryId, seriesId });
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ keyword, categoryId, seriesId });
  };

  const renderTree = (nodes: CategoryNode[], level = 0) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = node.categoryId ? node.id === seriesId : node.id === categoryId;
      const isProductLine = node.isProductLine === true;
      const paddingLeft = level === 0 ? 0 : 16;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center justify-between py-1.5 hover:bg-gray-100 cursor-pointer ${
              isProductLine ? 'text-gray-500' : ''
            }`}
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            <div className="flex items-center flex-1">
              {hasChildren && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {expandedNodes.has(node.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              {!hasChildren && <span className="w-4 mr-1" />}
              <span
                onClick={() => !isProductLine && selectCategory(node)}
                className={`text-sm ${
                  isProductLine ? 'cursor-default' : 'cursor-pointer'
                } ${
                  isSelected && !isProductLine
                    ? 'text-blue-600 font-medium'
                    : isProductLine
                    ? ''
                    : 'text-gray-900'
                }`}
              >
                {node.name}
              </span>
            </div>
            {isSelected && !isProductLine && <Check size={14} className="text-blue-600 mr-1" />}
          </div>
          {hasChildren && expandedNodes.has(node.id) && (
            <div>{renderTree(node.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6 items-center">
      <div className="relative w-[35%]">
        <input
          type="text"
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="商品名称 / SKU"
          className="border rounded p-2 w-full pr-8"
        />
        {keyword && (
          <button
            type="button"
            onClick={clearKeyword}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setTreeOpen(!treeOpen)}
          className="border rounded p-2 bg-white flex items-center justify-between w-72"
        >
          <span className={displayName ? 'text-gray-900' : 'text-gray-400'}>
            {displayName || '全部分类'}
          </span>
          <ChevronDown size={16} className="ml-2" />
        </button>
        {treeOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 w-80 bg-white border rounded shadow-lg z-50 max-h-80 overflow-auto"
          >
            <div className="p-2 border-b sticky top-0 bg-white">
              <button
                type="button"
                onClick={clearCategory}
                className="text-sm text-blue-600 hover:underline"
              >
                清空分类
              </button>
            </div>
            <div className="p-1">{renderTree(categoryTree)}</div>
          </div>
        )}
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        搜索
      </button>
    </form>
  );
}