// lib/webbuilder/defaults/Multicolumn.ts
export const DEFAULT_MULTICOLUMN = {
  bannerGroup: {
    bannerType: 'standard' as const,
    backgroundColor: '#ffffff',
  },

  globalGroup: {
    globalTitle: 'Multicolumn',
    globalTitleFontSize: 40,
    globalTitleColor: '#000000',
  },

  imageGroup: {
    imageWidth: 'full' as const,      // 'full' | 'half' | 'third'
    imageShape: 'square' as const,      // 'adapt' | 'portrait' | 'square' | 'circle'
  },

  buttonGroup: {
    buttonText: 'Button label',
    buttonFontSize: 16,
    buttonColor: '#000000',
    buttonLink: '',
     // ✅ 新增：按钮样式（用户不可见）
    buttonPaddingX: 32,
    buttonPaddingY: 12,
    buttonBorderRadius: 24,
  },

  layoutGroup: {
    columnsDesktop: 3,
    columnsAlign: 'center' as const,    // 'left' | 'center'
    columnsMobile: 1,
    mobileCarousel: false,
  },

  styleGroup: {
    columnBgColor: '#f9fafb',
    columnTitleColor: '#000000',
    columnDescColor: '#666666',
  },

  paddingGroup: {
    paddingTop: 32,
    paddingBottom: 32,
  },

  spacingGroup: {
    mobileScaleFactor: 0.7,
  },

  // 默认列模板
  items: [
    {
      id: 'column-1',
      imageUrl: 'https://sc04.alicdn.com/kf/Hd6d3a12dd03d4f04b95e941ac28dc3577/230514981/Hd6d3a12dd03d4f04b95e941ac28dc3577.png',
      title: 'Column 1',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      buttonLabel: 'Learn more',
      buttonLink: '#',
    },
    {
      id: 'column-2',
      imageUrl: 'https://sc04.alicdn.com/kf/H4dfff181670d4c61b946c57b5fef659ec/230514981/H4dfff181670d4c61b946c57b5fef659ec.png',
      title: 'Column 2',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      buttonLabel: 'Learn more',
      buttonLink: '#',
    },
    {
      id: 'column-3',
      imageUrl: 'https://sc04.alicdn.com/kf/H843bfd288b114530a9713a5e2ddd8246p/230514981/H843bfd288b114530a9713a5e2ddd8246p.png',
      title: 'Column 3',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      buttonLabel: 'Learn more',
      buttonLink: '#',
    },
  ],
};