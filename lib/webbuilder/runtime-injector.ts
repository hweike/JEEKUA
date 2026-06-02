/**
 * 安全的数据注入：将运行时数据注入到模板中的所有组件
 * 所有组件都会收到 __runtime prop，由组件自行决定是否使用
 */
export function injectRuntimeDataSafe(templateData: any, runtime: any): any {
  if (!templateData) return templateData;
  const newData = JSON.parse(JSON.stringify(templateData));

  const traverse = (node: any) => {
    if (!node) return;
    // 为每个组件节点都注入 __runtime
    node.props = node.props || {};
    node.props.__runtime = runtime;

    // 递归处理 content 数组
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }

    // 递归处理 zones
    if (node.zones && typeof node.zones === 'object') {
      Object.values(node.zones).forEach((zone: any) => {
        if (Array.isArray(zone)) zone.forEach(traverse);
      });
    }
  };

  traverse(newData);
  return newData;
}