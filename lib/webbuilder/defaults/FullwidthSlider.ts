// lib/webbuilder/defaults/FullwidthSlider.ts
export const DEFAULT_FULLWIDTH_SLIDER = {
  bannerType: 'standard' as const,
  backgroundColor: '#ffffff',
  paddingTop: 32,
  paddingBottom: 32,
  height: 550,
  autoplay: 'none' as const,
  contentMaxWidth: '100%',
  contentPadding: 'clamp(1rem, 3vw, 2rem)',
  imageBorderRadius: 12,
  buttonBorderRadius: 24,
  buttonPaddingX: 32,
  buttonPaddingY: 12,
  // 新增：按钮字体大小（默认16px）
  buttonFontSize: 16,
  // 新增：移动端缩放比例
  mobileScaleFactor: 0.7,
  images: [
    {
      imageUrl: 'https://sc04.alicdn.com/kf/H0d02523f09314ec7b4dba865288d195dp/230514981/H0d02523f09314ec7b4dba865288d195dp.jpg',
      title: 'Image slide',
      subtitle: 'Tell your brand story through images',
      buttonText: 'Button label',
      buttonLink: 'https://example.com',
      contentPosition: 'center-center',
      desktopAlign: 'center',
      mobileAlign: 'center',
      titleFontSize: 48,
      titleColor: '#ffffff',
      subtitleFontSize: 24,
      subtitleColor: '#ffffff',
    },
  ] as {
    imageUrl: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    contentPosition: string;
    desktopAlign: 'left' | 'center' | 'right';
    mobileAlign: 'left' | 'center' | 'right';
    titleFontSize: number;
    titleColor: string;
    subtitleFontSize: number;
    subtitleColor: string;
  }[],
};