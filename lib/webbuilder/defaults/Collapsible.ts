export const DEFAULT_COLLAPSIBLE = {
  bannerGroup: {
    bannerType: 'standard' as const,
    backgroundColor: '#ffffff',
  },
  titleGroup: {
    globalTitle: '',
    globalTitleFontSize: 40,
    globalTitleColor: '#000000',
    globalTitleAlign: 'center' as const,
    rowBackgroundColor: '#f9fafb',  // ✅ 新增默认值
  },
  imageGroup: {
    imageUrl: '',
    imageRatio: 'adapt' as const,
    imagePlacement: 'left' as const,
  },
  contentGroup: {
    rowTitleFontSize: 18,
    rowTitleColor: '#000000',
    rowContentFontSize: 16,
    rowContentColor: '#666666',
  },
  containerGroup: {
    containerType: 'none' as const,
    containerBgColor: 'transparent',
  },
  paddingGroup: {
    paddingTop: 32,
    paddingBottom: 32,
  },
  spacingGroup: {
    mobileScaleFactor: 0.7,
  },
  items: [
    {
      id: 'collapsible-item-1',
      title: 'Frequently Asked Questions 1',
      icon: 'help_circle',
      content: 'This is the answer to question 3.',
    },
    {
      id: 'collapsible-item-2',
      title: 'Frequently Asked Questions 2',
      icon: 'star',
      content: 'This is the answer to question 2.',
    },
    {
      id: 'collapsible-item-3',
      title: 'Frequently Asked Questions 3',
      icon: 'heart',
      content: 'This is the answer to question 3.',
    },
  ],
};