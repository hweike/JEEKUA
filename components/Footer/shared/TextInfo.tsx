'use client';

interface TextInfoProps {
  title?: string;
  content: string;
}

export default function TextInfo({ title, content }: TextInfoProps) {
  // 将换行符转换为 <br />
  const formattedContent = content.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < content.split('\n').length - 1 && <br />}
    </span>
  ));
  
  return (
    <div>
      {title && <h3 className="font-semibold text-lg mb-4">{title}</h3>}
      <div className="text-muted-foreground text-sm space-y-1">
        {formattedContent}
      </div>
    </div>
  );
}