import type { ComponentConfig } from '@measured/puck';
import { Paragraph } from '@/components/webbuilder/blocks/basic/Paragraph';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import RichTextEditor from '@/components/RichTextEditor';
import { DEFAULT_PARAGRAPH } from '@/lib/webbuilder/defaults/Paragraph';
import type { ParagraphProps } from '@/lib/webbuilder/types';

export const config: ComponentConfig<ParagraphProps> = {
  label: '段落',
  category: 'Basic',
  defaultProps: {
    content: DEFAULT_PARAGRAPH.content,
    fontSize: DEFAULT_PARAGRAPH.fontSize,
    color: DEFAULT_PARAGRAPH.color,
    textAlign: DEFAULT_PARAGRAPH.textAlign,
    spacingGroup: { ...DEFAULT_PARAGRAPH.spacingGroup },
  },
  fields: {
    content: {
      label: '内容',
      type: 'custom',
      render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
        <RichTextEditor
          value={value || ''}
          onChange={onChange}
          placeholder="开始编写段落..."
        />
      ),
    },
    fontSize: {
      label: '文字大小 (px)',
      type: 'number',
      min: 8,
      max: 80,
      step: 1,
    },
    textAlign: {
      label: '文本对齐',
      type: 'radio',
      options: [
        { label: '左对齐', value: 'left' },
        { label: '居中', value: 'center' },
        { label: '右对齐', value: 'right' },
      ],
    },
    color: {
      label: '文字颜色',
      type: 'custom',
      render: ({ value, onChange }: { value?: string; onChange: (val: string) => void }) => (
        <ColorPickerField field={{}} value={value || '#333333'} onChange={onChange} />
      ),
    },
  },
  render: ({ puck, ...props }) => <Paragraph puck={puck} {...props} />,
};