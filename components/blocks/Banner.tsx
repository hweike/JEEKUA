import Image from 'next/image';
import Link from 'next/link';

interface BannerProps {
  content: {
    image?: string;
    link?: string;
    text?: string;
  };
}

export default function Banner({ content }: BannerProps) {
  const { image, link, text } = content;

  if (!image || image.trim() === '') {
    return null;
  }

  const Wrapper = link ? Link : 'div';

  return (
    <section className="my-8">
      <Wrapper href={link || ''} className="block max-w-7xl mx-auto px-4">
        <div className="relative h-64 md:h-96">
          <Image src={image} fill alt="广告" className="object-cover rounded" />
          {text && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
              <p className="text-foreground text-xl font-bold">{text}</p>
            </div>
          )}
        </div>
      </Wrapper>
    </section>
  );
}