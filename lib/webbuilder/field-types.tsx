'use client';

import { CollapsibleGroup } from '@/components/webbuilder/fields/CollapsibleGroup';
import { ButtonGroup } from '@/components/webbuilder/fields/ButtonGroup';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { BackgroundImageField } from '@/components/webbuilder/fields/BackgroundImageField';
import { SlideListField } from '@/components/webbuilder/fields/SlideListField';
import { HeadingTextField } from '@/components/webbuilder/fields/HeadingTextField';
import { ParagraphField } from '@/components/webbuilder/fields/ParagraphField';
import { ButtonTextField } from '@/components/webbuilder/fields/ButtonTextField';
import { ListField } from '@/components/webbuilder/fields/ListField';
import { ImageBannerTextField } from '@/components/webbuilder/fields/ImageBannerTextField';
import { RangeField } from '@/components/webbuilder/fields/RangeField';
import { LanguageSwitcherField } from '@/components/webbuilder/fields/LanguageSwitcherField';
import { RichtextTextField } from '@/components/webbuilder/fields/RichtextTextField';
import { VideoTextField } from '@/components/webbuilder/fields/VideoTextField';
import { PicwithTextTextField } from '@/components/webbuilder/fields/PicwithTextTextField';
import { MulticolumnListField } from '@/components/webbuilder/fields/MulticolumnListField';
import { MultirowListField } from '@/components/webbuilder/fields/MultirowListField';
import { CollapsibleListField } from '@/components/webbuilder/fields/CollapsibleListField';
import { AccordionListField } from '@/components/webbuilder/fields/AccordionListField';





export const customFieldTypes = {
  group: CollapsibleGroup,
  'button-group': ButtonGroup,
  'color-picker': ColorPickerField,
  'background-image': BackgroundImageField, // 新类型
  'slide-list': SlideListField,
  'heading-text': HeadingTextField,
  'paragraph-text': ParagraphField,
  'button-text': ButtonTextField,
  'list': ListField,
  'image-banner-title': ImageBannerTextField,
  'image-banner-text': ImageBannerTextField,
  'image-banner-button1': ImageBannerTextField,
  'image-banner-button2': ImageBannerTextField,
  'range': RangeField,
  'language-switcher': LanguageSwitcherField,
   'richtext-title': RichtextTextField,
  'richtext-text': RichtextTextField,
  'richtext-button1': RichtextTextField,
  'richtext-button2': RichtextTextField,
  'video-title': VideoTextField,
  'picwithtext-title': PicwithTextTextField,
  'picwithtext-text': PicwithTextTextField,
  'picwithtext-button': PicwithTextTextField,
  'multicolumn-list': MulticolumnListField,
  'multicolumn-title': ImageBannerTextField,
  'multicolumn-button': ImageBannerTextField,  // 新增这一行
  'multirow-list': MultirowListField,
  'multirow-title': ImageBannerTextField,
  'multirow-desc': ImageBannerTextField,
  'multirow-linklabel': ImageBannerTextField,
  'collapsible-list': CollapsibleListField,
  'collapsible-title': ImageBannerTextField,
  'collapsible-content': ImageBannerTextField,
  'accordion-list': AccordionListField,
  'accordion-title': ImageBannerTextField,
  'accordion-content-title': ImageBannerTextField,
  'accordion-content-paragraph': ImageBannerTextField,
};