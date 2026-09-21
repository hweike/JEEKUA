'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Youtube from '@tiptap/extension-youtube';
import { TableKit } from '@tiptap/extension-table';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { NodeSelection } from '@tiptap/pm/state';
import { common, createLowlight } from 'lowlight';
import { useHotkeys } from 'react-hotkeys-hook';
import { Rnd } from 'react-rnd';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Quote, Code, Minus, Eraser, Undo, Redo, ChevronDown,
  Video, Heading, List, ListOrdered, CheckSquare,
  Link as LinkIcon, ImageIcon, Upload, Maximize2, Minimize2,
  Table as TableIcon, Trash2, Plus, Columns, Rows,
  AlignStartVertical, AlignEndVertical, AlignCenterVertical,
} from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useHeadingDropdownMenu } from '@/hooks/useHeadingDropdownMenu';
import { useList } from '@/hooks/useList';
import { useLinkPopover } from '@/hooks/useLinkPopover';
import { useToast } from '@/contexts/ToastContext';
import { getImageUrl } from '@/lib/files/url';

const lowlight = createLowlight(common);

// ============================================================
// 自定义图片扩展：支持宽高、对齐、CSS 样式
// ============================================================
const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),

      // 宽度（不设默认值，让图片自适应）
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width') || element.style.width;
          if (!width) return null;
          return parseInt(width, 10) || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },

      // 高度
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height') || element.style.height;
          if (!height) return null;
          return parseInt(height, 10) || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },

      // 对齐
      'data-align': {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes['data-align'],
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center';
    const { 'data-align': _, ...rest } = HTMLAttributes;

    // 用 style 控制显示，不设置固定宽高
    const style = [
      `display: block`,
      `margin-left: ${align === 'left' ? '0' : align === 'right' ? 'auto' : 'auto'}`,
      `margin-right: ${align === 'left' ? 'auto' : align === 'right' ? '0' : 'auto'}`,
      `max-width: 100%`,
      `height: auto`,
    ];

    // 如果设置了宽高，加到 style
    if (rest.width) style.push(`width: ${rest.width}px`);
    if (rest.height) style.push(`height: ${rest.height}px`);

    return [
      'img',
      {
        ...rest,
        style: style.join('; '),
      },
    ];
  },
});

// ============================================================
// 自定义扩展：清理粘贴的样式（保留基本格式，移除内联样式）
// ============================================================
const CleanPaste = Extension.create({
  name: 'cleanPaste',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            try {
              const doc = new DOMParser().parseFromString(html, 'text/html');

              // 移除所有内联样式（保留 width/height 特殊处理）
              doc.querySelectorAll('[style]').forEach((el) => {
                const tagName = el.tagName.toLowerCase();
                // 图片保留 style（用于宽高）
                if (tagName !== 'img') {
                  el.removeAttribute('style');
                } else {
                  // 图片只保留 width/height/max-width
                  const style = (el as HTMLElement).style;
                  const width = style.width;
                  const height = style.height;
                  el.removeAttribute('style');
                  if (width) (el as HTMLElement).style.width = width;
                  if (height) (el as HTMLElement).style.height = height;
                }
              });

              // 移除 class（避免外部样式污染）
              doc.querySelectorAll('[class]').forEach((el) => {
                // 保留一些必要的 class（如代码块语言标记）
                const className = el.getAttribute('class') || '';
                if (!className.includes('language-') && !className.includes('hljs')) {
                  el.removeAttribute('class');
                }
              });

              return doc.body.innerHTML;
            } catch {
              return html;
            }
          },
        },
      }),
    ];
  },
});

// ============================================================
// 自定义扩展：粘贴图片文件
// ============================================================
const PasteImage = Extension.create({
  name: 'pasteImage',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of items) {
              if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (!file) continue;

                (async () => {
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await fetch('/api/images', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.url) {
                      const fullUrl = getImageUrl(data.url);
                      const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
                      const { state, dispatch } = view;
                      const imageNode = state.schema.nodes.image.create({
                        src: proxiedUrl,
                        'data-align': 'center',
                      });
                      dispatch(state.tr.replaceSelectionWith(imageNode));
                    }
                  } catch (err) {
                    console.error('[PasteImage] 上传失败:', err);
                  }
                })();

                event.preventDefault();
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

// ============================================================
// 自定义扩展：远程图片代理
// ============================================================
const RemoteImageProxy = Extension.create({
  name: 'remoteImageProxy',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            try {
              const doc = new DOMParser().parseFromString(html, 'text/html');
              const images = doc.querySelectorAll('img');

              images.forEach((img) => {
                // 提取真实 URL
                let realSrc =
                  img.getAttribute('data-src') ||
                  img.getAttribute('data-original') ||
                  img.getAttribute('src') ||
                  '';

                if (!realSrc || realSrc.startsWith('data:')) {
                  const srcset = img.getAttribute('srcset');
                  if (srcset) {
                    const firstUrl = srcset.split(',')[0].trim().split(/\s+/)[0];
                    if (firstUrl && !firstUrl.startsWith('data:')) {
                      realSrc = firstUrl;
                    }
                  }
                }

                if (!realSrc || realSrc.startsWith('data:') || realSrc.startsWith('blob:')) {
                  return;
                }

                if (realSrc.startsWith('/api/proxy-image')) return;

                try {
                  realSrc = new URL(realSrc, window.location.origin).href;
                } catch {}

                // 转为代理 URL
                img.setAttribute('src', `/api/proxy-image?url=${encodeURIComponent(realSrc)}`);

                // ✅ 移除固定宽高（让图片自适应）
                img.removeAttribute('width');
                img.removeAttribute('height');
                img.removeAttribute('srcset');
                img.removeAttribute('data-src');
                img.removeAttribute('data-original');

                // ✅ 设置默认居中对齐
                img.setAttribute('data-align', 'center');
              });

              return doc.body.innerHTML;
            } catch {
              return html;
            }
          },
        },
      }),
    ];
  },
});

// ============================================================
// 组件
// ============================================================
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '开始编写...',
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imageUrlPopoverOpen, setImageUrlPopoverOpen] = useState(false);
  const [videoPopoverOpen, setVideoPopoverOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [imageAlignToolbar, setImageAlignToolbar] = useState<{ top: number; left: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    node: any;
    pos: number;
    size: { width: number; height: number };
    originalSize: { width: number; height: number };
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const [imageAlign, setImageAlign] = useState<string>('center');
  const [imageUrl, setImageUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoWidth, setVideoWidth] = useState(560);
  const [videoHeight, setVideoHeight] = useState(315);
  const [tableMenuOpen, setTableMenuOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const imageUrlButtonRef = useRef<HTMLButtonElement>(null);
  const headingButtonRef = useRef<HTMLButtonElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const tableButtonRef = useRef<HTMLButtonElement>(null);
  const isInternalChange = useRef(false);

  const { showToast } = useToast();

  // ============================================================
  // 计算图片相对父容器的坐标
  // ============================================================
  const computeImageRect = useCallback((imgEl: HTMLImageElement) => {
    const parentEl = editorRef.current;
    if (!parentEl) return null;

    const parentRect = parentEl.getBoundingClientRect();
    const parentStyle = window.getComputedStyle(parentEl);

    const paddingLeft = parseFloat(parentStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(parentStyle.paddingTop) || 0;
    const borderLeft = parseFloat(parentStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(parentStyle.borderTopWidth) || 0;

    const imgRect = imgEl.getBoundingClientRect();

    return {
      left: imgRect.left - parentRect.left - paddingLeft - borderLeft + parentEl.scrollLeft,
      top: imgRect.top - parentRect.top - paddingTop - borderTop + parentEl.scrollTop,
      width: imgRect.width,
      height: imgRect.height,
    };
  }, []);

  // ============================================================
  // 扩展配置
  // ============================================================
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'text-blue-600 underline',
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'resizable-image',
          referrerPolicy: 'no-referrer',
        },
      }),
      Youtube.configure({
        width: videoWidth,
        height: videoHeight,
        controls: true,
        nocookie: true,
        allowFullscreen: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: { class: 'rounded bg-gray-100 p-2' },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      // ✅ 表格（Tiptap v3 用 TableKit 统一整合）
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: 'tiptap-table',
          },
        },
      }),
      // ✅ 自定义扩展
      CleanPaste,
      PasteImage,
      RemoteImageProxy,
    ],
    [videoWidth, videoHeight, placeholder]
  );

  // ============================================================
  // 编辑器
  // ============================================================
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
      isInternalChange.current = false;
    },
    onSelectionUpdate: ({ editor }) => {
      const { from } = editor.state.selection;
      const node = editor.state.doc.nodeAt(from);

      if (node && node.type.name === 'image') {
        const pos = from;
        const width = node.attrs.width;
        const height = node.attrs.height;

        const domNode = editor.view.nodeDOM(pos) as HTMLElement;
        if (!domNode || domNode.tagName !== 'IMG') {
          setSelectedImage(null);
          setImageAlignToolbar(null);
          return;
        }

        const img = domNode as HTMLImageElement;

        // ✅ 用统一的坐标计算函数
        const relativeRect = computeImageRect(img);
        if (!relativeRect) return;

        const displayWidth = width || Math.round(relativeRect.width) || 300;
        const displayHeight = height || Math.round(relativeRect.height) || 200;

        setSelectedImage({
          node,
          pos,
          size: { width: displayWidth, height: displayHeight },
          originalSize: { width: displayWidth, height: displayHeight },
          rect: relativeRect,
        });

        setImageAlignToolbar({
          top: relativeRect.top - 50,
          left: relativeRect.left,
        });
        setImageAlign(node.attrs['data-align'] || 'center');
      } else {
        setSelectedImage(null);
        setImageAlignToolbar(null);
        setImageAlign('center');
      }
    },
  });

  // 外部 value 同步
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) return;
    if (value === editor.getHTML()) return;

    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  // ============================================================
  // 滚动 / 窗口变化时重新计算图片位置
  // ============================================================
  useEffect(() => {
    if (!selectedImage) return;

    const handleScrollOrResize = () => {
      const editorEl = editorRef.current;
      if (!editorEl) return;

      const imgEl = editorEl.querySelector('img.ProseMirror-selectednode') as HTMLImageElement | null;
      if (!imgEl) return;

      const newRect = computeImageRect(imgEl);
      if (!newRect) return;

      setSelectedImage((prev) => (prev ? { ...prev, rect: newRect } : null));
      setImageAlignToolbar({
        top: newRect.top - 50,
        left: newRect.left,
      });
    };

    const editorEl = editorRef.current;
    editorEl?.addEventListener('scroll', handleScrollOrResize);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      editorEl?.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [selectedImage?.pos, computeImageRect]);

  // ============================================================
  // Hooks
  // ============================================================
  const image = useImageUpload({ editor });
  const heading = useHeadingDropdownMenu({ editor });
  const bulletList = useList({ editor, type: 'bulletList' });
  const orderedList = useList({ editor, type: 'orderedList' });
  const taskList = useList({ editor, type: 'taskList' });
  const link = useLinkPopover({ editor });

  useHotkeys('mod+shift+i', () => image.handleImage());
  useHotkeys('mod+alt+1', () => editor?.chain().focus().toggleHeading({ level: 1 }).run());
  useHotkeys('mod+alt+2', () => editor?.chain().focus().toggleHeading({ level: 2 }).run());
  useHotkeys('mod+alt+3', () => editor?.chain().focus().toggleHeading({ level: 3 }).run());
  useHotkeys('mod+alt+4', () => editor?.chain().focus().toggleHeading({ level: 4 }).run());
  useHotkeys('mod+alt+5', () => editor?.chain().focus().toggleHeading({ level: 5 }).run());
  useHotkeys('mod+alt+6', () => editor?.chain().focus().toggleHeading({ level: 6 }).run());
  useHotkeys('mod+shift+8', () => bulletList.handleToggle());
  useHotkeys('mod+shift+7', () => orderedList.handleToggle());
  useHotkeys('mod+shift+9', () => taskList.handleToggle());

  // ============================================================
  // 点击外部关闭菜单
  // ============================================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headingButtonRef.current && !headingButtonRef.current.contains(target) &&
          !(headingMenuOpen && document.querySelector('.heading-dropdown')?.contains(target))) {
        setHeadingMenuOpen(false);
      }
      if (listButtonRef.current && !listButtonRef.current.contains(target) &&
          !(listMenuOpen && document.querySelector('.list-dropdown')?.contains(target))) {
        setListMenuOpen(false);
      }
      if (linkButtonRef.current && !linkButtonRef.current.contains(target) &&
          !(linkPopoverOpen && document.querySelector('.link-popover')?.contains(target))) {
        setLinkPopoverOpen(false);
      }
      if (imageUrlButtonRef.current && !imageUrlButtonRef.current.contains(target) &&
          !(imageUrlPopoverOpen && document.querySelector('.image-url-popover')?.contains(target))) {
        setImageUrlPopoverOpen(false);
      }
      if (!(videoPopoverOpen && document.querySelector('.video-popover')?.contains(target))) {
        setVideoPopoverOpen(false);
      }
      if (tableButtonRef.current && !tableButtonRef.current.contains(target) &&
          !(tableMenuOpen && document.querySelector('.table-dropdown')?.contains(target))) {
        setTableMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [headingMenuOpen, listMenuOpen, linkPopoverOpen, imageUrlPopoverOpen, videoPopoverOpen, tableMenuOpen]);

  // ============================================================
  // 全屏 Esc
  // ============================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ============================================================
  // 图片操作
  // ============================================================
  const setImageAlignment = (align: 'left' | 'center' | 'right') => {
    if (!editor || !selectedImage) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', { 'data-align': align })
      .run();
    setImageAlign(align);
  };

  const updateImageSize = (width: number, height: number) => {
    if (!editor || !selectedImage) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', { width, height })
      .run();
    setSelectedImage((prev) =>
      prev ? { ...prev, size: { width, height } } : null
    );
  };

  const resetImageSize = () => {
    if (!editor || !selectedImage) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(selectedImage.pos)
      .updateAttributes('image', { width: null, height: null })
      .run();
    setSelectedImage(null);
  };

  const openFullscreen = () => setIsFullscreen(true);
  const closeFullscreen = () => setIsFullscreen(false);

  // ============================================================
  // 本地上传
  // ============================================================
  const handleLocalImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/images', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          const fullUrl = getImageUrl(data.url);
          const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
          editor?.chain().focus().setImage({ src: proxiedUrl, 'data-align': 'center' } as any).run();
        } else {
          showToast('上传失败', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('上传失败', 'error');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // ============================================================
  // 网络图片
  // ============================================================
  const insertImageByUrl = async () => {
    if (!imageUrl || !editor) return;
    let fullUrl = imageUrl;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = getImageUrl(fullUrl);
    }
    try {
      const res = await fetch(fullUrl, { method: 'HEAD' });
      if (!res.ok) {
        showToast('图片地址无效', 'error');
        return;
      }
    } catch {
      showToast('图片地址无效或无法访问', 'error');
      return;
    }
    const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
    editor.chain().focus().setImage({ src: proxiedUrl, 'data-align': 'center' } as any).run();
    setImageUrl('');
    setImageUrlPopoverOpen(false);
  };

  // ============================================================
  // 视频插入
  // ============================================================
  const insertVideoByUrl = () => {
    if (!videoUrl) return;

    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeMatch) {
      editor?.chain().focus().setYoutubeVideo({
        src: videoUrl,
        width: videoWidth,
        height: videoHeight,
      }).run();
      setVideoUrl('');
      setVideoPopoverOpen(false);
      return;
    }

    const platforms: Array<{
      pattern: RegExp;
      embed: (url: string, width: number, height: number) => string;
    }> = [
      {
        pattern: /vimeo\.com\/(\d+)/,
        embed: (url, width, height) => {
          const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
        },
      },
      {
        pattern: /bilibili\.com\/video\/(BV[\w]+)/,
        embed: (url, width, height) => {
          const id = url.match(/bilibili\.com\/video\/(BV[\w]+)/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://player.bilibili.com/player.html?bvid=${id}&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`;
        },
      },
      {
        pattern: /v\.qq\.com\/x\/page\/(\w+)\.html/,
        embed: (url, width, height) => {
          const id = url.match(/v\.qq\.com\/x\/page\/(\w+)\.html/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://v.qq.com/txp/iframe/player.html?vid=${id}" frameborder="0" allowfullscreen></iframe>`;
        },
      },
      {
        pattern: /youku\.com\/v_show\/id_([\w=]+)\.html/,
        embed: (url, width, height) => {
          const id = url.match(/youku\.com\/v_show\/id_([\w=]+)\.html/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://player.youku.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
        },
      },
    ];

    let embedHtml = '';
    for (const p of platforms) {
      if (p.pattern.test(videoUrl)) {
        embedHtml = p.embed(videoUrl, videoWidth, videoHeight);
        break;
      }
    }

    if (!embedHtml) {
      const customCode = prompt('未识别该视频 URL，请手动输入嵌入代码（如 iframe）：');
      if (customCode) embedHtml = customCode;
    }

    if (embedHtml && editor) {
      editor.chain().focus().insertContent(embedHtml).run();
      setVideoUrl('');
      setVideoPopoverOpen(false);
    } else {
      showToast('无法插入视频，请检查 URL 或手动输入嵌入代码', 'error');
    }
  };

  // ============================================================
  // 列表
  // ============================================================
  const handleListToggle = (listType: 'bullet' | 'ordered' | 'task') => {
    if (listType === 'bullet') bulletList.handleToggle();
    else if (listType === 'ordered') orderedList.handleToggle();
    else if (listType === 'task') taskList.handleToggle();
    editor?.commands.focus();
  };

  const openLinkPopover = () => {
    editor?.commands.focus();
    setLinkPopoverOpen(true);
  };

  const getLinkPopoverStyle = () => {
    if (!linkButtonRef.current) return { left: 0 };
    const rect = linkButtonRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const popoverWidth = 256;
    const rightSpace = windowWidth - rect.right;
    if (rightSpace >= popoverWidth) return { left: rect.left };
    return { left: rect.right - popoverWidth };
  };

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  // ✅ 标题文案（包含"正文"）
  const getActiveHeadingText = () => {
    if (heading.activeLevel === 1) return '标题1';
    if (heading.activeLevel === 2) return '标题2';
    if (heading.activeLevel === 3) return '标题3';
    if (heading.activeLevel === 4) return '标题4';
    if (heading.activeLevel === 5) return '标题5';
    if (heading.activeLevel === 6) return '标题6';
    return '正文';
  };

  const getActiveListIcon = () => {
    if (bulletList.isActive) return <List size={18} />;
    if (orderedList.isActive) return <ListOrdered size={18} />;
    if (taskList.isActive) return <List size={18} />;
    return <List size={18} />;
  };

  const getActiveListText = () => {
    if (bulletList.isActive) return '无序列表';
    if (orderedList.isActive) return '有序列表';
    if (taskList.isActive) return '任务列表';
    return '列表';
  };

  // ============================================================
  // 工具栏
  // ============================================================
  const renderToolbar = (fullscreenMode = false) => (
    <div
      className={`flex flex-wrap gap-1 p-2 border-b bg-gray-50 sticky top-0 z-10 ${
        fullscreenMode ? 'shadow-sm' : ''
      }`}
    >
      {/* 撤销/重做 */}
      <button type="button" onClick={() => editor?.chain().focus().undo().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="撤销">
        <Undo size={18} />
      </button>
      <button type="button" onClick={() => editor?.chain().focus().redo().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="重做">
        <Redo size={18} />
      </button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 标题（含正文 + H1-H6） */}
      <div className="relative">
        <button
          type="button"
          ref={headingButtonRef}
          onClick={() => setHeadingMenuOpen(!headingMenuOpen)}
          className={`bg-gray-100 hover:bg-gray-200 p-2 rounded flex items-center gap-1 ${
            heading.isActive ? 'bg-primary-100 text-primary-800' : ''
          }`}
        >
          <Heading size={18} />
          <span>{getActiveHeadingText()}</span>
          <ChevronDown size={14} />
        </button>
        {headingMenuOpen && (
          <div className="absolute left-0 mt-1 w-32 bg-white border rounded shadow-lg z-20 heading-dropdown">
            {/* ✅ 正文 */}
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().setParagraph().run();
                setHeadingMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${
                !heading.isActive ? 'bg-primary-50 text-primary-700' : ''
              }`}
            >
              正文
            </button>

            {/* ✅ H1-H6 */}
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                    .run();
                  setHeadingMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${
                  heading.activeLevel === level ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                标题{level}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="relative">
        <button
          type="button"
          ref={listButtonRef}
          onClick={() => setListMenuOpen(!listMenuOpen)}
          className={`bg-gray-100 hover:bg-gray-200 p-2 rounded flex items-center gap-1 ${
            bulletList.isActive || orderedList.isActive || taskList.isActive
              ? 'bg-primary-100 text-primary-800'
              : ''
          }`}
        >
          {getActiveListIcon()}
          <span>{getActiveListText()}</span>
          <ChevronDown size={14} />
        </button>
        {listMenuOpen && (
          <div className="absolute left-0 mt-1 w-40 bg-white border rounded shadow-lg z-20 list-dropdown">
            <button type="button" onClick={() => { handleListToggle('bullet'); setListMenuOpen(false); }} className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${bulletList.isActive ? 'bg-primary-50 text-primary-700' : ''}`}>
              <List size={18} /><span>无序列表</span>
            </button>
            <button type="button" onClick={() => { handleListToggle('ordered'); setListMenuOpen(false); }} className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${orderedList.isActive ? 'bg-primary-50 text-primary-700' : ''}`}>
              <ListOrdered size={18} /><span>有序列表</span>
            </button>
            <button type="button" onClick={() => { handleListToggle('task'); setListMenuOpen(false); }} className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${taskList.isActive ? 'bg-primary-50 text-primary-700' : ''}`}>
              <CheckSquare size={18} /><span>任务列表</span>
            </button>
          </div>
        )}
      </div>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 基础格式 */}
      <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={buttonClass(editor?.isActive('bold') || false)} title="加粗"><Bold size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={buttonClass(editor?.isActive('italic') || false)} title="斜体"><Italic size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={buttonClass(editor?.isActive('underline') || false)} title="下划线"><UnderlineIcon size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={buttonClass(editor?.isActive('strike') || false)} title="删除线"><Strikethrough size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 对齐 */}
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={buttonClass(editor?.isActive({ textAlign: 'left' }) || false)} title="左对齐"><AlignLeft size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={buttonClass(editor?.isActive({ textAlign: 'center' }) || false)} title="居中"><AlignCenter size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={buttonClass(editor?.isActive({ textAlign: 'right' }) || false)} title="右对齐"><AlignRight size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={buttonClass(editor?.isActive({ textAlign: 'justify' }) || false)} title="两端对齐"><AlignJustify size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 引用/代码 */}
      <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={buttonClass(editor?.isActive('blockquote') || false)} title="引用"><Quote size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={buttonClass(editor?.isActive('codeBlock') || false)} title="代码块"><Code size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 表格 */}
      <div className="relative">
        <button
          type="button"
          ref={tableButtonRef}
          onClick={() => setTableMenuOpen(!tableMenuOpen)}
          className={buttonClass(editor?.isActive('table') || false)}
          title="表格"
        >
          <TableIcon size={18} />
        </button>
        {tableMenuOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-white border rounded shadow-lg z-20 table-dropdown">
            <div className="px-3 py-2 text-xs text-gray-500 border-b">插入表格</div>
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                setTableMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <TableIcon size={14} />
              <span>3 × 3 表格</span>
            </button>

            {editor?.isActive('table') && (
              <>
                <div className="border-t my-1" />
                <div className="px-3 py-2 text-xs text-gray-500">行列操作</div>
                <button type="button" onClick={() => { editor.chain().focus().addColumnBefore().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2">
                  <Columns size={14} /><span>左侧插入列</span>
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addColumnAfter().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2">
                  <Columns size={14} /><span>右侧插入列</span>
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addRowBefore().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2">
                  <Rows size={14} /><span>上方插入行</span>
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addRowAfter().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center gap-2">
                  <Rows size={14} /><span>下方插入行</span>
                </button>
                <div className="border-t my-1" />
                <button type="button" onClick={() => { editor.chain().focus().deleteColumn().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2">
                  <Trash2 size={14} /><span>删除当前列</span>
                </button>
                <button type="button" onClick={() => { editor.chain().focus().deleteRow().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2">
                  <Trash2 size={14} /><span>删除当前行</span>
                </button>
                <button type="button" onClick={() => { editor.chain().focus().deleteTable().run(); setTableMenuOpen(false); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2">
                  <Trash2 size={14} /><span>删除整个表格</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 链接 */}
      {link.isVisible && (
        <div className="relative">
          <button type="button" ref={linkButtonRef} onClick={openLinkPopover} className={buttonClass(link.isActive)} disabled={!link.canSet} title="添加链接">
            <LinkIcon size={18} />
          </button>
          {linkPopoverOpen && (
            <div className="fixed mt-1 w-64 bg-white border rounded shadow-lg z-20 link-popover" style={{ ...getLinkPopoverStyle(), top: (linkButtonRef.current?.getBoundingClientRect().bottom || 0) + 4 }}>
              <input
                type="url"
                value={link.url || ''}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val && !val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;
                  link.setUrl(val);
                }}
                placeholder="输入链接 URL"
                className="w-full border rounded p-1 text-sm mb-2"
                onKeyDown={(e) => e.key === 'Enter' && link.setLink()}
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => { link.setLink(); setLinkPopoverOpen(false); }} className="bg-primary-600 text-white px-2 py-1 rounded text-sm">应用</button>
                <button type="button" onClick={link.removeLink} className="bg-gray-200 px-2 py-1 rounded text-sm">移除</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 上传图片 */}
      <button type="button" onClick={handleLocalImageUpload} disabled={uploading} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="上传图片">
        <Upload size={18} />
      </button>

      {/* 图片 URL */}
      <div className="relative">
        <button type="button" ref={imageUrlButtonRef} onClick={() => setImageUrlPopoverOpen(!imageUrlPopoverOpen)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="图片URL">
          <ImageIcon size={18} />
        </button>
        {imageUrlPopoverOpen && (
          <div className="absolute left-0 mt-1 w-64 bg-white border rounded shadow-lg z-20 image-url-popover">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="输入图片 URL"
              className="w-full border rounded p-1 text-sm mb-2"
              onKeyDown={(e) => e.key === 'Enter' && insertImageByUrl()}
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={insertImageByUrl} className="bg-primary-600 text-white px-2 py-1 rounded text-sm">插入</button>
              <button type="button" onClick={() => setImageUrlPopoverOpen(false)} className="bg-gray-200 px-2 py-1 rounded text-sm">取消</button>
            </div>
          </div>
        )}
      </div>

      {/* 视频 */}
      <div className="relative">
        <button type="button" onClick={() => setVideoPopoverOpen(!videoPopoverOpen)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="插入视频">
          <Video size={18} />
        </button>
        {videoPopoverOpen && (
          <div className="absolute left-0 mt-1 w-64 bg-white border rounded shadow-lg z-20 video-popover">
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="输入 YouTube/Vimeo 视频 URL"
              className="w-full border rounded p-1 text-sm mb-2"
              onKeyDown={(e) => e.key === 'Enter' && insertVideoByUrl()}
              autoFocus
            />
            <div className="flex gap-2 mb-2">
              <input type="number" value={videoWidth} onChange={(e) => setVideoWidth(parseInt(e.target.value) || 560)} placeholder="宽度" className="w-1/2 border rounded p-1 text-sm" />
              <input type="number" value={videoHeight} onChange={(e) => setVideoHeight(parseInt(e.target.value) || 315)} placeholder="高度" className="w-1/2 border rounded p-1 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={insertVideoByUrl} className="bg-primary-600 text-white px-2 py-1 rounded text-sm">插入</button>
              <button type="button" onClick={() => setVideoPopoverOpen(false)} className="bg-gray-200 px-2 py-1 rounded text-sm">取消</button>
            </div>
          </div>
        )}
      </div>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {/* 分割线/清除格式 */}
      <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="分割线"><Minus size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="清除格式"><Eraser size={18} /></button>

      {/* 全屏 */}
      {!fullscreenMode && (
        <button type="button" onClick={openFullscreen} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="全屏">
          <Maximize2 size={18} />
        </button>
      )}
      {fullscreenMode && (
        <button type="button" onClick={closeFullscreen} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="退出全屏">
          <Minimize2 size={18} />
        </button>
      )}
    </div>
  );

  if (!editor) return null;

  // ============================================================
  // 编辑器内容
  // ============================================================
  const editorContent = (
    <>
      {renderToolbar(isFullscreen)}
      <div
        ref={editorRef}
        className={`flex-1 overflow-auto p-4 relative ${
          isFullscreen ? 'bg-gray-100' : ''
        }`}
      >
        {/* ✅ 全屏时模拟真实页面宽度（所见即所得） */}
        <div
          className={
            isFullscreen
              ? 'max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 min-h-full'
              : ''
          }
        >
          <EditorContent
            editor={editor}
            className="
              prose max-w-none focus:outline-none
              [&_.ProseMirror]:p-0
              [&_.ProseMirror]:outline-none
              [&_.ProseMirror>*:first-child]:mt-0
              [&_.ProseMirror>*:last-child]:mb-0
              [&_.ProseMirror_img]:max-w-full
              [&_.ProseMirror_img]:h-auto
              [&_.ProseMirror_img]:rounded
              [&_.ProseMirror_img]:cursor-pointer
              [&_.ProseMirror_img.ProseMirror-selectednode]:ring-2
              [&_.ProseMirror_img.ProseMirror-selectednode]:ring-blue-500
              [&_.ProseMirror_table]:border-collapse
              [&_.ProseMirror_table]:w-full
              [&_.ProseMirror_table]:my-4
              [&_.ProseMirror_th]:border
              [&_.ProseMirror_th]:border-gray-300
              [&_.ProseMirror_th]:bg-gray-50
              [&_.ProseMirror_th]:p-2
              [&_.ProseMirror_th]:text-left
              [&_.ProseMirror_th]:font-semibold
              [&_.ProseMirror_td]:border
              [&_.ProseMirror_td]:border-gray-300
              [&_.ProseMirror_td]:p-2
              [&_.ProseMirror_td]:align-top
              [&_.ProseMirror_.selectedCell]:bg-blue-50
              [&_.ProseMirror_.column-resize-handle]:bg-blue-500
              [&_.ProseMirror_.column-resize-handle]:w-0.5
            "
          />
        </div>

        {/* 图片对齐工具栏 */}
        {imageAlignToolbar && selectedImage && (
          <div
            className="absolute bg-white border rounded shadow-lg z-20 flex gap-1 p-1"
            style={{ top: imageAlignToolbar.top, left: imageAlignToolbar.left }}
          >
            <button
              type="button"
              onClick={() => setImageAlignment('left')}
              className={`p-1 rounded ${imageAlign === 'left' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              title="左对齐"
            >
              <AlignLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setImageAlignment('center')}
              className={`p-1 rounded ${imageAlign === 'center' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              title="居中"
            >
              <AlignCenter size={16} />
            </button>
            <button
              type="button"
              onClick={() => setImageAlignment('right')}
              className={`p-1 rounded ${imageAlign === 'right' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
              title="右对齐"
            >
              <AlignRight size={16} />
            </button>
            <div className="w-px bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={resetImageSize}
              className="p-1 rounded hover:bg-gray-100 text-xs"
              title="恢复原始大小"
            >
              重置
            </button>
          </div>
        )}

        {/* 图片尺寸调整 */}
        {selectedImage && (
          <div className="absolute inset-0 pointer-events-none">
            <Rnd
              position={{
                x: selectedImage.rect.left,
                y: selectedImage.rect.top,
              }}
              size={{
                width: selectedImage.size.width,
                height: selectedImage.size.height,
              }}
              onResizeStop={(e, direction, ref) => {
                const newWidth = parseInt(ref.style.width);
                const newHeight = parseInt(ref.style.height);
                updateImageSize(newWidth, newHeight);
              }}
              enableResizing={{
                top: false,
                right: true,
                bottom: true,
                left: false,
                topRight: false,
                bottomRight: true,
                bottomLeft: false,
                topLeft: false,
              }}
              disableDragging
              bounds="parent"
              style={{
                position: 'absolute',
                pointerEvents: 'none',
                border: '2px solid #3b82f6',
                borderRadius: '4px',
              }}
              resizeHandleStyles={{
                bottomRight: {
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  bottom: '-8px',
                  right: '-8px',
                  cursor: 'se-resize',
                  zIndex: 20,
                  pointerEvents: 'auto',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                },
                right: {
                  width: '8px',
                  height: '40px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  right: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'e-resize',
                  zIndex: 20,
                  pointerEvents: 'auto',
                },
                bottom: {
                  width: '40px',
                  height: '8px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '4px',
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  cursor: 's-resize',
                  zIndex: 20,
                  pointerEvents: 'auto',
                },
              }}
            />
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {!isFullscreen && (
        <div className="border rounded overflow-hidden bg-white h-[600px] flex flex-col">
          {editorContent}
        </div>
      )}

      {isFullscreen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {editorContent}
        </div>
      )}
    </>
  );
}