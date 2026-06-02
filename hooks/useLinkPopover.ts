import { Editor } from '@tiptap/react';
import { useState, useEffect } from 'react';

interface UseLinkPopoverProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  onSetLink?: () => void;
}

export function useLinkPopover({ editor, hideWhenUnavailable = true, onSetLink }: UseLinkPopoverProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      setIsActive(editor.isActive('link'));
      if (editor.isActive('link')) {
        const href = editor.getAttributes('link').href;
        setUrl(href || null);
      } else {
        setUrl(null);
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    update();
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const canSet = editor?.can().setLink({ href: '' }) ?? false;
  const isVisible = !hideWhenUnavailable || canSet;

  const setLink = () => {
    if (!editor || !url) return;
    editor.chain().focus().setLink({ href: url }).run();
    onSetLink?.();
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setUrl(null);
  };

  return {
    isVisible,
    canSet,
    isActive,
    url,
    setUrl,
    setLink,
    removeLink,
    label: '添加链接',
  };
}