'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Link as LinkIcon, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';

interface TreeNode {
  label: string;
  type: string;
  url?: string;
  id?: string;
  children?: TreeNode[];
  _loadState?: 'idle' | 'loading' | 'loaded' | 'all_loaded';
  _page?: number;
  _total?: number;
  _hasMore?: boolean;
}

interface NavState {
  title: string;
  nodes: TreeNode[];
  parentPath: TreeNode[];
}

export default function LinkInput({
  value,
  onChange,
  placeholder = '搜索或粘贴链接',
  locale = 'zh',
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  locale?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [currentNav, setCurrentNav] = useState<NavState | null>(null);
  const [search, setSearch] = useState('');
  const [displayValue, setDisplayValue] = useState(value);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedLocale, setCachedLocale] = useState<string | null>(null);

  // 跟踪哪个父节点正在加载更多（用于显示加载状态）
  const [loadingMoreId, setLoadingMoreId] = useState<string | null>(null);

  const processTreeData = (data: TreeNode[]): TreeNode[] => {
    if (!Array.isArray(data)) return [];

    const cloned = JSON.parse(JSON.stringify(data)) as TreeNode[];

    const filtered = cloned.filter(
      (node) => node.type !== 'home' && node.type !== 'inquiry'
    );

    const homeNode: TreeNode = {
      label: '主页',
      type: 'home',
      url: '/home',
      id: 'page:10000001',
    };
    const inquiryNode: TreeNode = {
      label: '询盘',
      type: 'inquiry',
      url: '/inquiry',
      id: 'page:inquiry',
    };

    const result: TreeNode[] = [homeNode, ...filtered];
    const videoIndex = filtered.findIndex((node) => node.type === 'video');
    if (videoIndex !== -1) {
      const insertIndex = videoIndex + 2;
      result.splice(insertIndex, 0, inquiryNode);
    } else {
      result.push(inquiryNode);
    }

    // productCollection 层级构建
    const existingProductGroup = result.find(n => n.type === 'productCollection');
    if (existingProductGroup && existingProductGroup.children) {
      const items = existingProductGroup.children;
      const nodeMap = new Map<string, TreeNode>();
      items.forEach(item => {
        if (item.id) nodeMap.set(item.id, { ...item, children: [] });
      });
      const rootNodes: TreeNode[] = [];
      nodeMap.forEach((node, id) => {
        if (id && id.includes('/')) {
          const [parentId] = id.split('/');
          const parent = nodeMap.get(parentId);
          if (parent) {
            if (!parent.children) parent.children = [];
            if (!parent.children.some(c => c.id === id)) {
              parent.children.push(node);
            }
          } else {
            rootNodes.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });
      if (rootNodes.length > 0) {
        existingProductGroup.children = rootNodes;
      }
    }

    // 标记 product 分组需要按需加载
    const productGroup = result.find(n => n.type === 'product');
    if (productGroup) {
      productGroup.children = [];
      productGroup._loadState = 'idle';
      productGroup._page = 0;
    }

    return result;
  };

  const findTitleByUrl = (url: string, nodes: TreeNode[]): string | null => {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (node.url === url) return node.label;
      if (node.children && Array.isArray(node.children)) {
        const found = findTitleByUrl(url, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current || !isOpen) return;
    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const DROPDOWN_HEIGHT = 400;

    let top: number;
    if (spaceBelow >= DROPDOWN_HEIGHT || spaceBelow >= spaceAbove) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - DROPDOWN_HEIGHT;
    }

    setDropdownStyle({
      position: 'fixed',
      top,
      left: rect.left,
      width: rect.width,
      height: DROPDOWN_HEIGHT,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    });
  }, [isOpen]);

  const loadProducts = async (node: TreeNode, page: number = 1) => {
    if (node._loadState === 'loading') return;
    node._loadState = 'loading';
    setTreeData([...treeData]); // 触发重新渲染

    try {
      const res = await fetch(`/api/discovery/link-tree?locale=${locale}&type=product&page=${page}`);
      const data = await res.json();
      if (!data.items) throw new Error('No items');
      const newItems = data.items.map((item: any) => ({
        label: item.label,
        url: item.url,
        id: item.id,
        type: 'product',
        children: [],
      }));

      // 合并数据
      if (page === 1) {
        node.children = newItems;
      } else {
        // 移除已有的 __loadMore 占位
        const existingChildren = node.children || [];
        const filtered = existingChildren.filter(c => c.type !== '__loadMore');
        node.children = [...filtered, ...newItems];
      }
      node._page = page;
      node._total = data.total;
      node._hasMore = data.hasMore;
      node._loadState = data.hasMore ? 'loaded' : 'all_loaded';

      // 如果还有更多，添加“加载更多”占位节点
      if (data.hasMore) {
        node.children.push({
          label: '加载更多',
          type: '__loadMore',
          url: undefined,
          id: `__loadMore_${page}`,
        });
      }

      setTreeData([...treeData]);

      // 如果当前导航的父节点是当前加载的节点，更新 currentNav
      if (currentNav && currentNav.parentPath.length > 0) {
        const parent = currentNav.parentPath[currentNav.parentPath.length - 1];
        if (parent === node) {
          setCurrentNav({
            ...currentNav,
            nodes: node.children || [],
          });
        }
      }
    } catch (error) {
      node._loadState = 'idle';
    } finally {
      // 清除加载更多状态
      setLoadingMoreId(null);
    }
  };

  const loadMore = (node: TreeNode) => {
    // 如果正在加载更多，忽略点击
    if (loadingMoreId === node.id) return;
    if (!node._hasMore) return;
    // 设置加载状态
    setLoadingMoreId(node.id);
    const nextPage = (node._page || 0) + 1;
    loadProducts(node, nextPage);
  };

  const goToChildren = (node: TreeNode) => {
    if (node.type === 'product' && node._loadState === 'idle') {
      loadProducts(node, 1).then(() => {
        if (node.children && node.children.length > 0 && currentNav) {
          const parentPath = [...(currentNav?.parentPath || []), node];
          setCurrentNav({
            title: node.label,
            nodes: node.children,
            parentPath: parentPath,
          });
        }
      });
      return;
    }
    if (node.children && node.children.length > 0) {
      setCurrentNav({
        title: node.label,
        nodes: node.children,
        parentPath: [...(currentNav?.parentPath || []), node],
      });
    }
  };

  const goBack = () => {
    if (!currentNav?.parentPath.length) return;
    const newParentPath = [...currentNav.parentPath];
    newParentPath.pop();
    const parentNodes = newParentPath.length === 0 ? treeData : newParentPath[newParentPath.length - 1].children!;
    setCurrentNav({
      title: newParentPath.length === 0 ? '选择链接' : newParentPath[newParentPath.length - 1].label,
      nodes: parentNodes,
      parentPath: newParentPath,
    });
  };

  const loadData = useCallback(async () => {
    if (loaded && cachedLocale === locale) return;
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/link-tree?locale=${locale}`);
      const data = await res.json();
      const tree = data.tree || data;
      if (Array.isArray(tree)) {
        const processed = processTreeData(tree);
        setTreeData(processed);
        setCurrentNav({
          title: '选择链接',
          nodes: processed,
          parentPath: [],
        });
        if (value) {
          const title = findTitleByUrl(value, processed);
          setDisplayValue(title || value);
        }
        setLoaded(true);
        setCachedLocale(locale);
      }
    } catch (e) {
      // 静默
    } finally {
      setLoading(false);
    }
  }, [locale, loaded, cachedLocale, loading, value]);

  useEffect(() => {
    if (cachedLocale !== locale) {
      setLoaded(false);
      setTreeData([]);
    }
  }, [locale, cachedLocale]);

  useEffect(() => {
    if (value && treeData.length > 0) {
      const title = findTitleByUrl(value, treeData);
      setDisplayValue(title || value);
    } else {
      setDisplayValue(value);
    }
  }, [value, treeData]);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (!val.trim()) {
      const parentNodes =
        currentNav?.parentPath.length === 0
          ? treeData
          : currentNav?.parentPath[currentNav.parentPath.length - 1]?.children || treeData;
      setCurrentNav({
        title: currentNav?.title || '选择链接',
        nodes: parentNodes,
        parentPath: currentNav?.parentPath || [],
      });
      return;
    }
    const collectLeaves = (nodes: TreeNode[]): TreeNode[] => {
      if (!Array.isArray(nodes)) return [];
      let leaves: TreeNode[] = [];
      for (const node of nodes) {
        if (node.url && node.id && node.type !== '__loadMore') {
          leaves.push(node);
        } else if (node.children && Array.isArray(node.children)) {
          leaves = leaves.concat(collectLeaves(node.children));
        }
      }
      return leaves;
    };
    const allLeaves = collectLeaves(treeData);
    const filtered = allLeaves.filter((node) =>
      node.label.toLowerCase().includes(val.toLowerCase())
    );
    setCurrentNav({
      title: '搜索结果',
      nodes: filtered,
      parentPath: [],
    });
  };

  const handleSelect = (node: TreeNode) => {
    if (node.url) {
      setDisplayValue(node.label);
      onChange(node.url);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleManualChange = (newValue: string) => {
    setDisplayValue(newValue);
    onChange(newValue);
  };

  const renderNodes = () => {
    if (!currentNav) return null;
    const { nodes, title, parentPath } = currentNav;
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className="px-3 py-2 border-b flex items-center text-sm text-gray-600 shrink-0 cursor-pointer hover:bg-gray-50"
          onClick={() => parentPath.length > 0 && goBack()}
        >
          {parentPath.length > 0 && <span className="mr-1 text-base">←</span>}
          <span className="truncate">{parentPath.length === 0 ? title : '返回'}</span>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {Array.isArray(nodes) && nodes.map((node) => {
            const isLoadMore = node.type === '__loadMore';
            if (isLoadMore) {
              // 获取父节点（产品分组）
              const parentNode = currentNav.parentPath[currentNav.parentPath.length - 1];
              const isLoading = loadingMoreId === parentNode?.id;
              return (
                <div
                  key={node.id}
                  className={`flex items-center justify-center px-3 py-2 text-sm ${
                    isLoading
                      ? 'text-gray-400 cursor-default'
                      : 'text-blue-600 hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLoading) return;
                    if (parentNode && parentNode.type === 'product') {
                      loadMore(parentNode);
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      加载中...
                    </>
                  ) : (
                    '加载更多'
                  )}
                </div>
              );
            }

            const hasChildren = node.children && node.children.length > 0;
            const hasUrl = !!node.url;
            const isProductWithChildren = node.type === 'product' && node._loadState === 'idle';
            const showChevron = hasChildren || isProductWithChildren;

            return (
              <div
                key={node.id || node.label}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <span
                  className="truncate flex-1"
                  onClick={() => {
                    if (hasUrl) {
                      handleSelect(node);
                    } else if (node.type === 'product' && !hasChildren && node._loadState === 'idle') {
                      goToChildren(node);
                    } else if (hasChildren) {
                      goToChildren(node);
                    }
                  }}
                >
                  {node.label}
                </span>
                {showChevron && (
                  <button
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (node.type === 'product' && node._loadState === 'idle') {
                        goToChildren(node);
                      } else if (hasChildren) {
                        goToChildren(node);
                      }
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          {(!Array.isArray(nodes) || nodes.length === 0) && (
            <div className="text-sm text-gray-500 p-4 text-center">暂无数据</div>
          )}
        </div>
      </div>
    );
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      setSearch('');
      if (!loaded || cachedLocale !== locale) {
        loadData();
      } else {
        const parentNodes =
          currentNav?.parentPath.length === 0
            ? treeData
            : currentNav?.parentPath[currentNav.parentPath.length - 1]?.children || treeData;
        setCurrentNav({
          title: currentNav?.title || '选择链接',
          nodes: parentNodes,
          parentPath: currentNav?.parentPath || [],
        });
      }
    }
    setIsOpen(!isOpen);
  };

  const isLoading = loading && !loaded;

  return (
    <div className="relative flex-1 link-input-container">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <LinkIcon className="w-4 h-4 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="bg-white border rounded-md shadow-lg overflow-hidden link-input-dropdown-panel"
            style={dropdownStyle}
          >
            <div className="sticky top-0 bg-white p-2 border-b shrink-0">
              <div className="flex items-center border rounded px-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="搜索页面..."
                  className="flex-1 p-1 outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-gray-500">加载中...</div>
            ) : (
              renderNodes()
            )}
          </div>,
          document.body
        )}
    </div>
  );
}