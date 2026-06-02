import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents } from '../../../../mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props) {
  const params = await props.params;
  const mdxPath = params.mdxPath || [];
  try {
    const { metadata } = await importPage(mdxPath);
    return metadata || { title: '帮助文档' };
  } catch {
    return { title: '页面未找到' };
  }
}

const components = useMDXComponents({});

export default async function Page(props) {
  const params = await props.params;
  const mdxPath = params.mdxPath || [];

  let MDXContent;
  try {
    const page = await importPage(mdxPath);
    MDXContent = page.default;
  } catch (error) {
    console.error('Failed to load MDX:', mdxPath, error);
    if (mdxPath.length === 1 && mdxPath[0] === 'user-guide') {
      return (
        <div>
          <h1>用户指南</h1>
          <p>请从左侧导航选择具体文章，例如“快速入门”。</p>
        </div>
      );
    }
    return (
      <div>
        <h1>页面未找到</h1>
        <p>路径: {mdxPath.join('/') || '首页'}</p>
      </div>
    );
  }

  if (!MDXContent) return <div>内容为空</div>;

  return <MDXContent components={components} {...props} params={params} />;
}