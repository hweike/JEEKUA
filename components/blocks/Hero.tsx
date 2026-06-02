import Image from 'next/image';
import Link from 'next/link';

interface HeroContent {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  buttonText?: string;
  buttonLink?: string;
}

export default function Hero({ content }: { content: HeroContent }) {
  const { title, subtitle, backgroundImage, buttonText, buttonLink } = content;
  return (
    <section className="relative h-screen">
      {backgroundImage && (
        <Image src={backgroundImage} fill alt="Hero" className="object-cover" />
      )}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center text-foreground">
        <div className="text-center">
          <h1 className="text-5xl font-bold">{title}</h1>
          {subtitle && <p className="text-xl mt-2">{subtitle}</p>}
          {buttonText && buttonLink && (
            <Link
              href={buttonLink}
              className="mt-6 inline-block bg-primary text-primary-foreground px-6 py-3 rounded hover:bg-primary/90"
            >
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}