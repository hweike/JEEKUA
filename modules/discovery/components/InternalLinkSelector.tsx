// modules/discovery/components/InternalLinkSelector.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { LinkTreeNode } from '../types';

interface Props {
  locale: string;
  value: string;
  onChange: (url: string, id?: string) => void;
  placeholder?: string;
}

export default function InternalLinkSelector({ locale, value, onChange, placeholder = '选择或搜索链接' }: Props) {
  const [tree, setTree] = useState<LinkTreeNode[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/discovery/link-tree?locale=${locale}`)
      .then(res => res.json())
      .then(setTree);
  }, [locale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const filterTree = (nodes: LinkTreeNode[]): LinkTreeNode[] => {
    if (!search) return nodes;
    return nodes.reduce((acc: LinkTreeNode[], node) => {
      const matchesSelf = node.label.toLowerCase().includes(search.toLowerCase());
      let filteredChildren: LinkTreeNode[] = [];
      if (node.children) {
        filteredChildren = filterTree(node.children);
      }
      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
      return acc;
    }, []);
  };

  const filteredTree = filterTree(tree);
  const selectedLabel = tree.flatMap(node => {
    if (node.children) return node.children;
    return node;
  }).find(item => item.url === value)?.label || '';

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="border rounded px-3 py-2 cursor-pointer bg-white flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value ? selectedLabel || value : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-80 overflow-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="flex items-center border rounded px-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 p-1 outline-none text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="p-2">
            {filteredTree.map((node) => (
              <div key={node.label}>
                {node.children ? (
                  <div>
                    <div
                      className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => toggleGroup(node.label)}
                    >
                      {openGroups[node.label] ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                      <span className="text-sm font-medium">{node.label}</span>
                    </div>
                    {openGroups[node.label] && (
                      <div className="ml-4">
                        {node.children.map((child) => (
                          <div
                            key={child.id}
                            className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                            onClick={() => {
                              onChange(child.url!, child.id);
                              setIsOpen(false);
                              setSearch('');
                            }}
                          >
                            {child.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="cursor-pointer hover:bg-gray-100 p-1 rounded text-sm"
                    onClick={() => {
                      onChange(node.url!, node.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {node.label}
                  </div>
                )}
              </div>
            ))}
            {filteredTree.length === 0 && (
              <div className="text-sm text-gray-500 p-2 text-center">无匹配结果</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}