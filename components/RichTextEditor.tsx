'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { common, createLowlight } from 'lowlight';
import { useHotkeys } from 'react-hotkeys-hook';
import { Rnd } from 'react-rnd';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Quote,
  Code,
  Minus,
  Eraser,
  Undo,
  Redo,
  ChevronDown,
  Video,
  Heading,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  ImageIcon,
  Upload,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useHeadingDropdownMenu } from '@/hooks/useHeadingDropdownMenu';
import { useList } from '@/hooks/useList';
import { useLinkPopover } from '@/hooks/useLinkPopover';
import { useToast } from '@/contexts/ToastContext';
import { getImageUrl } from '@/lib/files/url'; // 导入公共函数

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = '开始编写...' }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [headingMenuOpen, setHeadingMenuOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [imageUrlPopoverOpen, setImageUrlPopoverOpen] = useState(false);
  const [videoPopoverOpen, setVideoPopoverOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [imageAlignToolbar, setImageAlignToolbar] = useState<{ top: number; left: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ node: any; pos: number; size: { width: number; height: number } } | null>(null);
  const [imageAlign, setImageAlign] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoWidth, setVideoWidth] = useState(560);
  const [videoHeight, setVideoHeight] = useState(315);

  const editorRef = useRef<HTMLDivElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const imageUrlButtonRef = useRef<HTMLButtonElement>(null);
  const headingButtonRef = useRef<HTMLButtonElement>(null);
  const listButtonRef = useRef<HTMLButtonElement>(null);

  const { showToast } = useToast();

  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer', class: 'text-blue-600 underline' },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'resizable-image',
        referrerPolicy: 'no-referrer',
        crossOrigin: 'anonymous',
      },
    }),
    Youtube.configure({
      width: videoWidth,
      height: videoHeight,
      controls: true,
      nocookie: true,
      allowFullscreen: true,
    }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'javascript', HTMLAttributes: { class: 'rounded bg-gray-100 p-2' } }),
    Placeholder.configure({ placeholder }),
    TaskList,
    TaskItem.configure({ nested: true }),
  ], [videoWidth, videoHeight]);

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: ({ editor }) => {
      const { from } = editor.state.selection;
      const node = editor.state.doc.nodeAt(from);
      if (node && node.type.name === 'image') {
        const pos = from;
        const width = node.attrs.width || 300;
        const height = node.attrs.height || 200;
        setSelectedImage({ node, pos, size: { width, height } });
        const coords = editor.view.coordsAtPos(pos);
        const rect = editor.view.dom.getBoundingClientRect();
        const top = coords.top - rect.top + editor.view.dom.scrollTop - 40;
        const left = coords.left - rect.left;
        setImageAlignToolbar({ top, left });
        setImageAlign(node.attrs['data-align'] || '');
      } else {
        setSelectedImage(null);
        setImageAlignToolbar(null);
        setImageAlign('');
      }
    },
  });
  
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);


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
  useHotkeys('mod+shift+8', () => bulletList.handleToggle());
  useHotkeys('mod+shift+7', () => orderedList.handleToggle());
  useHotkeys('mod+shift+9', () => taskList.handleToggle());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (headingButtonRef.current && !headingButtonRef.current.contains(target) && !(headingMenuOpen && document.querySelector('.heading-dropdown')?.contains(target))) {
        setHeadingMenuOpen(false);
      }
      if (listButtonRef.current && !listButtonRef.current.contains(target) && !(listMenuOpen && document.querySelector('.list-dropdown')?.contains(target))) {
        setListMenuOpen(false);
      }
      if (linkButtonRef.current && !linkButtonRef.current.contains(target) && !(linkPopoverOpen && document.querySelector('.link-popover')?.contains(target))) {
        setLinkPopoverOpen(false);
      }
      if (imageUrlButtonRef.current && !imageUrlButtonRef.current.contains(target) && !(imageUrlPopoverOpen && document.querySelector('.image-url-popover')?.contains(target))) {
        setImageUrlPopoverOpen(false);
      }
      if (!(videoPopoverOpen && document.querySelector('.video-popover')?.contains(target))) {
        setVideoPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [headingMenuOpen, listMenuOpen, linkPopoverOpen, imageUrlPopoverOpen, videoPopoverOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
    setSelectedImage(prev => prev ? { ...prev, size: { width, height } } : null);
  };

  const openFullscreen = () => setIsFullscreen(true);
  const closeFullscreen = () => setIsFullscreen(false);

  // 本地上传：使用统一接口 /api/images，返回相对路径，再包装代理
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
        // 1. 将相对路径转换为完整 R2 URL
        const fullUrl = getImageUrl(data.url);
        // 2. 包装成代理 URL（同源，避免 CORS）
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
        editor?.chain().focus().setImage({ src: proxiedUrl }).run();
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

  // 网络图片插入：用户输入的 URL 可能是完整 URL 或相对路径，统一转为完整 URL 后包装代理
 const insertImageByUrl = async () => {
  if (!imageUrl || !editor) return;
  // 用户输入的 URL 可能是相对路径（比如已有图片的相对地址）或完整 URL
  let fullUrl = imageUrl;
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = getImageUrl(fullUrl);
  }
  // 可选的跨域检查（仅提示，不影响插入）
  try {
    const res = await fetch(fullUrl, { method: 'HEAD' });
    if (!res.ok) {
      showToast('图片地址无效', 'error');
      return;
    }
  } catch (err) {
    showToast('图片地址无效或无法访问', 'error');
    return;
  }
  // 包装代理 URL 后插入
  const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  editor.chain().focus().setImage({ src: proxiedUrl }).run();
  setImageUrl('');
  setImageUrlPopoverOpen(false);
};

  const insertVideoByUrl = () => {
    // 视频处理保持不变
    if (!videoUrl) return;

    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeMatch) {
      editor?.chain().focus().setYoutubeVideo({ src: videoUrl, width: videoWidth, height: videoHeight }).run();
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
        embed: (url: string, width: number, height: number) => {
          const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
        },
      },
      {
        pattern: /bilibili\.com\/video\/(BV[\w]+)/,
        embed: (url: string, width: number, height: number) => {
          const id = url.match(/bilibili\.com\/video\/(BV[\w]+)/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://player.bilibili.com/player.html?bvid=${id}&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`;
        },
      },
      {
        pattern: /v\.qq\.com\/x\/page\/(\w+)\.html/,
        embed: (url: string, width: number, height: number) => {
          const id = url.match(/v\.qq\.com\/x\/page\/(\w+)\.html/)?.[1];
          return `<iframe width="${width}" height="${height}" src="https://v.qq.com/txp/iframe/player.html?vid=${id}" frameborder="0" allowfullscreen></iframe>`;
        },
      },
      {
        pattern: /youku\.com\/v_show\/id_([\w=]+)\.html/,
        embed: (url: string, width: number, height: number) => {
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
    if (rightSpace >= popoverWidth) {
      return { left: rect.left };
    } else {
      return { left: rect.right - popoverWidth };
    }
  };

  const buttonClass = (isActive: boolean) =>
    `p-2 rounded-md text-sm transition-colors ${
      isActive ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  const getActiveHeadingText = () => {
    if (heading.activeLevel === 1) return '标题1';
    if (heading.activeLevel === 2) return '标题2';
    if (heading.activeLevel === 3) return '标题3';
    if (heading.activeLevel === 4) return '标题4';
    return '标题';
  };

  const getActiveListIcon = () => {
    if (bulletList.isActive) return <List size={18} />;
    if (orderedList.isActive) return <ListOrdered size={18} />;
    if (taskList.isActive) return <CheckSquare size={18} />;
    return <List size={18} />;
  };

  const getActiveListText = () => {
    if (bulletList.isActive) return '无序列表';
    if (orderedList.isActive) return '有序列表';
    if (taskList.isActive) return '任务列表';
    return '列表';
  };

  const renderToolbar = (fullscreenMode = false) => (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 sticky top-0 z-10">
      {/* 原有工具栏代码保持不变，仅需确保 handleLocalImageUpload 和 insertImageByUrl 已更新 */}
      <button type="button" onClick={() => editor?.chain().focus().undo().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="撤销">
        <Undo size={18} />
      </button>
      <button type="button" onClick={() => editor?.chain().focus().redo().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="重做">
        <Redo size={18} />
      </button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      <div className="relative">
        <button
          type="button"
          ref={headingButtonRef}
          onClick={() => setHeadingMenuOpen(!headingMenuOpen)}
          className={`bg-gray-100 hover:bg-gray-200 p-2 rounded flex items-center gap-1 ${heading.isActive ? 'bg-primary-100 text-primary-800' : ''}`}
        >
          <Heading size={18} />
          <span>{getActiveHeadingText()}</span>
          <ChevronDown size={14} />
        </button>
        {headingMenuOpen && (
          <div className="absolute left-0 mt-1 w-32 bg-white border rounded shadow-lg z-20 heading-dropdown">
            {heading.levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  editor?.chain().focus().toggleHeading({ level }).run();
                  setHeadingMenuOpen(false);
                }}
                className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 ${heading.activeLevel === level ? 'bg-primary-50 text-primary-700' : ''}`}
              >
                标题{level}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          ref={listButtonRef}
          onClick={() => setListMenuOpen(!listMenuOpen)}
          className={`bg-gray-100 hover:bg-gray-200 p-2 rounded flex items-center gap-1 ${
            bulletList.isActive || orderedList.isActive || taskList.isActive ? 'bg-primary-100 text-primary-800' : ''
          }`}
        >
          {getActiveListIcon()}
          <span>{getActiveListText()}</span>
          <ChevronDown size={14} />
        </button>
        {listMenuOpen && (
          <div className="absolute left-0 mt-1 w-40 bg-white border rounded shadow-lg z-20 list-dropdown">
            <button
              type="button"
              onClick={() => { handleListToggle('bullet'); setListMenuOpen(false); }}
              className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                bulletList.isActive ? 'bg-primary-50 text-primary-700' : ''
              }`}
            >
              <List size={18} />
              <span>无序列表</span>
            </button>
            <button
              type="button"
              onClick={() => { handleListToggle('ordered'); setListMenuOpen(false); }}
              className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                orderedList.isActive ? 'bg-primary-50 text-primary-700' : ''
              }`}
            >
              <ListOrdered size={18} />
              <span>有序列表</span>
            </button>
            <button
              type="button"
              onClick={() => { handleListToggle('task'); setListMenuOpen(false); }}
              className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                taskList.isActive ? 'bg-primary-50 text-primary-700' : ''
              }`}
            >
              <CheckSquare size={18} />
              <span>任务列表</span>
            </button>
          </div>
        )}
      </div>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={buttonClass(editor?.isActive('bold') || false)} title="加粗"><Bold size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={buttonClass(editor?.isActive('italic') || false)} title="斜体"><Italic size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className={buttonClass(editor?.isActive('underline') || false)} title="下划线"><UnderlineIcon size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className={buttonClass(editor?.isActive('strike') || false)} title="删除线"><Strikethrough size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('left').run()} className={buttonClass(editor?.isActive({ textAlign: 'left' }) || false)} title="左对齐"><AlignLeft size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('center').run()} className={buttonClass(editor?.isActive({ textAlign: 'center' }) || false)} title="居中"><AlignCenter size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('right').run()} className={buttonClass(editor?.isActive({ textAlign: 'right' }) || false)} title="右对齐"><AlignRight size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().setTextAlign('justify').run()} className={buttonClass(editor?.isActive({ textAlign: 'justify' }) || false)} title="两端对齐"><AlignJustify size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={buttonClass(editor?.isActive('blockquote') || false)} title="引用"><Quote size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={buttonClass(editor?.isActive('codeBlock') || false)} title="代码块"><Code size={18} /></button>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      {link.isVisible && (
        <div className="relative">
          <button
            type="button"
            ref={linkButtonRef}
            onClick={openLinkPopover}
            className={buttonClass(link.isActive)}
            disabled={!link.canSet}
            title="添加链接"
          >
            <LinkIcon size={18} />
          </button>
          {linkPopoverOpen && (
            <div
              className="fixed mt-1 w-64 bg-white border rounded shadow-lg z-20 link-popover"
              style={{ ...getLinkPopoverStyle(), top: (linkButtonRef.current?.getBoundingClientRect().bottom || 0) + 4 }}
            >
              <input
                type="url"
                value={link.url || ''}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                    val = 'https://' + val;
                  }
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

      <button type="button" onClick={handleLocalImageUpload} disabled={uploading} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="上传图片">
        <Upload size={18} />
      </button>

      <div className="relative">
        <button
          type="button"
          ref={imageUrlButtonRef}
          onClick={() => setImageUrlPopoverOpen(!imageUrlPopoverOpen)}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded"
          title="图片URL"
        >
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

      <div className="relative">
        <button
          type="button"
          onClick={() => setVideoPopoverOpen(!videoPopoverOpen)}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded"
          title="插入视频"
        >
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
              <input
                type="number"
                value={videoWidth}
                onChange={(e) => setVideoWidth(parseInt(e.target.value) || 560)}
                placeholder="宽度"
                className="w-1/2 border rounded p-1 text-sm"
              />
              <input
                type="number"
                value={videoHeight}
                onChange={(e) => setVideoHeight(parseInt(e.target.value) || 315)}
                placeholder="高度"
                className="w-1/2 border rounded p-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={insertVideoByUrl} className="bg-primary-600 text-white px-2 py-1 rounded text-sm">插入</button>
              <button type="button" onClick={() => setVideoPopoverOpen(false)} className="bg-gray-200 px-2 py-1 rounded text-sm">取消</button>
            </div>
          </div>
        )}
      </div>
      <span className="w-px h-6 bg-gray-300 mx-1" />

      <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="分割线"><Minus size={18} /></button>
      <button type="button" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} className="bg-gray-100 hover:bg-gray-200 p-2 rounded" title="清除格式"><Eraser size={18} /></button>

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

  const renderContent = (fullscreenMode = false) => (
    <>
      {renderToolbar(fullscreenMode)}
      <div className="p-2">
        <EditorContent editor={editor} className="min-h-[400px] prose max-w-none focus:outline-none" />
      </div>
      {selectedImage && (
        <Rnd
          default={{
            x: 0,
            y: 0,
            width: selectedImage.size.width,
            height: selectedImage.size.height,
          }}
          size={{ width: selectedImage.size.width, height: selectedImage.size.height }}
          onResizeStop={(e, direction, ref, delta, position) => {
            updateImageSize(parseInt(ref.style.width), parseInt(ref.style.height));
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
          className="image-resize-handle"
          style={{ position: 'absolute', pointerEvents: 'auto' }}
          resizeHandleStyles={{
            bottomRight: {
              width: '10px',
              height: '10px',
              backgroundColor: '#3b82f6',
              borderRadius: '50%',
              bottom: '-5px',
              right: '-5px',
              cursor: 'se-resize',
              zIndex: 10,
            },
          }}
        />
      )}
    </>
  );

  if (!editor) return null;

  return (
    <>
      {!isFullscreen && (
        <div className="border rounded overflow-hidden bg-white h-[600px] flex flex-col">
          {renderToolbar(false)}
          <div className="flex-1 overflow-auto p-2">
            <EditorContent editor={editor} className="prose max-w-none focus:outline-none" />
          </div>
          {selectedImage && (
            <Rnd
              default={{
                x: 0,
                y: 0,
                width: selectedImage.size.width,
                height: selectedImage.size.height,
              }}
              size={{ width: selectedImage.size.width, height: selectedImage.size.height }}
              onResizeStop={(e, direction, ref, delta, position) => {
                updateImageSize(parseInt(ref.style.width), parseInt(ref.style.height));
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
              className="image-resize-handle"
              style={{ position: 'absolute', pointerEvents: 'auto' }}
              resizeHandleStyles={{
                bottomRight: {
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  bottom: '-5px',
                  right: '-5px',
                  cursor: 'se-resize',
                  zIndex: 10,
                },
              }}
            />
          )}
        </div>
      )}
      {isFullscreen && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="border rounded overflow-hidden bg-white h-[600px] w-full max-w-4xl shadow-xl">
            {renderToolbar(true)}
            <div className="flex-1 overflow-auto p-2 h-[calc(600px-52px)]">
              <EditorContent editor={editor} className="prose max-w-none focus:outline-none" />
            </div>
            {selectedImage && (
              <Rnd
                default={{
                  x: 0,
                  y: 0,
                  width: selectedImage.size.width,
                  height: selectedImage.size.height,
                }}
                size={{ width: selectedImage.size.width, height: selectedImage.size.height }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  updateImageSize(parseInt(ref.style.width), parseInt(ref.style.height));
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
                className="image-resize-handle"
                style={{ position: 'absolute', pointerEvents: 'auto' }}
                resizeHandleStyles={{
                  bottomRight: {
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    bottom: '-5px',
                    right: '-5px',
                    cursor: 'se-resize',
                    zIndex: 10,
                  },
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}