/**
 * @digilist-saas/ds
 * 
 * Xala Design System - Production-ready components built on Digdir Designsystemet
 * 
 * ## Component Hierarchy
 * 
 * ### Primitives (Low-level)
 * - Container, Grid, Stack - Layout primitives
 * - Button, Input, Card, etc. - From @digdir/designsystemet-react
 * 
 * ### Composed (Mid-level)
 * - ContentLayout, ContentSection, PageHeader
 * - Built from primitives
 * 
 * ### Blocks (Business logic)
 * - Dashboard, Auth, Messaging, Filters, Navigation
 * - Built from composed components
 * 
 * ### Shells (Application level)
 * - AppDashboardLayout, PlatformLayout - Complete application layouts
 * - Built from blocks and composed components
 */

// =============================================================================
// Re-export everything from Digdir Designsystemet
// =============================================================================
export * from '@digdir/designsystemet-react';

// =============================================================================
// Provider
// =============================================================================
export * from './provider';

// =============================================================================
// Theme registry (Designsystemet token-first theming)
// =============================================================================
export {
  DEFAULT_THEME,
  THEMES,
  getThemeUrls,
  type ThemeId,
} from './themes';

// =============================================================================
// Component Layers - Import from specific layers
// =============================================================================

// Shells - High-level layout components
export {
  PlatformLayout,
  AppDashboardLayout,
  LayoutSidebar,
  DashboardSidebar,
  BrandedLogo,
  TreeNavSidebar,
} from './shells';
export type {
  PlatformLayoutProps,
  AppDashboardLayoutProps,
  LayoutSidebarProps,
  DashboardSidebarProps,
  BrandedLogoProps,
  TreeNavSidebarProps,
  TreeNavItem,
} from './shells';

// Composed - Mid-level components
export {
  ContentLayout,
  ContentSection,
  PageHeader,
  HeaderLogo,
  HeaderSearch,
  HeaderActions,
  HeaderActionButton,
  HeaderIconButton,
  HeaderThemeToggle,
  HeaderLanguageSwitch,
  HeaderLoginButton,
  ListingFilter,
  Drawer,
  DrawerSection,
  DrawerItem,
  DrawerEmptyState,
  FilterDrawer,
  Breadcrumb,
  BottomNavigation,
  PillTabs,
  PillDropdown,
  // StarRating
  StarRating,
  // Dialogs (Dialog from DigDir via export *)
  DialogProvider,
  useDialog,
  ConfirmDialog,
  AlertDialog,
  // Data Table
  DataTable,
  // Back Button
  BackButton,
  // Slot Grid
  SlotGrid,
  // Filter Toolbar
  FilterToolbar,
} from './composed';
export { mockFilterData } from './composed';
export type {
  ContentLayoutProps,
  ContentSectionProps,
  PageHeaderProps,
  HeaderLogoProps,
  HeaderSearchProps,
  HeaderActionsProps,
  HeaderIconButtonProps,
  HeaderThemeToggleProps,
  HeaderLanguageSwitchProps,
  HeaderLoginButtonProps,
  ListingFilterProps,
  ListingFilterState,
  ListingFilterLabels,
  CategoryOption as ListingCategoryOption,
  SubcategoryOption,
  CityOption,
  FacilityOption,
  SortOption,
  SearchResultItem,
  SearchResultGroup,
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
  FilterConfig,
  DrawerProps,
  DrawerPosition,
  DrawerSize,
  DrawerSectionProps,
  DrawerItemProps,
  DrawerEmptyStateProps,
  FilterDrawerProps,
  FilterDrawerSection,
  FilterDrawerLabels,
  BreadcrumbProps,
  BottomNavigationProps,
  BottomNavigationItem,
  PillTabsProps,
  PillTab,
  PillDropdownProps,
  PillDropdownOption,
  PillDropdownLabels,
  // StarRating Types
  StarRatingProps,
  // Dialog Types
  ConfirmDialogProps,
  AlertDialogProps,
  DialogVariant,
  // Data Table Types
  DataTableProps,
  DataTableColumn,
  SortState,
  PaginationState,
  // Back Button Types
  BackButtonProps,
  // Slot Grid Types
  SlotGridProps,
  SlotStatus,
  SlotGridColumnHeader,
  SlotGridRowHeader,
  SlotGridLegendItem,
  SlotGridLegendStatus,
  // Filter Toolbar Types
  FilterToolbarProps,
  FilterToolbarSlotProps,
} from './composed';

// =============================================================================
// Hooks & Utils
// =============================================================================
export { useBreakpoint, useIsMobile, DS_BREAKPOINTS } from './hooks/useBreakpoint';
export { getNavIcon } from './utils/navIconMap';
export type { Breakpoint } from './hooks/useBreakpoint';

// Accessibility - WCAG-compliant primitives
export {
  SkipLinks,
} from './accessibility';
export type {
  SkipLinksProps,
  SkipLink,
} from './accessibility';

// Primitives - Low-level building blocks
export {
  Container,
  Grid,
  Stack,
  Icon,
  SunIcon,
  MoonIcon,
  SearchIcon,
  GlobeIcon,
  UserIcon,
  LogOutIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  CalendarIcon,
  PeopleIcon,
  ShoppingCartIcon,
  BellIcon,
  HeartIcon,
  SettingsIcon,
  LayoutGrid, // For backward compatibility
  CheckIcon,
  PhoneIcon,
  MailIcon,
  ClockIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ProjectorIcon,
  WifiIcon,
  BoardIcon,
  VideoIcon,
  InfoIcon,
  CloseIcon,
  SparklesIcon,
  UsersIcon,
  CheckCircleIcon,
  StarIcon,
  ShieldIcon,
  ShieldCheckIcon,
  PlatformIcon,
  AutomationIcon,
  TrendUpIcon,
  TrendDownIcon,
  DownloadIcon,
  MoreVerticalIcon,
  HomeIcon,
  BuildingIcon,
  SportIcon,
  InboxIcon,
  BookOpenIcon,
  RepeatIcon,
  MessageIcon,
  ChartIcon,
  ArrowRightIcon,
  XCircleIcon,
  PlusIcon,
  MessageSquareIcon,
  IdPortenIcon,
  MicrosoftIcon,
  GoogleIcon,
  BankIdIcon,
  VippsIcon,
  SendIcon,
  OrganizationIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  PaperclipIcon,
  XIcon,
  SaveIcon,
  CopyIcon,
  EyeIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  ArrowLeftIcon,
  FileTextIcon,
  ClipboardListIcon,
  TableIcon,
  PlayIcon,
  LockIcon,
  UnlockIcon,
  UploadIcon,
  CameraIcon,
  ImageIcon,
  MaximizeIcon,
  AccessibilityIcon,
  WalletIcon,
  SortIcon,
  TagIcon,
  SlidersIcon,
  MenuIcon,
  CreditCardIcon,
  CoffeeIcon,
  ParkingIcon,
  UtensilsIcon,
  AirConditionerIcon,
  ToiletIcon,
  HeartFilledIcon,
  AlertCircleIcon,
  WrenchIcon,
  VolumeOffIcon,
  FacebookIcon,
  InstagramIcon,
  TwitterXIcon,
  LinkedinIcon,
  YoutubeIcon,
  TiktokIcon,
  WhatsappIcon,
  SquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  DropletIcon,
  ShirtIcon,
  SpeakerIcon,
  MusicIcon,
  BriefcaseIcon,
  WineGlassIcon,
  ElevatorIcon,
  TicketIcon,
  FormField,
  Badge,
  NativeSelect,
} from './primitives';
export type {
  ContainerProps,
  GridProps,
  StackProps,
  IconProps,
  LayoutGridProps,
  FormFieldProps,
  BadgeProps,
  NativeSelectProps,
} from './primitives';

// Blocks - Platform-generic business logic components
// Blocks - Platform-generic business logic components
export {
  RequireAuthModal,
  LoginOption,
  LoginDivider,
  DemoLoginGrid,
  FeatureItem,
  IntegrationBadge,
  LoginFooterLink,
  LoginLayout,
  StatCard,
  ActivityItem,
  ActivityFeed,
  QuickActionCard,
  formatTimeAgo,
  // Status Badge Components (platform-generic)
  StatusTag,
  PaymentStatusBadge,
  OrganizationStatusBadge,
  UserStatusBadge,
  StatusBadge,
  statusConfigs,
  // Chart Components
  BarChart,
  VerticalBarChart,
  // Auth UI Components
  LoadingScreen,
  AccessDeniedScreen,
  NotFoundScreen,
  ErrorScreen,
  PermissionGate,
  // Messaging Components
  NotificationBell,
  NotificationCenter,
  NotificationItem,
  ConversationList,
  ConversationListItem,
  MessageBubble,
  ChatThread,
  // Error Handling Components
  ErrorBoundary,
  withErrorBoundary,
  GlobalErrorHandler,
  useGlobalError,
  // Feedback Components
  ToastProvider,
  useToast,
  Skeleton,
  SkeletonCard,
  EmptyState,
  LoadingState,
  ErrorState,
  // Utility Components
  IconBox,
  CardHeader,
  MetadataRow,
  HiddenFileInput,
  // Form Components
  FormSection,
  FormActions,
  InfoBox,
  // Filter Components (from blocks/filters)
  FilterDropdown,
  SearchFilter,
  // Settings Components
  SettingsToggle,
  SettingsSection,
  AvatarDisplay,
  // Navigation
  Sidebar,
  AppHeader,
  UserMenu,
  DashboardHeader,
  DashboardPageHeader,
  TableToolbar,
  PageContentLayout,
  RightSidebar,
  // Status Indicator
  StatusDot,
  // Interactive Components
  SearchBar,
  FileUpload,
  VenueSelector,
  // Form Components
  RichTextEditor,
  RichTextDisplay,
  // Pattern Components
  StatusBanner,
  RevisionDiffView,
  // Metric Components
  MetricCard,
  // Progress
  ProgressBar,
  // Migrated Blocks
  BadgeRow,
  MediaGallery,
  ShareButton,
  MediaCarousel,
  QRCodeDialog,
  // Interactive Components
  ActionMenu,
  // CRUD Blocks
  CrudStatGrid,
  CrudListItem,
  CrudFormPage,
  CrudWizard,
} from './blocks';

export type {
  RequireAuthModalProps,
  LoginOptionProps,
  LoginDividerProps,
  DemoUser,
  DemoLoginGridProps,
  FeatureItemProps,
  IntegrationBadgeProps,
  LoginFooterLinkProps,
  LoginLayoutProps,
  StatCardProps,
  ActivityItemProps,
  ActivityStatus,
  ActivityFeedProps,
  QuickActionProps,
  // Status Badge Types (platform-generic)
  StatusTagProps,
  BadgeColor,
  StatusBadgeConfig,
  PaymentStatusType,
  PaymentStatusBadgeProps,
  OrganizationStatusType,
  OrganizationStatusBadgeProps,
  UserStatusType,
  UserStatusBadgeProps,
  StatusBadgeProps,
  StatusBadgeDomain,
  // Chart Types
  BarChartDataItem,
  BarChartProps,
  VerticalBarChartProps,
  // Auth UI Types
  LoadingScreenProps,
  AccessDeniedScreenProps,
  NotFoundScreenProps,
  ErrorScreenProps,
  PermissionGateProps,
  // Messaging Types
  NotificationBellProps,
  NotificationCenterProps,
  NotificationFilter,
  NotificationItemData,
  NotificationItemProps,
  NotificationType,
  NotificationPriority,
  ConversationListProps,
  ConversationListItemProps,
  ConversationItem,
  MessageBubbleProps,
  MessageItem,
  ChatThreadProps,
  // Error Handling Types
  ErrorBoundaryProps,
  WithErrorBoundaryOptions,
  GlobalErrorHandlerProps,
  GlobalError,
  UseGlobalErrorOptions,
  // Feedback Types
  ToastMessage,
  SkeletonProps,
  SkeletonCardProps,
  EmptyStateProps,
  LoadingStateProps,
  ErrorStateProps,
  FormSectionProps,
  FormActionsProps,
  InfoBoxProps,
  InfoBoxVariant,
  SettingsToggleProps,
  SettingsSectionProps,
  AvatarDisplayProps,
  SidebarProps,
  SidebarNavItem,
  SidebarNavSection,
  AppHeaderProps,
  UserMenuProps,
  DashboardHeaderProps,
  DashboardPageHeaderProps,
  ActiveFilter,
  TableToolbarProps,
  PageContentLayoutProps,
  RightSidebarProps,
  RightSidebarItem,
  StatusDotProps,
  // Interactive Types
  SearchBarProps,
  SearchSuggestion,
  FileUploadProps,
  UploadedFile,
  UploadResult,
  VenueSelectorProps,
  VenueSelectorItem,
  // Form Types
  RichTextEditorProps,
  RichTextDisplayProps,
  // Pattern Types
  StatusBannerProps,
  BannerType,
  RevisionDiffViewProps,
  // Metric Types
  MetricCardProps,
  // Progress Types
  ProgressBarProps,
  ProgressBarVariant,
  BadgeRowProps,
  BadgeItem,
  MediaGalleryProps,
  ShareButtonProps,
  ShareData,
  SharePlatformConfig,
  MediaCarouselProps,
  QRCodeDialogProps,
  // Interactive Types
  ActionMenuProps,
  Action,
  // CRUD Block Types
  CrudStatGridProps,
  CrudStat,
  CrudListItemProps,
  CrudListItemStatus,
  CrudListItemTag,
  CrudListItemAvatarProps,
  CrudFormPageProps,
  CrudWizardProps,
  CrudWizardStep,
} from './blocks';

// Listing Detail Types
export type {
  TimeSlotStatus,
  GalleryImage,
  Facility,
  AdditionalService,
  OpeningHoursDay,
  TimeSlot,
  BreadcrumbItem,
  BookingStep,
  BookingDetails,
  GuidelineSection,
  FAQItem,
  ListingDisplayBaseProps,
  ActivityType
} from './types/listing-detail';

// =============================================================================
// Design System Utilities & Tokens
// =============================================================================
export {
  cn,
  spacing,
  interactiveBackgrounds,
  badgeStyles,
  menuItemStyles,
  emptyStateStyles,
  buttonTextColors,
  logoStyles,
  brandColors,
  brandColorsCss,
} from './utils';

// =============================================================================
// API Error Utilities (RFC 7807 Problem Details)
// =============================================================================
export {
  parseApiError,
  parseErrorObject,
  getStatusMessage,
  formatFieldErrors,
  shouldOfferRetry,
  createProblemDetails,
} from './utils/api-error';
export type {
  ProblemDetails,
  ParsedApiError,
  ApiErrorCategory,
} from './utils/api-error';

// =============================================================================
// CSS Import Policy
// =============================================================================
/** 
 * We intentionally do NOT export Digdir CSS from this module. Applications
 * must import '@digilist-saas/ds/styles' exactly once in their entry point to ensure
 * proper theme switching and prevent CSS duplication.
 */
