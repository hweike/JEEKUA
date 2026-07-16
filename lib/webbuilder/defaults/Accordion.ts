// lib/webbuilder/defaults/Accordion.ts
export const DEFAULT_ACCORDION = {
  bannerType: 'standard' as const,
  backgroundColor: '#ffffff',
  rowGroup: {
    rowTitleColor: '#000000',
    rowTitleFontSize: 24,
    rowTitleAlign: 'left' as const,
    rowHeaderBgColor: '#f3f4f6',
    itemsPerRow: 3,
    itemsGap: 20,
  },
  contentGroup: {
    contentTitleFontSize: 24,
    contentTitleAlign: 'center' as const,
    contentTextFontSize: 18,
    contentTextAlign: 'center' as const,
  },
  paddingGroup: {
    paddingTop: 32,
    paddingBottom: 32,
  },
  spacingGroup: {
    mobileScaleFactor: 0.7,
  },
  // 默认内容模板（id 仅作占位，实际使用时会重新生成）
  items: [
    {
      id: 'placeholder-accordion',
      title: 'Accordion Title 1',
      contents: [
        {
          id: 'placeholder-content-1',
          imageUrl: 'https://sc04.alicdn.com/kf/Hc5e1cfe6da8a4f239d13a0b4cade78e1O/230514981/Hc5e1cfe6da8a4f239d13a0b4cade78e1O.jpg',
          title: 'List Title 1',
          paragraph: 'This is the content text. Detailed descriptions can be added here.',
          link: '',
        },
        {
          id: 'placeholder-content-2',
          imageUrl: 'https://sc04.alicdn.com/kf/Hfcd10e9ee3d2489f8537bca4a71ec9794/230514981/Hfcd10e9ee3d2489f8537bca4a71ec9794.jpg',
          title: 'List Title 2',
          paragraph: 'This is the content text. Detailed descriptions can be added here.',
          link: '',
        },
        {
          id: 'placeholder-content-3',
          imageUrl: 'https://sc04.alicdn.com/kf/H3b9a26b1e4854d0c894afdb57e381638n/230514981/H3b9a26b1e4854d0c894afdb57e381638n.jpg',
          title: 'List Title 3',
          paragraph: 'This is the content text. Detailed descriptions can be added here.',
          link: '',
        },
      ],
    },
  ],
};