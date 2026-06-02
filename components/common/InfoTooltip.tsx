'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFieldHint, type FieldHintPath } from '@/config/fieldHints';

interface InfoTooltipProps {
  /** 直接指定提示文案（优先级最高） */
  content?: string;
  /** 配置路径，例如 HINT_PATHS.product.basic.name */
  hintKey?: FieldHintPath;
  /** 自定义样式类名（作用在图标上） */
  className?: string;
  /** 是否显示问号图标（默认 true） */
  showIcon?: boolean;
  /** 自定义 fallback 文案（当 hintKey 找不到时使用） */
  fallbackContent?: string;
  /** 显示延迟（毫秒），默认 0 */
  delayMs?: number;
  /** 提示框方向：top / bottom / left / right，默认 top */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** 提示框最大宽度（像素），默认 240 */
  maxWidth?: number;
}

export default function InfoTooltip({
  content,
  hintKey,
  className = '',
  showIcon = true,
  fallbackContent,
  delayMs = 0,
  placement = 'top',
  maxWidth = 300,
}: InfoTooltipProps) {
  // 最终文案
  let finalContent = content;
  if (!finalContent && hintKey) {
    const hint = getFieldHint(hintKey);
    finalContent = hint ?? fallbackContent;
  }

  const isMissing = !finalContent;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 处理缺失情况
  if (isMissing) {
    if (isDevelopment) {
      console.error(
        `[InfoTooltip] 缺少提示文案: hintKey="${hintKey}"，请检查配置或提供 fallbackContent`
      );
      return (
        <span
          className={`inline-flex items-center justify-center w-4 h-4 text-xs ml-1 bg-red-100 text-red-600 rounded-full cursor-help ${className}`}
          title="提示缺失，请检查控制台"
          aria-label="提示缺失"
        >
          !
        </span>
      );
    }
    return null;
  }

  if (!showIcon) {
    return null;
  }

  // ==================== 自定义 Tooltip 逻辑 ====================
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);

  // 更新位置（考虑提示框实际尺寸）
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipContentRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipContentRef.current.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let top = 0;
    let left = 0;
    const gap = 8; // 间距

    switch (placement) {
      case 'top':
        top = rect.top + scrollY - tooltipRect.height - gap;
        left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + scrollY + gap;
        left = rect.left + scrollX + rect.width / 2 - tooltipRect.width / 2;
        break;
      case 'left':
        top = rect.top + scrollY + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left + scrollX - tooltipRect.width - gap;
        break;
      case 'right':
        top = rect.top + scrollY + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + scrollX + gap;
        break;
    }

    // 边界检测（防止超出屏幕）
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (left + tooltipRect.width > viewportWidth + scrollX) {
      left = viewportWidth + scrollX - tooltipRect.width - 5;
    }
    if (left < scrollX) left = scrollX + 5;
    if (top + tooltipRect.height > viewportHeight + scrollY) {
      top = viewportHeight + scrollY - tooltipRect.height - 5;
    }
    if (top < scrollY) top = scrollY + 5;

    setCoords({ top, left });
  };

  // 显示提示
  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
      // 等待 DOM 渲染完成后再测量位置
      requestAnimationFrame(() => {
        updatePosition();
      });
    }, delayMs);
  };

  // 隐藏提示
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  // 监听滚动和窗口大小变化，重新计算位置
  useEffect(() => {
    if (!visible) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, placement]);

  // 内容变化时重新计算位置
  useEffect(() => {
    if (visible) {
      updatePosition();
    }
  }, [visible, finalContent]);

  return (
    <>
      {/* 触发图标 */}
      <span
        ref={triggerRef}
        className={`cursor-help text-gray-400 border border-gray-300 rounded-full inline-flex items-center justify-center w-4 h-4 text-xs ml-1 ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        aria-label="帮助信息"
      >
        ?
      </span>

      {/* 自定义提示层（Portal） */}
      {visible &&
        createPortal(
          <div
            ref={tooltipContentRef}
            className="fixed z-[9999] px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg pointer-events-none"
            style={{
              top: coords.top,
              left: coords.left,
              maxWidth: `${maxWidth}px`,
              whiteSpace: 'normal',      // 允许换行
              wordBreak: 'break-word',   // 长单词断行
              lineHeight: 1.4,
            }}
          >
            {finalContent}
            {/* 小三角箭头 */}
            <div
              className="absolute w-2 h-2 bg-gray-800 rotate-45"
              style={{
                ...(placement === 'top' && {
                  bottom: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                }),
                ...(placement === 'bottom' && {
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                }),
                ...(placement === 'left' && {
                  right: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(45deg)',
                }),
                ...(placement === 'right' && {
                  left: '-4px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(45deg)',
                }),
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
}