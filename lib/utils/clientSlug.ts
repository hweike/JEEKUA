// 客户端专用 slug 生成器（不依赖任何 Node 模块）
export function generateClientSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'page';
}