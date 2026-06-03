import Image from 'next/image';

interface ImageGridProps {
  content: {
    images?: string[];
  };
}

export default function ImageGrid({ content }: ImageGridProps) {
  const images = content.images || [];
  return (
    <section className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto px-4">
        {images.map((img: string, idx: number) => (
          <div key={idx} className="relative h-64">
            <Image src={img} fill alt={`图片 ${idx + 1}`} className="object-cover rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}