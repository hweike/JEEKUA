// lib/webbuilder/defaults/List.ts
export const DEFAULT_LIST = {
  spacingGroup: {
    mobileScaleFactor: 0.7,
  },
  items: [
    {
      id: `list-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      icon: 'check',
      text: '列表项 1',
      textColor: '#000000',
      fontSize: 16,
      textAlign: 'left' as const,
      bold: false,
      italic: false,
      underline: false,
      link: '',
    },
    {
      id: `list-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      icon: 'star',
      text: '列表项 2',
      textColor: '#000000',
      fontSize: 16,
      textAlign: 'left' as const,
      bold: false,
      italic: false,
      underline: false,
      link: '',
    },
    {
      id: `list-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      icon: 'heart',
      text: '列表项 3',
      textColor: '#000000',
      fontSize: 16,
      textAlign: 'left' as const,
      bold: false,
      italic: false,
      underline: false,
      link: '',
    },
  ],
};