import { DocumentLibraryBlock } from '@/components/webbuilder/blocks/document-library/DocumentLibraryBlock';
import type { ComponentConfig } from '@puckeditor/core';
import type { Components } from '../types';

export const config: ComponentConfig<Components['DocumentLibraryBlock']> = {
  label: '文档库展示',
  category: 'Document',
  defaultProps: {},
  fields: {},
  render: ({ puck, ...props }) => <DocumentLibraryBlock puck={puck} {...props} />,
};