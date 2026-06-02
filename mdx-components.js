// 自定义 MDX 组件（可选）
export function useMDXComponents(components) {
  return {
    h1: ({ children }) => <h1 style={{ fontSize: '2rem', borderBottom: '1px solid #eaeaea' }}>{children}</h1>,
    ...components,
  };
}