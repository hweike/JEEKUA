// components/admin/menus/LinkSelector.tsx
'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

interface LinkItem {
  id: string;
  label: string;
  url: string;
  group: string;
}

interface TreeNode {
  label: string;
  type: string;
  url?: string;
  id?: string;
  children?: TreeNode[];
}

export default function LinkSelector({
  locale,
  onSelect,
  selectedUrl,
}: {
  locale: string;
  onSelect: (link: { id: string; label: string; url: string; group: string }) => void;
  selectedUrl?: string;
}) {
  const [items, setItems] = useState<LinkItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, LinkItem[]>>({});
  const [search, setSearch] = useState('');

  // 递归遍历树，生成扁平列表
  const flattenTree = (nodes: TreeNode[], parentGroup: string = ''): LinkItem[] => {
    let result: LinkItem[] = [];
    for (const node of nodes) {
      // 如果是叶子节点（有 url）
      if (node.url && node.id) {
        const group = parentGroup || node.label;
        result.push({
          id: node.id,
          label: node.label,
          url: node.url,
          group,
        });
      }
      // 如果有子节点，递归处理
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenTree(node.children, node.label));
      }
    }
    return result;
  };

  useEffect(() => {
    fetch(`/api/discovery/link-tree?locale=${locale}`)
      .then((res) => res.json())
      .then((tree: TreeNode[]) => {
        const flatItems = flattenTree(tree);
        setItems(flatItems);
        // 按 group 分组
        const groups: Record<string, LinkItem[]> = {};
        flatItems.forEach((item) => {
          if (!groups[item.group]) groups[item.group] = [];
          groups[item.group].push(item);
        });
        setGrouped(groups);
      })
      .catch(console.error);
  }, [locale]);

  const filtered = search
    ? items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <div className="border rounded-md">
      <div className="p-2 border-b flex items-center">
        <Search className="w-4 h-4 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="搜索页面..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm"
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-2">
        {search ? (
          filtered?.map((link) => (
            <div
              key={link.id}
              onClick={() => onSelect(link)}
              className={`cursor-pointer p-2 rounded hover:bg-gray-100 text-sm ${
                selectedUrl === link.url ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              {link.label}
            </div>
          ))
        ) : (
          Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group} className="mb-2">
              <div className="text-xs font-semibold text-gray-500 mb-1">{group}</div>
              {groupItems.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onSelect(link)}
                  className={`cursor-pointer p-2 rounded hover:bg-gray-100 text-sm ${
                    selectedUrl === link.url ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  {link.label}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}