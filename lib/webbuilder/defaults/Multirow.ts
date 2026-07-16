// lib/webbuilder/defaults/Multirow.ts
export const DEFAULT_MULTIROW = {
  bannerGroup: {
    bannerType: 'standard' as const,
    backgroundColor: '#ffffff',
  },

  imageGroup: {
    imageHeight: 'auto' as const,          // 'auto' | 'small' | 'medium' | 'large'
    imageWidth: 'medium' as const,         // 'small' | 'medium' | 'large'
    imagePlacement: 'alternate-left' as const, // 'alternate-left' | 'alternate-right' | 'left' | 'right'
  },

  contentGroup: {
    columnBgColor: '#f9fafb',
    columnTitleColor: '#000000',
    columnTitleFontSize: 32,
    columnDescColor: '#666666',
    columnDescFontSize: 16,
    contentVertical: 'middle' as const,    // 'top' | 'middle' | 'bottom'
    textAlign: 'left' as const,            // 'left' | 'center' | 'right'
    mobileTextAlign: 'center' as const,    // 'left' | 'center' | 'right'
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
      id: 'row-1',
      imageUrl: 'https://sc04.alicdn.com/kf/H4dfff181670d4c61b946c57b5fef659ec/230514981/H4dfff181670d4c61b946c57b5fef659ec.png',
      title: 'Row 1',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      linkLabel: 'Learn more',
      linkUrl: '#',
    },
    {
      id: 'row-2',
      imageUrl: 'https://sc04.alicdn.com/kf/Hd6d3a12dd03d4f04b95e941ac28dc3577/230514981/Hd6d3a12dd03d4f04b95e941ac28dc3577.png',
      title: 'Row 2',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      linkLabel: 'Learn more',
      linkUrl: '#',
    },
    {
      id: 'row-3',
      imageUrl: 'https://sc04.alicdn.com/kf/H843bfd288b114530a9713a5e2ddd8246p/230514981/H843bfd288b114530a9713a5e2ddd8246p.png',
      title: 'Row 3',
      description: 'Pair text with an image to focus on your chosen product, collection, or blog post. Add details on availability, style, or even provide a review.',
      linkLabel: 'Learn more',
      linkUrl: '#',
    },
  ],
};