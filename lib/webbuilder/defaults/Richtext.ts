// lib/webbuilder/defaults/Richtext.ts
export const DEFAULT_RICHTEXT = {
  bannerType: 'standard' as const,
  backgroundColor: '#ffffff',
  titleGroup: {
    title: 'Talk about your brand',
    titleFontSize: 48,
    titleColor: '#000000',
  },
  textGroup: {
    text: 'Share information about your brand with your customers. Describe a product, make announcements, or welcome customers to your store.',
    textFontSize: 24,
    textColor: '#000000',
  },
  button1Group: {
    button1Text: 'Button label',
    button1FontSize: 16,          // 新增
    button1Color: '#000000',
    button1Link: '',
  },
  button2Group: {
    button2Text: 'Button label',
    button2FontSize: 16,          // 新增
    button2Color: '#000000',
    button2Link: '',
  },
  buttonStyleGroup: {
    buttonPaddingX: 32,
    buttonPaddingY: 12,
    buttonBorderRadius: 24,
  },
  layoutGroup: {
    contentPosition: 'center' as const,
    textAlign: 'center' as const,
  },
  paddingGroup: {
    containerPaddingTop: 32,
    containerPaddingBottom: 32,
  },
  spacingGroup: {
    titleMarginBottom: 16,
    textMarginBottom: 24,
    buttonGap: 16,
    mobileScaleFactor: 0.7,       // 新增：移动端字体缩放比例
  },
};