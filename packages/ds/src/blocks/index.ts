/**
 * Blocks
 *
 * Platform-generic business-logic components composed from primitives and composed components.
 * Domain-specific components (listings, bookings, etc.) live at the application level.
 */

// Types (shared)
export type { FAQItem, ListingDisplayBaseProps } from '../types/listing-detail';

// Auth Gating Modal
export { RequireAuthModal } from './RequireAuthModal';
export type { RequireAuthModalProps } from './RequireAuthModal';

// Login Components
export {
  LoginOption,
  LoginDivider,
  DemoLoginGrid,
  FeatureItem,
  IntegrationBadge,
  LoginFooterLink,
  LoginLayout
} from './LoginComponents';
export type {
  LoginOptionProps,
  LoginDividerProps,
  DemoUser,
  DemoLoginGridProps,
  FeatureItemProps,
  IntegrationBadgeProps,
  LoginFooterLinkProps,
  LoginLayoutProps
} from './LoginComponents';

// Dashboard Components
export {
  StatCard,
  ActivityItem,
  ActivityFeed,
  QuickActionCard,
  formatTimeAgo,
} from './DashboardComponents';
export type {
  StatCardProps,
  ActivityItemProps,
  ActivityStatus,
  ActivityFeedProps,
  QuickActionProps,
} from './DashboardComponents';

// Status Badge Components (platform-generic only)
export {
  StatusTag,
  StatusBadge,
  OrganizationStatusBadge,
  UserStatusBadge,
  PaymentStatusBadge,
  statusConfigs,
} from './StatusBadges';
export type {
  StatusTagProps,
  BadgeColor,
  StatusBadgeConfig,
  StatusBadgeProps,
  StatusBadgeDomain,
  OrganizationStatusType,
  OrganizationStatusBadgeProps,
  UserStatusType,
  UserStatusBadgeProps,
  PaymentStatusType,
  PaymentStatusBadgeProps,
} from './StatusBadges';

// Chart Components
export { BarChart, VerticalBarChart } from './BarChart';
export type {
  BarChartDataItem,
  BarChartProps,
  VerticalBarChartProps,
} from './BarChart';

// Auth UI Components
export {
  LoadingScreen,
  AccessDeniedScreen,
  NotFoundScreen,
  ErrorScreen,
  PermissionGate,
} from './AuthComponents';
export type {
  LoadingScreenProps,
  AccessDeniedScreenProps,
  NotFoundScreenProps,
  ErrorScreenProps,
  PermissionGateProps,
} from './AuthComponents';

// NotificationBell
export { NotificationBell } from './NotificationBell';
export type { NotificationBellProps } from './NotificationBell';

// NotificationCenter
export { NotificationCenter } from './NotificationCenter';
export type { NotificationCenterProps, NotificationFilter } from './NotificationCenter';

// NotificationItem
export { NotificationItem } from './NotificationItem';
export type {
  NotificationItemData,
  NotificationItemProps,
  NotificationType,
  NotificationPriority,
} from './NotificationItem';

// Messaging Components
export {
  ConversationList,
  ConversationListItem,
  MessageBubble,
  ChatThread,
} from './messaging';
export type {
  ConversationListProps,
  ConversationListItemProps,
  ConversationItem,
  MessageBubbleProps,
  MessageItem,
  ChatThreadProps,
} from './messaging';

// Error Handling Components
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps, WithErrorBoundaryOptions } from './ErrorBoundary';

export { GlobalErrorHandler, useGlobalError } from './GlobalErrorHandler';
export type {
  GlobalErrorHandlerProps,
  GlobalError,
  UseGlobalErrorOptions,
} from './GlobalErrorHandler';

// Feedback Components
export { ToastProvider, useToast } from './feedback/Toast';
export type { ToastMessage } from './feedback/Toast';

export { Skeleton, SkeletonCard } from './feedback/Skeleton';
export type { SkeletonProps, SkeletonCardProps } from './feedback/Skeleton';

export { EmptyState } from './feedback/EmptyState';
export type { EmptyStateProps } from './feedback/EmptyState';

export { LoadingState } from './feedback/LoadingState';
export type { LoadingStateProps } from './feedback/LoadingState';

export { ErrorState } from './feedback/ErrorState';
export type { ErrorStateProps } from './feedback/ErrorState';

// Settings Components
export { SettingsToggle, SettingsSection, AvatarDisplay } from './settings';
export type { SettingsToggleProps, SettingsSectionProps, AvatarDisplayProps } from './settings';

// Form Components
export { FormSection, FormActions, InfoBox } from './forms';
export type { FormSectionProps, FormActionsProps, InfoBoxProps, InfoBoxVariant } from './forms';

export { RichTextEditor } from './forms/RichTextEditor';
export type { RichTextEditorProps } from './forms/RichTextEditor';

export { RichTextDisplay } from './forms/RichTextDisplay';
export type { RichTextDisplayProps } from './forms/RichTextDisplay';

// Interactive Components
export * from './interactive';

// Pattern Components
export * from './patterns';

// Utility Components
export * from './utility';

// Layout Components
export * from './layout';

// Navigation Components
export * from './navigation';

// Filter Components
export * from './filters';

// CRUD Blocks
export * from './crud';

// =============================================================================
// Migrated Blocks
// =============================================================================

// BadgeRow
export { BadgeRow } from './BadgeRow';
export type { BadgeRowProps, BadgeItem } from './BadgeRow';

// MetricCard
export { MetricCard } from './MetricCard';
export type { MetricCardProps } from './MetricCard';

// ToggleActionButton
export { ToggleActionButton } from './ToggleActionButton';
export type { ToggleActionButtonProps } from './ToggleActionButton';

// MediaGallery
export { MediaGallery } from './MediaGallery';
export type { MediaGalleryProps } from './MediaGallery';

// ShareButton
export { ShareButton } from './ShareButton';
export type { ShareButtonProps, ShareData, SharePlatformConfig } from './ShareButton';

// MediaCarousel
export { MediaCarousel } from './MediaCarousel';
export type { MediaCarouselProps } from './MediaCarousel';

// StatusDot
export { StatusDot } from './StatusDot';
export type { StatusDotProps } from './StatusDot';

// ProgressBar
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressBarVariant } from './ProgressBar';

// QRCodeDialog
export { QRCodeDialog } from './QRCodeDialog';
export type { QRCodeDialogProps } from './QRCodeDialog';

// PushNotificationPrompt
export { PushNotificationPrompt } from './PushNotificationPrompt';
export type { PushNotificationPromptProps } from './PushNotificationPrompt';
