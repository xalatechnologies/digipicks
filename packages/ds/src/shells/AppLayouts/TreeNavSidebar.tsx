/**
 * TreeNavSidebar
 *
 * Tree-type navigation sidebar for docs/user-guides layout.
 * Desktop: aside with expandable tree. Mobile: hamburger + drawer.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@digdir/designsystemet-react';
import { Drawer } from '../../composed/Drawer';
import { ChevronRightIcon, MenuIcon } from '../../primitives/icons';
import { cn } from '../../utils';
import styles from './TreeNavSidebar.module.css';

/** Tree nav item compatible with @digipicks/shared DocsTreeNavItem */
export interface TreeNavItem {
  id: string;
  label: string;
  labelKey?: string;
  href?: string;
  children?: TreeNavItem[];
}

const DEFAULT_MOBILE_BREAKPOINT = 768;

function isPathInTree(item: TreeNavItem, path: string): boolean {
  if (item.href && path.startsWith(item.href) && item.href !== '/') return true;
  return (item.children ?? []).some((c: TreeNavItem) => isPathInTree(c, path));
}

export interface TreeNavSidebarProps {
  logo: React.ReactNode;
  items: TreeNavItem[];
  width?: number;
  mobileBreakpoint?: number;
  id?: string;
  'data-testid'?: string;
  onItemClick?: () => void;
}

function TreeNavItemComp({
  item,
  expandedIds,
  onToggle,
  currentPath,
  onItemClick,
}: {
  item: TreeNavItem;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  currentPath: string;
  onItemClick?: () => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = hasChildren && (expandedIds.has(item.id) || isPathInTree(item, currentPath));
  const label = item.labelKey ? item.label : item.label;

  if (hasChildren && !item.href) {
    return (
      <li className={cn(styles.treeItem, isExpanded && styles.treeItemExpanded)}>
        <Button
          type="button"
          variant="tertiary"
          className={cn(styles.treeItemInner, styles.treeToggleButton)}
          onClick={() => onToggle(item.id)}
          aria-expanded={isExpanded}
        >
          <span className={styles.expandButton} aria-hidden>
            <ChevronRightIcon size={16} />
          </span>
          <span className={styles.label}>{label}</span>
        </Button>
        {isExpanded && (
          <ul className={styles.children}>
            {item.children!.map((child: TreeNavItem) => (
              <TreeNavItemComp
                key={child.id}
                item={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                currentPath={currentPath}
                onItemClick={onItemClick}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  if (item.href) {
    return (
      <li className={cn(styles.treeItem, isExpanded && styles.treeItemExpanded)}>
        <NavLink
          to={item.href}
          end={item.href === '/'}
          onClick={onItemClick}
          className={({ isActive }) => cn(styles.treeItemInner, isActive && styles.treeItemInnerActive)}
        >
          {hasChildren ? (
            <Button
              type="button"
              variant="tertiary"
              className={cn(styles.expandButton, styles.expandButtonInline)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle(item.id);
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRightIcon size={16} />
            </Button>
          ) : (
            <span className={styles.spacer} />
          )}
          <span className={styles.label}>{label}</span>
        </NavLink>
        {hasChildren && (expandedIds.has(item.id) || isPathInTree(item, currentPath)) && (
          <ul className={styles.children}>
            {item.children!.map((child: TreeNavItem) => (
              <TreeNavItemComp
                key={child.id}
                item={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                currentPath={currentPath}
                onItemClick={onItemClick}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return null;
}

export function TreeNavSidebar({
  logo,
  items,
  width = 280,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  id,
  'data-testid': dataTestId,
  onItemClick,
}: TreeNavSidebarProps): React.ReactElement {
  const location = useLocation();
  const currentPath = location.pathname;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < mobileBreakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const onToggle = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const treeContent = (
    <ul className={styles.treeList}>
      {items.map((item) => (
        <TreeNavItemComp
          key={item.id}
          item={item}
          expandedIds={expandedIds}
          onToggle={onToggle}
          currentPath={currentPath}
          onItemClick={isMobile ? () => setDrawerOpen(false) : onItemClick}
        />
      ))}
    </ul>
  );

  const content = (
    <>
      <div className={styles.logoZone}>{logo}</div>
      <nav className={styles.nav} aria-label="Documentation navigation">
        {treeContent}
      </nav>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className={styles.hamburgerButton}
        >
          <MenuIcon size={24} />
        </Button>
        <Drawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          position="left"
          size="lg"
          overlay={true}
          closeOnOverlayClick={true}
          closeOnEscape={true}
          aria-label="Navigation menu"
        >
          <div className={styles.drawerContent}>{content}</div>
        </Drawer>
      </>
    );
  }

  return (
    <aside
      id={id}
      data-testid={dataTestId}
      className={styles.aside}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {content}
    </aside>
  );
}
