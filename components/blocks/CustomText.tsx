interface CustomTextProps {
  content: {
    text: string;
    align?: 'left' | 'center' | 'right';
  };
}

export default function CustomText({ content }: CustomTextProps) {
  const { text, align = 'left' } = content;
  return (
    <div className={`my-8 text-${align}`}>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}