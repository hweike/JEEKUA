import Link from 'next/link';

export default function Pagination({ currentPage, totalPages, baseUrl }: any) {
  if (totalPages <= 1) return null;
  const createPageUrl = (page: number) => `${baseUrl}?page=${page}`;
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  
  return (
    <div className="flex justify-center gap-2 mt-8 flex-wrap">
      {currentPage > 1 && (
        <Link href={createPageUrl(currentPage - 1)} className="px-3 py-1 border rounded hover:bg-gray-100">上一页</Link>
      )}
      {startPage > 1 && (
        <>
          <Link href={createPageUrl(1)} className="px-3 py-1 border rounded hover:bg-gray-100">1</Link>
          {startPage > 2 && <span className="px-3 py-1">...</span>}
        </>
      )}
      {pages.map(page => (
        <Link
          key={page}
          href={createPageUrl(page)}
          className={`px-3 py-1 border rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
        >
          {page}
        </Link>
      ))}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-3 py-1">...</span>}
          <Link href={createPageUrl(totalPages)} className="px-3 py-1 border rounded hover:bg-gray-100">{totalPages}</Link>
        </>
      )}
      {currentPage < totalPages && (
        <Link href={createPageUrl(currentPage + 1)} className="px-3 py-1 border rounded hover:bg-gray-100">下一页</Link>
      )}
    </div>
  );
}