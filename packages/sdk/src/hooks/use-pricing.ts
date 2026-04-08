/**
 * Pricing Hooks
 * Hooks for calculating prices and retrieving pricing configuration.
 * Integrates with resource pricing rules from the database.
 */

import { useQuery, useMutation } from './convex-utils';
import { api } from '../convex-api';
import type { Id } from '../convex-api';
import {
  getConstraintsSummary,
  type BookingMode,
  type ResourcePricingConfig as UtilResourcePricingConfig,
  type PriceCalculationResult,
} from '../utils/pricing';

// =============================================================================
// Types
// =============================================================================

export interface PriceBreakdown {
  basePrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  addons: Array<{ addonId: string; name: string; price: number }>;
  addonsTotal: number;
  cleaningFee: number;
  depositAmount: number;
}

export interface PricingDetails {
  priceType: string;
  pricePerHour?: number;
  pricePerDay?: number;
  basePrice: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface CalculatePriceResult {
  breakdown: PriceBreakdown;
  total: number;
  currency: string;
  durationHours: number;
  pricingDetails: PricingDetails;
}

/**
 * Pricing configuration as returned from hooks.
 * Note: This is different from UtilPricingConfig which is used for calculations.
 */
export interface ResourcePricingConfig {
  // Pricing model and rates
  model: string;
  basePrice?: number;
  currency: string;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerHalfDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  pricePerPerson?: number;
  pricePerPersonHour?: number;
  // Constraints
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  minPeople?: number;
  maxPeople?: number;
  // Fees
  depositAmount?: number;
  cleaningFee?: number;
  serviceFee?: number;
  // Tax
  taxRate?: number;
}

/**
 * Full resource pricing entry as stored in the pricing component table.
 */
export interface ResourcePricingEntry {
  _id: string;
  _creationTime: number;
  tenantId: string;
  resourceId: string;
  resourceName?: string;
  pricingGroupId?: string;
  priceType: string;
  basePrice: number;
  currency: string;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerHalfDay?: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  minDuration?: number;
  maxDuration?: number;
  minPeople?: number;
  maxPeople?: number;
  depositAmount?: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxRate?: number;
  taxIncluded?: boolean;
  weekendMultiplier?: number;
  holidayMultiplier?: number;
  isActive: boolean;
}

export interface PricingGroup {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  priority: number;
  isActive: boolean;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Calculate the price for a booking
 */
export function useCalculatePrice(
  resourceId: string | undefined,
  startTime: number | undefined,
  endTime: number | undefined,
  options?: {
    userId?: string;
    organizationId?: string;
    addonIds?: string[];
  }
): {
  data: CalculatePriceResult | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!resourceId && !!startTime && !!endTime;
  const result = useQuery(
    api.domain.pricing.calculatePrice,
    enabled
      ? {
        resourceId: resourceId as Id<'resources'>,
        startTime: startTime!,
        endTime: endTime!,
        userId: options?.userId as Id<'users'> | undefined,
        organizationId: options?.organizationId as Id<'organizations'> | undefined,
        addonIds: options?.addonIds as Id<'addons'>[] | undefined,
      }
      : "skip"
  );

  return {
    data: result as CalculatePriceResult | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Get pricing configuration for a resource
 */
export function useResourcePricing(
  resourceId: string | undefined
): {
  data: ResourcePricingConfig | null | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!resourceId;
  const result = useQuery(
    api.domain.pricing.getResourcePricingConfig,
    enabled ? { resourceId: resourceId as Id<'resources'> } : "skip"
  );

  return {
    data: result as ResourcePricingConfig | null | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * List pricing groups for a tenant
 */
export function usePricingGroups(
  tenantId: string | undefined,
  options?: { isActive?: boolean }
): {
  data: PricingGroup[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId;
  const result = useQuery(
    api.domain.pricing.listGroups,
    enabled
      ? {
        tenantId: tenantId as Id<'tenants'>,
        isActive: options?.isActive,
      }
      : "skip"
  );

  return {
    data: result as PricingGroup[] | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * List pricing configurations for a resource
 */
export function useResourcePricingList(
  resourceId: string | undefined
): {
  data: Array<ResourcePricingConfig & { pricingGroup: PricingGroup | null }> | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!resourceId;
  const result = useQuery(
    api.domain.pricing.listForResource,
    enabled ? { resourceId: resourceId as Id<'resources'> } : "skip"
  );

  return {
    data: result as Array<ResourcePricingConfig & { pricingGroup: PricingGroup | null }> | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * List all resource pricing entries for a tenant
 */
export function useResourcePricingByTenant(
  tenantId: string | undefined
): {
  data: ResourcePricingEntry[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId;
  const result = useQuery(
    api.domain.pricing.listByTenant,
    enabled ? { tenantId: tenantId as Id<'tenants'> } : "skip"
  );

  return {
    data: result as ResourcePricingEntry[] | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create resource pricing
 */
export function useCreateResourcePricing() {
  const mutation = useMutation(api.domain.pricing.create);

  return {
    createPricing: async (data: {
      tenantId: string;
      resourceId: string;
      pricingGroupId?: string;
      priceType: string;
      basePrice: number;
      currency: string;
      minDuration?: number;
      maxDuration?: number;
      pricePerHour?: number;
      pricePerDay?: number;
      depositAmount?: number;
      cleaningFee?: number;
      rules?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        resourceId: data.resourceId as Id<'resources'>,
        pricingGroupId: data.pricingGroupId as Id<'pricingGroups'> | undefined,
        priceType: data.priceType,
        basePrice: data.basePrice,
        currency: data.currency,
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        pricePerHour: data.pricePerHour,
        pricePerDay: data.pricePerDay,
        depositAmount: data.depositAmount,
        cleaningFee: data.cleaningFee,
        rules: data.rules,
        metadata: data.metadata,
      });
    },
  };
}

/**
 * Update resource pricing
 */
export function useUpdateResourcePricing() {
  const mutation = useMutation(api.domain.pricing.update);

  return {
    updatePricing: async (
      id: string,
      data: {
        priceType?: string;
        basePrice?: number;
        currency?: string;
        minDuration?: number;
        maxDuration?: number;
        pricePerHour?: number;
        pricePerDay?: number;
        depositAmount?: number;
        cleaningFee?: number;
        rules?: Record<string, unknown>;
        isActive?: boolean;
        metadata?: Record<string, unknown>;
      }
    ) => {
      return mutation({
        id: id as Id<'resourcePricing'>,
        ...data,
      });
    },
  };
}

/**
 * Delete resource pricing
 */
export function useDeleteResourcePricing() {
  const mutation = useMutation(api.domain.pricing.remove);

  return {
    deletePricing: async (id: string) => {
      return mutation({ id: id as Id<'resourcePricing'> });
    },
  };
}

// =============================================================================
// Pricing Group Mutations
// =============================================================================

/**
 * Create pricing group
 */
export function useCreatePricingGroup() {
  const mutation = useMutation(api.domain.pricing.createGroup);

  return {
    createGroup: async (data: {
      tenantId: string;
      name: string;
      description?: string;
      isDefault?: boolean;
      priority?: number;
      metadata?: Record<string, unknown>;
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        priority: data.priority,
        metadata: data.metadata,
      });
    },
  };
}

/**
 * Update pricing group
 */
export function useUpdatePricingGroup() {
  const mutation = useMutation(api.domain.pricing.updateGroup);

  return {
    updateGroup: async (
      id: string,
      data: {
        name?: string;
        description?: string;
        isDefault?: boolean;
        priority?: number;
        isActive?: boolean;
        metadata?: Record<string, unknown>;
      }
    ) => {
      return mutation({
        id: id as Id<'pricingGroups'>,
        ...data,
      });
    },
  };
}

/**
 * Delete pricing group
 */
export function useDeletePricingGroup() {
  const mutation = useMutation(api.domain.pricing.removeGroup);

  return {
    deleteGroup: async (id: string) => {
      return mutation({ id: id as Id<'pricingGroups'> });
    },
  };
}

// =============================================================================
// Comprehensive Booking Price Calculator
// =============================================================================

export interface SlotOption {
  minutes: number;
  label: string;
  price: number;
  isDefault?: boolean;
}

export interface UseBookingPriceOptions {
  /** Resource ID to get pricing for */
  resourceId: string | undefined;
  /** Booking mode */
  mode: BookingMode;
  /** Duration in minutes */
  durationMinutes: number;
  /** Number of attendees */
  attendees: number;
  /** Number of tickets (for TICKETS mode) */
  tickets?: number;
  /** Selected price group ID (for discounts) */
  priceGroupId?: string;
  /** Selected slot minutes (for sport_slot mode) */
  selectedSlotMinutes?: number;
  /** User ID (for user-specific pricing) */
  userId?: string;
  /** Organization ID (for org-specific pricing) */
  organizationId?: string;
  /** Booking date (timestamp) for surcharges */
  bookingDate?: number;
  /** Booking start time (e.g., "14:00") for peak hour surcharges */
  bookingTime?: string;
  /** Applied discount code */
  discountCode?: string;
}

/** Surcharge item returned from pricing calculation */
export interface SurchargeItem {
  type: 'holiday' | 'weekday' | 'peak';
  label: string;
  surchargeType: 'percent' | 'fixed' | 'multiplier';
  amount: number;
}

/** Feature toggles for pricing configuration */
export interface PricingFeatureToggles {
  /** Allow discount/coupon codes */
  enableDiscountCodes: boolean;
  /** Apply holiday/weekday surcharges */
  enableSurcharges: boolean;
  /** Allow price group selection */
  enablePriceGroups: boolean;
}

export interface UseBookingPriceResult {
  /** Full price calculation with breakdown */
  calculation: PriceCalculationResult | null;
  /** Short price label (e.g., "500 kr/time") */
  priceLabel: string;
  /** Constraints summary */
  constraints: string[];
  /** Validation result */
  validation: { valid: boolean; errors: string[] };
  /** Is loading */
  isLoading: boolean;
  /** Error */
  error: Error | null;
  /** Raw pricing config from resource */
  pricingConfig: ResourcePricingConfig | null;
  /** Available slot options (for sport_slot mode) */
  slotOptions: SlotOption[];
  /** Applied surcharges (holidays, weekdays, peak hours) */
  surcharges: SurchargeItem[];
  /** Total surcharge amount */
  surchargeTotal: number;
  /** Applied discount code info */
  discountCodeApplied: { id: string; code: string; name: string } | null;
  /** Feature toggles for this resource's pricing */
  featureToggles: PricingFeatureToggles;
}

/**
 * Comprehensive hook for calculating booking prices
 * Uses the backend calculatePriceWithBreakdown for accurate pricing
 */
export function useBookingPrice(options: UseBookingPriceOptions): UseBookingPriceResult {
  const { resourceId, mode, durationMinutes, attendees, tickets, priceGroupId, selectedSlotMinutes,
    bookingDate, bookingTime, discountCode } = options;

  const enabled = !!resourceId;

  // Helper to check if a string looks like a valid Convex ID (alphanumeric, ~20 chars)
  // Convex IDs are base32-encoded and typically 20+ characters
  const isValidConvexId = (id: string | undefined): boolean => {
    if (!id || id.trim() === '') return false;
    // Convex IDs are alphanumeric and typically 20+ characters
    // Simple semantic strings like "standard", "premium" are not valid IDs
    return id.length >= 16 && /^[a-z0-9]+$/i.test(id);
  };

  // Convert empty strings and invalid IDs to undefined
  const validPriceGroupId = isValidConvexId(priceGroupId) ? priceGroupId : undefined;
  const validDiscountCode = discountCode && discountCode.trim() !== '' ? discountCode : undefined;

  // Use the comprehensive backend calculation
  const calculationResult = useQuery(
    api.domain.pricing.calculatePriceWithBreakdown,
    enabled ? {
      resourceId: resourceId as Id<'resources'>,
      bookingMode: mode,
      durationMinutes,
      attendees,
      tickets,
      priceGroupId: validPriceGroupId as Id<'pricingGroups'> | undefined,
      selectedSlotMinutes,
      bookingDate,
      bookingTime,
      discountCode: validDiscountCode,
    } : "skip"
  );

  // Also fetch the pricing config for display info
  const pricingConfigQuery = useQuery(
    api.domain.pricing.getResourcePricingConfig,
    enabled ? { resourceId: resourceId as Id<'resources'>, bookingMode: mode } : "skip"
  );

  const isLoading = (calculationResult === undefined || pricingConfigQuery === undefined) && !!resourceId;

  // Build pricing config from backend data
  const pricingConfig: ResourcePricingConfig | null = pricingConfigQuery ? {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex→SDK boundary: priceType union→string
    model: (pricingConfigQuery.priceType as any) || 'per_hour',
    currency: pricingConfigQuery.currency || 'NOK',
    pricePerHour: pricingConfigQuery.pricePerHour,
    pricePerDay: pricingConfigQuery.pricePerDay,
    pricePerHalfDay: pricingConfigQuery.pricePerHalfDay,
    pricePerWeek: pricingConfigQuery.pricePerWeek,
    pricePerMonth: pricingConfigQuery.pricePerMonth,
    pricePerPerson: pricingConfigQuery.pricePerPerson,
    pricePerPersonHour: pricingConfigQuery.pricePerPersonHour,
    basePrice: pricingConfigQuery.basePrice,
    minDurationMinutes: pricingConfigQuery.constraints?.minDurationMinutes,
    maxDurationMinutes: pricingConfigQuery.constraints?.maxDurationMinutes,
    minPeople: pricingConfigQuery.constraints?.minPeople,
    maxPeople: pricingConfigQuery.constraints?.maxPeople,
    cleaningFee: pricingConfigQuery.cleaningFee,
    depositAmount: pricingConfigQuery.depositAmount,
    taxRate: pricingConfigQuery.displayInfo?.taxRate ?? 0.25,
  } : null;

  // Build calculation result from backend response
  const calculation: PriceCalculationResult | null = calculationResult ? {
    items: calculationResult.items.map((item: { type: string; label: string; quantity?: number; unit?: string; unitPrice?: number; amount: number; calculation?: string }) => ({
      type: item.type as 'base' | 'duration' | 'person' | 'ticket' | 'addon' | 'fee',
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.amount,
      calculation: item.calculation,
    })),
    subtotal: calculationResult.subtotal,
    discounts: calculationResult.discounts,
    subtotalAfterDiscount: calculationResult.subtotalAfterDiscount,
    taxAmount: calculationResult.taxAmount,
    taxRate: calculationResult.taxRate,
    total: calculationResult.total,
    currency: calculationResult.currency,
    deposit: calculationResult.deposit,
    summary: calculationResult.summary,
    explanation: calculationResult.explanation,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex→SDK boundary: pricingModel is a complex union
    pricingModel: calculationResult.pricingModel as any,
  } : null;

  // Get display info
  const priceLabel = pricingConfigQuery?.displayInfo?.priceLabel ?? 'Pris på forespørsel';
  const constraints = pricingConfig ? getConstraintsSummary(pricingConfig as UtilResourcePricingConfig) : [];
  const validation = calculationResult?.validation ?? { valid: true, errors: [] };
  const slotOptions = (calculationResult?.slotOptions ?? pricingConfigQuery?.slotOptions ?? []) as SlotOption[];
  const surcharges = (calculationResult?.surcharges ?? []) as SurchargeItem[];
  const surchargeTotal = calculationResult?.surchargeTotal ?? 0;
  const discountCodeApplied = calculationResult?.discountCodeApplied ?? null;
  const featureToggles: PricingFeatureToggles = pricingConfigQuery?.featureToggles ?? {
    enableDiscountCodes: true,
    enableSurcharges: true,
    enablePriceGroups: true,
  };

  return {
    calculation,
    priceLabel,
    constraints,
    validation,
    isLoading,
    error: null,
    pricingConfig,
    slotOptions,
    surcharges,
    surchargeTotal,
    discountCodeApplied,
    featureToggles,
  };
}

/**
 * Get available price groups for a resource
 */
export function useResourcePriceGroups(
  resourceId: string | undefined,
  bookingMode?: BookingMode
): {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    groupType?: string;
    discountPercent?: number;
    discountAmount?: number;
    isDefault: boolean;
    priority: number;
  }> | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!resourceId;
  const result = useQuery(
    api.domain.pricing.getResourcePriceGroups,
    enabled ? { resourceId: resourceId as Id<'resources'>, bookingMode } : "skip"
  );

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex→SDK boundary: complex pricing groups type
    data: result as any,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

// =============================================================================
// HOLIDAY HOOKS
// =============================================================================

export interface Holiday {
  _id: string;
  tenantId: string;
  name: string;
  date: string;
  dateTo?: string;
  startTime?: string;
  endTime?: string;
  isRecurring: boolean;
  surchargeType: 'percent' | 'fixed' | 'multiplier';
  surchargeValue: number;
  appliesToResources?: string[];
  appliesToCategories?: string[];
  isActive: boolean;
}

/**
 * List holidays for a tenant
 */
export function useHolidays(
  tenantId: string | undefined,
  options?: { isActive?: boolean }
): {
  data: Holiday[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId;
  const result = useQuery(
    api.domain.pricing.listHolidays,
    enabled ? { tenantId: tenantId as Id<'tenants'>, isActive: options?.isActive } : "skip"
  );

  return {
    data: result as Holiday[] | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Create holiday mutation
 */
export function useCreateHoliday() {
  const mutation = useMutation(api.domain.pricing.createHoliday);

  return {
    createHoliday: async (data: {
      tenantId: string;
      name: string;
      date: string;
      dateTo?: string;
      startTime?: string;
      endTime?: string;
      isRecurring: boolean;
      surchargeType: 'percent' | 'fixed' | 'multiplier';
      surchargeValue: number;
      appliesToResources?: string[];
      appliesToCategories?: string[];
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        name: data.name,
        date: data.date,
        dateTo: data.dateTo,
        startTime: data.startTime,
        endTime: data.endTime,
        isRecurring: data.isRecurring,
        surchargeType: data.surchargeType,
        surchargeValue: data.surchargeValue,
        appliesToResources: data.appliesToResources as Id<'resources'>[] | undefined,
        appliesToCategories: data.appliesToCategories,
      });
    },
  };
}

/**
 * Update holiday mutation
 */
export function useUpdateHoliday() {
  const mutation = useMutation(api.domain.pricing.updateHoliday);

  return {
    updateHoliday: async (id: string, data: Partial<Omit<Holiday, '_id' | 'tenantId'>>) => {
      return mutation({
        id: id as Id<'holidays'>,
        ...data,
        appliesToResources: data.appliesToResources as Id<'resources'>[] | undefined,
      });
    },
  };
}

/**
 * Delete holiday mutation
 */
export function useDeleteHoliday() {
  const mutation = useMutation(api.domain.pricing.deleteHoliday);

  return {
    deleteHoliday: async (id: string) => {
      return mutation({ id: id as Id<'holidays'> });
    },
  };
}

// =============================================================================
// WEEKDAY PRICING HOOKS
// =============================================================================

export interface WeekdayPricing {
  _id: string;
  tenantId: string;
  resourceId?: string;
  dayOfWeek: number;
  surchargeType: 'percent' | 'fixed' | 'multiplier';
  surchargeValue: number;
  startTime?: string;
  endTime?: string;
  label?: string;
  isActive: boolean;
}

/**
 * List weekday pricing rules
 */
export function useWeekdayPricing(
  tenantId: string | undefined,
  resourceId?: string
): {
  data: WeekdayPricing[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId;
  const result = useQuery(
    api.domain.pricing.listWeekdayPricing,
    enabled ? {
      tenantId: tenantId as Id<'tenants'>,
      resourceId: resourceId as Id<'resources'> | undefined,
    } : "skip"
  );

  return {
    data: result as WeekdayPricing[] | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Create weekday pricing rule
 */
export function useCreateWeekdayPricing() {
  const mutation = useMutation(api.domain.pricing.createWeekdayPricing);

  return {
    createWeekdayPricing: async (data: {
      tenantId: string;
      resourceId?: string;
      dayOfWeek: number;
      surchargeType: 'percent' | 'fixed' | 'multiplier';
      surchargeValue: number;
      startTime?: string;
      endTime?: string;
      label?: string;
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        resourceId: data.resourceId as Id<'resources'> | undefined,
        dayOfWeek: data.dayOfWeek,
        surchargeType: data.surchargeType,
        surchargeValue: data.surchargeValue,
        startTime: data.startTime,
        endTime: data.endTime,
        label: data.label,
      });
    },
  };
}

/**
 * Update weekday pricing rule
 */
export function useUpdateWeekdayPricing() {
  const mutation = useMutation(api.domain.pricing.updateWeekdayPricing);

  return {
    updateWeekdayPricing: async (id: string, data: Partial<Omit<WeekdayPricing, '_id' | 'tenantId' | 'resourceId'>>) => {
      return mutation({
        id: id as Id<'weekdayPricing'>,
        ...data,
      });
    },
  };
}

/**
 * Delete weekday pricing rule
 */
export function useDeleteWeekdayPricing() {
  const mutation = useMutation(api.domain.pricing.deleteWeekdayPricing);

  return {
    deleteWeekdayPricing: async (id: string) => {
      return mutation({ id: id as Id<'weekdayPricing'> });
    },
  };
}

// =============================================================================
// DISCOUNT CODE / COUPON CODE HOOKS
// =============================================================================

export interface DiscountCode {
  _id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  discountType: 'percent' | 'fixed' | 'free_hours';
  discountValue: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  minDurationMinutes?: number;
  appliesToResources?: string[];
  appliesToCategories?: string[];
  appliesToBookingModes?: string[];
  maxUsesTotal?: number;
  maxUsesPerUser?: number;
  currentUses: number;
  validFrom?: number;
  validUntil?: number;
  isActive: boolean;
}

export interface DiscountCodeValidation {
  valid: boolean;
  error: string | null;
  code: {
    id: string;
    code: string;
    name: string;
    description?: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
  } | null;
}

/**
 * List discount codes for a tenant
 */
export function useDiscountCodes(
  tenantId: string | undefined,
  options?: { isActive?: boolean }
): {
  data: DiscountCode[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId;
  const result = useQuery(
    api.domain.pricing.listDiscountCodes,
    enabled ? { tenantId: tenantId as Id<'tenants'>, isActive: options?.isActive } : "skip"
  );

  return {
    data: result as DiscountCode[] | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Validate a discount code
 */
export function useValidateDiscountCode(
  tenantId: string | undefined,
  code: string | undefined,
  options?: {
    resourceId?: string;
    categoryKey?: string;
    bookingMode?: string;
    userId?: string;
    organizationId?: string;
    priceGroupId?: string;
    bookingAmount?: number;
    durationMinutes?: number;
  }
): {
  data: DiscountCodeValidation | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId && !!code && code.length >= 2;

  // Helper to check if a string looks like a valid Convex ID
  // Convex IDs are alphanumeric, typically 16+ characters
  // Simple semantic strings like "standard", "premium" are not valid IDs
  const isValidConvexId = (id: string | undefined): id is string => {
    if (!id || id.trim() === '') return false;
    return id.length >= 16 && /^[a-z0-9]+$/i.test(id);
  };

  const result = useQuery(
    api.domain.pricing.validateDiscountCode,
    enabled ? {
      tenantId: tenantId as Id<'tenants'>,
      code: code!,
      resourceId: isValidConvexId(options?.resourceId) ? options.resourceId as Id<'resources'> : undefined,
      categoryKey: options?.categoryKey,
      bookingMode: options?.bookingMode,
      userId: isValidConvexId(options?.userId) ? options.userId as Id<'users'> : undefined,
      organizationId: isValidConvexId(options?.organizationId) ? options.organizationId as Id<'organizations'> : undefined,
      priceGroupId: isValidConvexId(options?.priceGroupId) ? options.priceGroupId as Id<'pricingGroups'> : undefined,
      bookingAmount: options?.bookingAmount,
      durationMinutes: options?.durationMinutes,
    } : "skip"
  );

  return {
    data: result as DiscountCodeValidation | undefined,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

/**
 * Create discount code
 */
export function useCreateDiscountCode() {
  const mutation = useMutation(api.domain.pricing.createDiscountCode);

  return {
    createDiscountCode: async (data: Omit<DiscountCode, '_id' | 'currentUses'>) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        code: data.code,
        name: data.name,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minBookingAmount: data.minBookingAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        minDurationMinutes: data.minDurationMinutes,
        appliesToResources: data.appliesToResources as Id<'resources'>[] | undefined,
        appliesToCategories: data.appliesToCategories,
        appliesToBookingModes: data.appliesToBookingModes,
        maxUsesTotal: data.maxUsesTotal,
        maxUsesPerUser: data.maxUsesPerUser,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      });
    },
  };
}

/**
 * Update discount code
 */
export function useUpdateDiscountCode() {
  const mutation = useMutation(api.domain.pricing.updateDiscountCode);

  return {
    updateDiscountCode: async (id: string, data: Partial<Omit<DiscountCode, '_id' | 'tenantId' | 'code' | 'currentUses'>>) => {
      return mutation({
        id: id as Id<'discountCodes'>,
        ...data,
        appliesToResources: data.appliesToResources as Id<'resources'>[] | undefined,
      });
    },
  };
}

/**
 * Delete discount code
 */
export function useDeleteDiscountCode() {
  const mutation = useMutation(api.domain.pricing.deleteDiscountCode);

  return {
    deleteDiscountCode: async (id: string) => {
      return mutation({ id: id as Id<'discountCodes'> });
    },
  };
}

/**
 * Apply discount code (record usage after booking)
 */
export function useApplyDiscountCode() {
  const mutation = useMutation(api.domain.pricing.applyDiscountCode);

  return {
    applyDiscountCode: async (data: {
      tenantId: string;
      discountCodeId: string;
      userId: string;
      bookingId?: string;
      discountAmount: number;
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        discountCodeId: data.discountCodeId as Id<'discountCodes'>,
        userId: data.userId as Id<'users'>,
        bookingId: data.bookingId as Id<'bookings'> | undefined,
        discountAmount: data.discountAmount,
      });
    },
  };
}

// =============================================================================
// Ticket Templates
// =============================================================================

export interface TicketTemplate {
  _id: string;
  tenantId: string;
  name: string;
  price: number;
  maxPerPurchase?: number;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
}

/**
 * List ticket templates for a tenant
 */
export function useTicketTemplates(
  tenantId: string | undefined,
  options?: { isActive?: boolean }
): { data: TicketTemplate[] | undefined; isLoading: boolean; error: Error | null } {
  const result = useQuery(
    api.domain.pricing.listTicketTemplates,
    tenantId ? { tenantId: tenantId as Id<'tenants'>, isActive: options?.isActive } : "skip"
  );

  return {
    data: result as TicketTemplate[] | undefined,
    isLoading: result === undefined && !!tenantId,
    error: null,
  };
}

/**
 * Create ticket template
 */
export function useCreateTicketTemplate() {
  const mutation = useMutation(api.domain.pricing.createTicketTemplate);

  return {
    createTicketTemplate: async (data: {
      tenantId: string;
      name: string;
      price: number;
      maxPerPurchase?: number;
      description?: string;
      displayOrder?: number;
    }) => {
      return mutation({
        tenantId: data.tenantId as Id<'tenants'>,
        name: data.name,
        price: data.price,
        maxPerPurchase: data.maxPerPurchase,
        description: data.description,
        displayOrder: data.displayOrder,
      });
    },
  };
}

/**
 * Update ticket template
 */
export function useUpdateTicketTemplate() {
  const mutation = useMutation(api.domain.pricing.updateTicketTemplate);

  return {
    updateTicketTemplate: async (id: string, data: Partial<Omit<TicketTemplate, '_id' | 'tenantId'>>) => {
      return mutation({
        id,
        ...data,
      });
    },
  };
}

/**
 * Delete ticket template
 */
export function useDeleteTicketTemplate() {
  const mutation = useMutation(api.domain.pricing.removeTicketTemplate);

  return {
    deleteTicketTemplate: async (id: string) => {
      return mutation({ id });
    },
  };
}

/**
 * Get applicable surcharges for a booking
 */
export function useApplicableSurcharges(
  tenantId: string | undefined,
  resourceId: string | undefined,
  bookingDate: number | undefined,
  bookingTime?: string
): {
  data: Array<{
    type: 'holiday' | 'weekday' | 'peak';
    label: string;
    surchargeType: 'percent' | 'fixed' | 'multiplier';
    surchargeValue: number;
  }> | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const enabled = !!tenantId && !!resourceId && !!bookingDate;
  const result = useQuery(
    api.domain.pricing.getApplicableSurcharges,
    enabled ? {
      tenantId: tenantId as Id<'tenants'>,
      resourceId: resourceId as Id<'resources'>,
      bookingDate: bookingDate!,
      bookingTime,
    } : "skip"
  );

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex→SDK boundary: surcharges union type
    data: result as any,
    isLoading: result === undefined && enabled,
    error: null,
  };
}

// Re-export utility functions for direct use
export {
  calculateBookingPrice,
  getPriceLabel,
  getConstraintsSummary,
  validateBookingConstraints,
} from '../utils/pricing';

// Re-export types from utils (with alias to avoid conflict with local interface)
export type {
  BookingMode,
  BookingDetails,
  PriceCalculationResult,
} from '../utils/pricing';

// Export the utility ResourcePricingConfig with an alias to distinguish from hook interface
export type { ResourcePricingConfig as UtilPricingConfig } from '../utils/pricing';

// =========================================================================
// PACKAGES
// =========================================================================

