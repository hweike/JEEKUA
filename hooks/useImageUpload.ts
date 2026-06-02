import { Editor } from '@tiptap/react';

interface UseImageUploadProps {
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  onInserted?: () => void;
}

export function useImageUpload({ editor, hideWhenUnavailable = true, onInserted }: UseImageUploadProps) {
  const canInsert = editor?.can().setImage({ src: '' }) ?? false;
  const isVisible = !hideWhenUnavailable || canInsert;

  const handleImage = () => {
    const url = prompt('输入图片 URL');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
      onInserted?.();
    }
  };

  return {
    isVisible,
    canInsert,
    handleImage,
    label: '插入图片',
    shortcutKeys: 'Cmd/Ctrl + Shift + I',
  };
}