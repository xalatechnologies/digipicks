/**
 * @digipicks/sdk
 *
 * Source-only SDK for DigilistSaaS applications using Convex backend.
 *
 * @example
 * ```typescript
 * import {
 *   XalaConvexProvider,
 *   useAuth,
 *   useResources,
 * } from '@digipicks/sdk';
 *
 * function App() {
 *   return (
 *     <XalaConvexProvider>
 *       <MyApp />
 *     </XalaConvexProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *   const { resources, isLoading } = useResources({ tenantId });
 *
 *   return (
 *     <div>
 *       {isLoading ? 'Loading...' : resources.map(r => r.name)}
 *     </div>
 *   );
 * }
 * ```
 */

// ============================================
// CONVEX PROVIDER
// ============================================

export { XalaConvexProvider, ConvexProvider } from './convex-provider';

// Cached query hooks from convex-helpers for optimized subscriptions
// These are drop-in replacements for useQuery that benefit from the cache provider
export {
  useQuery as useCachedQuery,
  usePaginatedQuery as useCachedPaginatedQuery,
  useQueries as useCachedQueries,
} from 'convex-helpers/react/cache';

// Convex API types for type-safe function references
export { api, type Id, type TenantId, type ResourceId, type UserId, type OrganizationId } from './convex-api';

// ============================================
// TYPES
// ============================================

export * from './types';

// ============================================
// HOOKS
// ============================================

export * from './hooks';

// ============================================
// COMPATIBILITY SHIMS
// ============================================
// No-op stubs for code migrated from @digilist/client-sdk.
// initializeClient, queryKeys, realtime hooks, etc.

export * from './compat';

// ============================================
// TRANSFORMS (re-exported for convenience)
// ============================================
// Note: Type names that overlap with ./hooks (Listing, ListingType, etc.)
// are intentionally omitted here — the canonical exports come from ./hooks.

export {
  toPaginatedResponse,
  toQueryResult,
  toMutationResult,
  epochToISO,
  isoToEpoch,
  convexResourceToListing,
  listingInputToConvexResource,
  transformListing,
} from './transforms';

export type {
  PaginationMeta,
  QueryResult,
  MutationResult,
  PricingUnit,
  // ListingLocation, CreateListingDTO, UpdateListingDTO already re-exported via ./hooks
  TechnicalSpecs,
  VenueDimensions,
  FAQItem,
  RuleItem,
  DocumentItem,
  OpeningHoursEntry,
  ConvexResource,
  UiListing,
} from './transforms';

// ============================================
// FORMATTERS
// ============================================

export {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatPercent,
  formatWeekRange,
  formatWeekdays,
  formatPeriod,
  formatTimeSlot,
  formatTimeRange,
  calculateDuration,
  formatRelativeDate,
  formatRelativeTimeCompact,
  formatTimeAgo,
  formatMessageDate,
  mapPaymentStatus,
  getListingTypeLabel,
} from './formatters';

// ============================================
// CONSTANTS
// ============================================

export { LISTING_TYPE_OPTIONS, LISTING_TYPE_LABELS } from './constants';

// ============================================
// SHARE UTILITIES
// ============================================

export {
  buildShareUrl,
  isNativeShareAvailable,
  shareNative,
  shareCopyLink,
  shareEmail,
  shareWhatsApp,
  shareFacebook,
  shareTwitter,
  shareLinkedIn,
  shareWithAudit,
} from './share-utils';
export type { ShareMedium, ShareData, ShareResult } from './share-utils';

// ============================================
// AUDIT UTILITIES
// ============================================

export { logListingAuditEvent, type ListingAuditEventType } from './audit-utils';

// ============================================
// UPLOAD UTILITIES
// ============================================

export { UploadProgressTracker, formatBytes, formatSpeed, formatETA } from './upload';
export type { UploadProgressEvent } from './upload';

// ============================================
// PRICING UTILITIES
// ============================================

export {
  calculateBookingPrice,
  getPriceLabel,
  getConstraintsSummary,
  validateBookingConstraints,
} from './utils/pricing';

export type {
  BookingMode as PricingBookingMode,
  PricingModel,
  ResourcePricingConfig as PricingResourceConfig,
  BookingDetails as PricingBookingDetails,
  PriceLineItem,
  PriceCalculationResult as PricingCalculationResult,
} from './utils/pricing';

// ============================================
// WEBMCP (AI agent tool exposure)
// ============================================

export { useWebMCPTools } from './webmcp';
export type { UseWebMCPToolsOptions } from './webmcp';

export { useBackofficeWebMCPTools } from './webmcp';
export type { UseBackofficeWebMCPToolsOptions } from './webmcp';

export { useMinsideWebMCPTools } from './webmcp';
export type { UseMinsideWebMCPToolsOptions } from './webmcp';

export { useLeaderboard } from './hooks/use-leaderboard';
export type {
  LeaderboardTimeframe,
  LeaderboardSortBy,
  StreakType,
  LeaderboardEntry,
  UseLeaderboardParams,
} from './hooks/use-leaderboard';

// ============================================
// CREATOR APPLICATIONS
// ============================================

export {
  useMyCreatorApplication,
  useCreatorApplicationQueue,
  useCreatorApplicationCounts,
  useCreatorApplication,
  useUpsertCreatorDraft,
  useSubmitCreatorApplication,
  useDiscardCreatorDraft,
  useReviewCreatorApplication,
} from './hooks/use-creator-applications';
export type {
  CreatorApplicationStatus,
  CreatorApplicationLink,
  CreatorApplication,
  CreatorApplicationCounts,
  DraftInput as CreatorApplicationDraftInput,
} from './hooks/use-creator-applications';
