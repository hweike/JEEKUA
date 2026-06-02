import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

type ListType = 'bulletList' | 'orderedList' | 'taskList';

interface UseListProps {
  editor: Editor | null;
  type: ListType;
  hideWhenUnavailable?: boolean;
  onToggled?: () => void;
}

export function useList({ editor, type, hideWhenUnavailable = true, onToggled }: UseListProps) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setIsActive(editor.isActive(type));
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor, type]);

  const getCanToggle = () => {
    if (!editor) return false;
    // 对于 bulletList 和 orderedList，直接用 can().toggleList() 检查
    // 但 TipTap 没有直接提供 can().toggleBulletList()，可以用 can().toggleList()
    // 实际上 StarterKit 中列表命令是 toggleBulletList()，用 can().toggleBulletList() 即可
    if (type === 'bulletList') return editor.can().toggleBulletList();
    if (type === 'orderedList') return editor.can().toggleOrderedList();
    if (type === 'taskList') return editor.can().toggleTaskList();
    return false;
  };

  const canToggle = getCanToggle();
  const isVisible = !hideWhenUnavailable || canToggle;

  const handleToggle = () => {
    if (!editor) return false;
    if (type === 'bulletList') {
      editor.chain().focus().toggleBulletList().run();
    } else if (type === 'orderedList') {
      editor.chain().focus().toggleOrderedList().run();
    } else if (type === 'taskList') {
      editor.chain().focus().toggleTaskList().run();
    }
    onToggled?.();
    return true;
  };

  const getLabel = () => {
    if (type === 'bulletList') return '无序列表';
    if (type === 'orderedList') return '有序列表';
    return '任务列表';
  };

  const getShortcut = () => {
    if (type === 'bulletList') return 'Cmd/Ctrl + Shift + 8';
    if (type === 'orderedList') return 'Cmd/Ctrl + Shift + 7';
    return 'Cmd/Ctrl + Shift + 9';
  };

  return {
    isVisible,
    isActive,
    canToggle,
    handleToggle,
    label: getLabel(),
    shortcutKeys: getShortcut(),
  };
}