// lib/webbuilder/defaults/Button.ts
export const DEFAULT_BUTTON = {
  text: 'Button label',
  buttonColor: '#000000',
  textColor: '#ffffff',
  fontSize: 16,
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'center' as const,
  buttonAlign: 'center' as const,
  link: '',
  borderRadius: '0.5rem' as const,
  paddingX: 48,   // 左右内边距 (px)
  paddingY: 19,   // 上下内边距 (px)  约 1.2rem
  spacingGroup: {
    mobileScaleFactor: 0.7,
  },
};