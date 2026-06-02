// lib/webbuilder/config.tsx
import type { Config } from '@puckeditor/core';
import type { Components } from './types';
import components from './components.aggregate';
import { customFieldTypes } from './field-types'; // 导入自定义字段类型（包含 slide-list）

// 开发环境可打印注册的组件列表（可选）
if (process.env.NODE_ENV === 'development') {
  console.log('[WebBuilder Config] Registered component keys:', Object.keys(components));
}

export const config: Config<Components> = {
  components,
  fieldTypes: customFieldTypes, // ⬅️ 仅添加这一行
  // 不定义 root.render，布局由全局 layout.tsx 提供
};

export default config;