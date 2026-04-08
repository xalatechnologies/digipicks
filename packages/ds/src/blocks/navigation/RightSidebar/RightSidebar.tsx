/**
 * RightSidebar (TOC)
 *
 * Table-of-contents sidebar for LearningLayout / docs.
 * Config-driven; supports nested headings.
 */

import { Heading } from '@digdir/designsystemet-react';
import styles from './RightSidebar.module.css';

export interface RightSidebarItem {
  id: string;
  label: string;
  href?: string;
  items?: RightSidebarItem[];
}

export interface RightSidebarProps {
  title?: string;
  items: RightSidebarItem[];
  /** Custom content (overrides items when provided) */
  children?: React.ReactNode;
  id?: string;
}

function TocItem({ item, basePath = '' }: { item: RightSidebarItem; basePath?: string }) {
  const href = item.href ?? (item.id ? `${basePath}#${item.id}` : undefined);
  if (!href) {
    return (
      <div className={styles.item}>
        <span className={styles.link}>{item.label}</span>
        {item.items?.length ? (
          <ul className={styles.list}>
            {item.items.map((sub) => (
              <li key={sub.id}>
                <TocItem item={sub} basePath={basePath} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
  return (
    <div className={styles.item}>
      <a href={href} className={styles.link}>
        {item.label}
      </a>
      {item.items?.length ? (
        <ul className={styles.list}>
          {item.items.map((sub) => (
            <li key={sub.id}>
              <TocItem item={sub} basePath={basePath} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RightSidebar({ title = 'Innhold', items, children, id }: RightSidebarProps): React.ReactElement {
  if (children) {
    return (
      <aside id={id} className={styles.aside}>
        {children}
      </aside>
    );
  }
  return (
    <aside id={id} className={styles.aside}>
      <Heading data-size="xs" className={styles.title}>{title}</Heading>
      <nav aria-label="Table of contents">
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id}>
              <TocItem item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

RightSidebar.displayName = 'RightSidebar';
