/**
 * Composed Components
 * 
 * Higher-level components built from primitives
 */

// DataTable - Generic data table with sorting, pagination, selection
export { DataTable } from './DataTable';
export type {
  DataTableProps,
  DataTableColumn,
  SortState,
  PaginationState,
} from './DataTable';

export { ContentLayout } from './content-layout';
export type { ContentLayoutProps } from './content-layout';

export { ContentSection } from './content-section';
export type { ContentSectionProps } from './content-section';

export { PageHeader } from './page-header';
export type { PageHeaderProps } from './page-header';



export {
  HeaderLogo,
  HeaderSearch,
  HeaderActions,
  HeaderActionButton,
  HeaderIconButton,
  HeaderThemeToggle,
  HeaderLanguageSwitch,
  HeaderLoginButton
} from './header-parts';
export type {
  HeaderLogoProps,
  HeaderSearchProps,
  HeaderActionsProps,
  HeaderIconButtonProps,
  HeaderThemeToggleProps,
  HeaderLanguageSwitchProps,
  HeaderLoginButtonProps,
  SearchResultItem,
  SearchResultGroup
} from './header-parts';



// Listing Filter (Enhanced)
export { ListingFilter } from './listing-filter';
export type {
  ListingFilterProps,
  ListingFilterState,
  ListingFilterLabels,
  CategoryOption,
  SubcategoryOption,
  FacilityOption,
  VenueOption,
  SortOption,
  CityOption,
} from './listing-filter';

// Filter Types
export type {
  ListingType,
  VenueType,
  PriceUnit,
  AvailabilityStatus,
  FilterOption,
  PriceRangeFilter,
  CapacityRangeFilter,
  RatingFilter,
  LocationFilter,
  FacilitiesFilter,
  DateTimeFilter,
  FilterState,
  FilterConfig
} from '../types/filters';
export { mockFilterData } from '../types/filters';

// Drawer / Slide Panel
export { Drawer, DrawerSection, DrawerItem, DrawerEmptyState } from './Drawer';
export { FilterDrawer } from './FilterDrawer';
export type {
  DrawerProps,
  DrawerPosition,
  DrawerSize,
  DrawerSectionProps,
  DrawerItemProps,
  DrawerEmptyStateProps
} from './Drawer';
export type {
  FilterDrawerProps,
  FilterDrawerSection,
  FilterDrawerLabels,
} from './FilterDrawer';

// Breadcrumb
export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbProps } from './Breadcrumb';

// Dialogs (Dialog comes from @digdir/designsystemet-react via export *)
export {
  ConfirmDialog,
  AlertDialog,
  DialogProvider,
  useDialog
} from './dialogs';
export type {
  ConfirmDialogProps,
  AlertDialogProps,
  DialogVariant
} from './dialogs';

export { BottomNavigation } from './bottom-navigation';
export type {
  BottomNavigationProps,
  BottomNavigationItem
} from './bottom-navigation';

// Pill Tabs
export { PillTabs } from './PillTabs';
export type { PillTabsProps, PillTab } from './PillTabs';

// Pill Dropdown (matches PillTabs styling)
export { PillDropdown } from './PillDropdown';
export type { PillDropdownProps, PillDropdownOption, PillDropdownLabels } from './PillDropdown';

// Star Rating
export { StarRating } from './StarRating';
export type { StarRatingProps } from './StarRating';

// Back Button
export { BackButton } from './BackButton';
export type { BackButtonProps } from './BackButton';

// Filter Toolbar (reusable toolbar card for table filters)
export { FilterToolbar } from './FilterToolbar';
export type { FilterToolbarProps, FilterToolbarSlotProps } from './FilterToolbar';

// Slot Grid (time×days selectable grid)
export { SlotGrid } from './SlotGrid';
export type {
  SlotGridProps,
  SlotStatus,
  SlotGridColumnHeader,
  SlotGridRowHeader,
  SlotGridLegendItem,
  SlotGridLegendStatus,
} from './SlotGrid';

