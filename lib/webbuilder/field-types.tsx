'use client';

import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { BackgroundImageField } from '@/components/webbuilder/fields/BackgroundImageField';
import { RangeField } from '@/components/webbuilder/fields/RangeField';

export const customFieldTypes = {
  'color-picker': ColorPickerField,
  'background-image': BackgroundImageField,
  'range': RangeField,
};