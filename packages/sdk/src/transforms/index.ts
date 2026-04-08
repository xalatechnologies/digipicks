/**
 * DigilistSaaS SDK - Transform Layer
 *
 * Re-exports all transform functions and types for converting between
 * the Convex internal data shapes and the digdir client-sdk shapes.
 *
 * Usage:
 *   import { convexResourceToListing, toPaginatedResponse } from '@digilist-saas/sdk/transforms';
 */

// Common utilities (pagination, query/mutation result wrappers, timestamp helpers)
export {
    toPaginatedResponse,
    toSingleResponse,
    toQueryResult,
    toMutationResult,
    epochToISO,
    isoToEpoch,
} from './common';

export type {
    PaginationMeta,
    PaginatedResponse,
    SingleResponse,
    QueryResult,
    MutationResult,
} from './common';

// Listing transforms and types
export {
    convexResourceToListing,
    listingInputToConvexResource,
    transformListing,
    LISTING_TYPE_TO_CATEGORY,
    CATEGORY_TO_TYPE,
    CATEGORY_TO_LISTING_TYPE,
} from './listing';

export type {
    Listing,
    ListingType,
    ListingStatus,
    ListingPricing,
    ListingLocation,
    ListingMetadata,
    BookingModel,
    PricingUnit,
    TechnicalSpecs,
    VenueDimensions,
    BookingConfig,
    FAQItem,
    RuleItem,
    DocumentItem,
    OpeningHoursEntry,
    CreateListingDTO,
    UpdateListingDTO,
    ListingQueryParams,
    AvailabilityQueryParams,
    PublicListingParams,
    ConvexResource,
    UiListing,
} from './listing';

// Review transforms
export { transformReview } from './review';
export type { ConvexReview } from './review';

// Organization & User transforms
export {
    transformOrganization,
    transformOrganizationWithChildren,
    transformUser,
    transformCurrentUser,
} from './organization';
export type { ConvexOrganization, ConvexUser } from './organization';

// Notification transforms
export { transformNotification, transformNotificationPreferences } from './notification';
export type { ConvexNotification, ConvexNotificationPreference } from './notification';

// Conversation & Message transforms
export {
    transformConversation,
    transformConversationEnriched,
    transformMessage,
} from './conversation';
export type {
    ConvexConversation,
    ConvexConversationEnriched,
    ConvexMessage,
} from './conversation';

// Billing transforms
export { transformInvoice, transformOrgInvoice } from './billing';
export type { ConvexInvoice, ConvexOrgInvoice } from './billing';

// Audit transforms
export {
    transformAuditEntry,
    transformEntityAuditEntry,
    transformAuditStats,
    transformTenantActivity,
    transformTenantActivityStats,
} from './audit';
export type {
    ConvexAuditEntry,
    ConvexEntityAuditEntry,
    ConvexTenantActivityEntry,
} from './audit';

// Addon transforms
export {
    transformAddon,
    transformResourceAddon,
} from './addon';
export type {
    Addon as SdkAddon,
    ResourceAddon as SdkResourceAddon,
    ConvexAddon,
    ConvexResourceAddon,
} from './addon';

// Pricing transforms
export {
    transformResourcePricingEntry,
    transformPricingGroup,
} from './pricing';
export type {
    ResourcePricingConfig as SdkResourcePricingConfig,
    ResourcePricingEntry as SdkResourcePricingEntry,
    PricingGroup as SdkPricingGroup,
    CalculatePriceResult as SdkCalculatePriceResult,
    ConvexResourcePricingEntry,
    ConvexPricingGroup,
} from './pricing';
