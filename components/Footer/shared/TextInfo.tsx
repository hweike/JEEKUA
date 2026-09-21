'use client';

interface TextInfoProps {
  title?: string;
  content: string;
}

export default function TextInfo({ title, content }: TextInfoProps) {
  // ✅ 优化：只 split 一次
  const lines = content.split('\n');
  const formattedContent = lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ));

  // ✅ 标题样式
  const titleStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-lg, 1.125rem)',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--footer-text, var(--foreground, #0f172a))',
    marginBottom: 'var(--spacing-4, 1rem)',
  };

  // ✅ 内容样式
  const contentStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-sm, 0.875rem)',
    color: 'var(--muted-foreground, #64748b)',
    lineHeight: 'var(--line-height-normal, 1.5)',
  };

  return (
    <div>
      {title && <h3 style={titleStyle}>{title}</h3>}
      <div style={contentStyle}>
        {formattedContent}
      </div>
    </div>
  );
}