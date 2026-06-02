import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';

type Level = 1 | 2 | 3 | 4 | 5 | 6;

interface UseHeadingDropdownMenuProps {
  editor: Editor | null;
  levels?: Level[];
  hideWhenUnavailable?: boolean;
}

export function useHeadingDropdownMenu({
  editor,
  levels = [1, 2, 3, 4],
  hideWhenUnavailable = true,
}: UseHeadingDropdownMenuProps) {
  const [activeLevel, setActiveLevel] = useState<Level | undefined>();

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      let found: Level | undefined;
      for (const level of levels) {
        if (editor.isActive('heading', { level })) {
          found = level;
          break;
        }
      }
      setActiveLevel(found);
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor, levels]);

  const isActive = activeLevel !== undefined;
  const canToggle = editor?.can().toggleHeading({ level: 1 }) ?? false;
  const isVisible = !hideWhenUnavailable || canToggle;

  return {
    isVisible,
    activeLevel,
    isActive,
    canToggle,
    levels,
    label: '标题',
  };
}