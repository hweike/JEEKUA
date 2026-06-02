// components/admin/menus/LinkInput.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react';

interface TreeNode {
  label: string;
  type: string;
  url?: string;
  id?: string;
  children?: TreeNode[];
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
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
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

  const findTitleByUrl = (url: string, nodes: TreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.url === url) return node.label;
      if (node.children) {
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

  useEffect(() => {
    fetch('/api/discovery/link-tree?locale=zh')
      .then((res) => res.json())
      .then((data: TreeNode[]) => {
        setTreeData(data);
        setCurrentNav({
          title: '选择链接',
          nodes: data,
          parentPath: [],
        });
        if (value) {
          const title = findTitleByUrl(value, data);
          setDisplayValue(title || value);
        }
      })
      .catch(console.error);
  }, []);

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

  const goToChildren = (node: TreeNode) => {
    if (!node.children || node.children.length === 0) return;
    setCurrentNav({
      title: node.label,
      nodes: node.children,
      parentPath: [...(currentNav?.parentPath || []), node],
    });
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (!val.trim()) {
      const parentNodes = currentNav?.parentPath.length === 0 ? treeData : currentNav?.parentPath[currentNav.parentPath.length - 1]?.children || treeData;
      setCurrentNav({
        title: currentNav?.title || '选择链接',
        nodes: parentNodes,
        parentPath: currentNav?.parentPath || [],
      });
      return;
    }
    const collectLeaves = (nodes: TreeNode[]): TreeNode[] => {
      let leaves: TreeNode[] = [];
      for (const node of nodes) {
        if (node.url && node.id) {
          leaves.push(node);
        } else if (node.children) {
          leaves = leaves.concat(collectLeaves(node.children));
        }
      }
      return leaves;
    };
    const allLeaves = collectLeaves(treeData);
    const filtered = allLeaves.filter(node =>
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
      <div className="flex flex-col h-full">
        <div
          className="px-3 py-2 border-b flex items-center text-sm text-gray-600 shrink-0 cursor-pointer hover:bg-gray-50"
          onClick={() => parentPath.length > 0 && goBack()}
        >
          {parentPath.length > 0 && <span className="mr-1 text-base">←</span>}
          <span className="truncate">{parentPath.length === 0 ? title : '返回'}</span>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {nodes.map((node) => (
            <div
              key={node.id || node.label}
              className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              onClick={() => {
                if (node.children && node.children.length > 0) {
                  goToChildren(node);
                } else if (node.url) {
                  handleSelect(node);
                }
              }}
            >
              <span className="truncate">{node.label}</span>
              {node.children && node.children.length > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
              )}
            </div>
          ))}
          {nodes.length === 0 && (
            <div className="text-sm text-gray-500 p-4 text-center">暂无数据</div>
          )}
        </div>
      </div>
    );
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      // 打开时重置搜索和导航
      setSearch('');
      const parentNodes = currentNav?.parentPath.length === 0 ? treeData : currentNav?.parentPath[currentNav.parentPath.length - 1]?.children || treeData;
      setCurrentNav({
        title: currentNav?.title || '选择链接',
        nodes: parentNodes,
        parentPath: currentNav?.parentPath || [],
      });
    }
    setIsOpen(!isOpen);
  };

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
            {renderNodes()}
          </div>,
          document.body
        )}
    </div>
  );
}