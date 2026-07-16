// lib/webbuilder/defaults/Heading.ts
export const DEFAULT_HEADING = {
  level: 1,
  title: 'Title',
  textAlign: 'left' as const,
  bold: true,
  italic: false,
  underline: false,
  fontSize: '2xl' as const,
  link: '',
  spacingGroup: {
    mobileScaleFactor: 0.7,
  },
} as const;