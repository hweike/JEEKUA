// lib/webbuilder/defaults/ImageBanner.ts

export const DEFAULT_IMAGE_BANNER = {
  bannerType: 'standard' as const,
  mobileScaleFactor: 0.7, // 新增
  imageSettings: {
    image1Url: 'https://sc04.alicdn.com/kf/H2622e19002064e21a1218b0152cfb22a9/230514981/H2622e19002064e21a1218b0152cfb22a9.jpg',
    image2Url: '',
    overlayOpacity: 0,
    heightPreset: 'auto' as const,
    animation: 'none' as const,
  },
  contentSettings: {
    title: 'Image banner',
    titleFontSize: 48,
    titleColor: '#ffffff',
    text: 'Give customers details about the banner image(s) or content on the template.',
    textFontSize: 24,
    textColor: '#ffffff',
    button1Text: 'Button label',
    button1Color: '#000000',
    button1Link: '',
    button2Text: 'Button label',
    button2Color: '#000000',
    button2Link: '',
    contentPosition: 'center-center',
    textAlign: 'center',
    containerEnabled: true,
    containerBgColor: '#000000',          // 改为纯色（透明度由滑块控制）
    containerOpacity: 60,                // 新增：容器不透明度 0-100
    containerBorderRadius: 32,
    containerPadding: 48,
    buttonPaddingX: 24,
    buttonPaddingY: 8,
    buttonBorderRadius: 6,
  },
};