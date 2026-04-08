/**
 * CRUD Blocks
 *
 * Higher-level building blocks for CRUD listing, detail, and form pages.
 * Compose existing DS primitives (PageContentLayout, DashboardPageHeader,
 * FilterToolbar, DataTable, StatusBadge, ActionMenu) into reusable patterns.
 */

export { CrudStatGrid } from './CrudStatGrid';
export type { CrudStatGridProps, CrudStat } from './CrudStatGrid';

export { CrudListItem } from './CrudListItem';
export type {
  CrudListItemProps,
  CrudListItemStatus,
  CrudListItemTag,
  CrudListItemAvatarProps,
} from './CrudListItem';

export { CrudFormPage } from './CrudFormPage';
export type { CrudFormPageProps } from './CrudFormPage';

export { CrudWizard } from './CrudWizard';
export type { CrudWizardProps, CrudWizardStep } from './CrudWizard';
