// lib/webbuilder/defaults/DividingLine.ts
export const DEFAULT_DIVIDING_LINE = {
  lineType: 'solid' as const,
  thickness: 2,
  color: '#e5e7eb',
  widthType: 'full' as const,   // 'full' | '90' | '80' | '50'
  align: 'center' as const,     // 'left' | 'center' | 'right'
};