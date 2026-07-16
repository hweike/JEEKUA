// lib/webbuilder/defaults/PicwithText.ts

export const DEFAULT_PICWITH_TEXT = {
  bannerType: 'standard' as const,
  backgroundColor: '#ffffff',
  imageGroup: {
    imageUrl: 'https://sc04.alicdn.com/kf/Hd6d3a12dd03d4f04b95e941ac28dc3577/230514981/Hd6d3a12dd03d4f04b95e941ac28dc3577.png',
    imageHeight: 'auto' as const,
    imageWidth: 'medium' as const,
    imagePosition: 'left' as const,
    animation: 'none' as const,
  },
  titleGroup: {
    title: 'Image with text',
    titleFontSize: 48,
    titleColor: '#000000',
  },
  textGroup: {
    text: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
    textFontSize: 20,
    textColor: '#000000',
  },
  buttonGroup: {
    buttonText: 'Button label',
    buttonFontSize: 16,
    buttonColor: '#000000',
    buttonLink: '',
    buttonPaddingX: 32,
    buttonPaddingY: 12,
    buttonBorderRadius: 24,
  },
  layoutGroup: {
    contentVertical: 'center' as const,
    textAlign: 'left' as const,
    textAreaBackgroundColor: 'transparent',
  },
  paddingGroup: {
    paddingTop: 48,
    paddingBottom: 48,
  },
   spacingGroup: {
    mobileScaleFactor: 0.7,
  },
};