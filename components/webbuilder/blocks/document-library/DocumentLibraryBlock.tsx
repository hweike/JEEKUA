'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import DocsTree from '@/components/front/DocsTree';

export function DocumentLibraryBlock({ __runtime, puck }: any) {
  if (!__runtime?.library || !__runtime?.docTree || !__runtime?.currentDoc) {
    return (
      <div
        className="border-2 border-dashed border-border p-8 text-center text-muted-foreground"
        ref={puck?.dragRef}
      >
        〖文档库展示区域〗
      </div>
    );
  }

  const { library, docTree, currentDoc, locale } = __runtime;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧文档树 - 使用 DocsTree 组件 */}
        <aside className="lg:w-1/4">
          <div className="sticky top-24">
            <DocsTree
              tree={docTree}
              librarySlug={library.slug}
              currentDocSlug={currentDoc.slug}
              locale={locale}
              basePath="docs"
            />
          </div>
        </aside>

        {/* 右侧文档内容 */}
        <main className="flex-1 prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-foreground">{currentDoc.title}</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {currentDoc.content || '暂无内容'}
          </ReactMarkdown>
        </main>
      </div>
    </div>
  );
}