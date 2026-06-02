import { resolvePath } from './path-resolver';
import components from './components.aggregate';

const componentConfigMap: Record<string, any> = {};
for (const [type, cfg] of Object.entries(components)) {
  componentConfigMap[type] = cfg;
}

export function extractI18nData(templateData: any, templateId: string): Array<{ textId: string; locale: string; text: string }> {
  const records: Array<{ textId: string; locale: string; text: string }> = [];
  const traverse = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const type = node.type;
    const config = componentConfigMap[type];
    if (config?.i18nFields) {
      for (const field of config.i18nFields) {
        const values = resolvePath(node.props, field.path);
        for (const value of values) {
          if (!value || typeof value !== 'object') continue;
          const textId = value[field.textIdKey];
          const langMap = value[field.valueKey];
          if (!textId || !langMap || typeof langMap !== 'object') continue;
          for (const [locale, text] of Object.entries(langMap)) {
            if (text && typeof text === 'string') {
              records.push({ textId, locale, text });
            }
          }
        }
      }
    }
    if (node.children && Array.isArray(node.children)) node.children.forEach(traverse);
    if (node.zones && typeof node.zones === 'object') {
      Object.values(node.zones).forEach((zone: any) => {
        if (Array.isArray(zone)) zone.forEach(traverse);
      });
    }
  };
  if (templateData.content && Array.isArray(templateData.content)) {
    templateData.content.forEach(traverse);
  }
  return records;
}