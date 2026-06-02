'use client';

import { usePuck, Render } from '@puckeditor/core';
import { useEffect, useRef, useState } from 'react';

export function CustomPreview() {
  const { appState } = usePuck();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [styleVersion, setStyleVersion] = useState(Date.now());

  // 监听 UI 定制器的样式更新事件（您需要在定制器中实现此通知机制）
  useEffect(() => {
    const handleStyleUpdate = () => {
      setStyleVersion(Date.now()); // 改变版本号，强制 iframe 重新加载样式
    };
    window.addEventListener('ui-styles-updated', handleStyleUpdate);
    return () => window.removeEventListener('ui-styles-updated', handleStyleUpdate);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // 只注入前台样式链接（带版本号避免缓存）
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/preview-styles.css?v=${styleVersion}`;
      doc.head.appendChild(link);

      // 同步主题类名（可选）
      doc.documentElement.className = document.documentElement.className;

      setIframeReady(true);
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    } else {
      iframe.addEventListener('load', handleLoad);
      return () => iframe.removeEventListener('load', handleLoad);
    }
  }, [styleVersion]);

  return (
    <div className="h-full w-full">
      <iframe
        ref={iframeRef}
        title="Preview"
        className="w-full h-full border-0"
        srcDoc="<!DOCTYPE html><html><head></head><body><div id='preview-root'></div></body></html>"
      />
      {iframeReady && iframeRef.current?.contentDocument && (
        <div style={{ display: 'none' }}>
          <Render
            config={appState.config}
            data={appState.data}
            iframe={iframeRef.current}
          />
        </div>
      )}
    </div>
  );
}