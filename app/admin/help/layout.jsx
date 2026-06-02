import { getPageMap } from 'nextra/page-map';
import Link from 'next/link';
import styles from './help.module.css';   // 导入样式模块

function NavTree({ items, level = 0 }) {
  if (!items || items.length === 0) return null;

  return (
    <ul style={{ paddingLeft: level === 0 ? 0 : 20, listStyle: 'none', margin: 0 }}>
      {items.map((item, idx) => {
        if ('children' in item && item.children && item.children.length > 0) {
          return (
            <li key={idx}>
              <strong>{item.title || item.name}</strong>
              <NavTree items={item.children} level={level + 1} />
            </li>
          );
        }
        if ('route' in item) {
          const href = item.route;
          return (
            <li key={idx}>
              <Link href={href} style={{ textDecoration: 'none', color: '#0066cc' }}>
                {item.title || item.name}
              </Link>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}

export default async function HelpLayout({ children }) {
  const pageMap = await getPageMap('/admin/help');

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2>JEEKUA帮助中心</h2>
        <NavTree items={pageMap} />
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}