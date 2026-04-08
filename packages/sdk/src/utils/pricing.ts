/**
 * Pricing Utilities
 *
 * Comprehensive price calculation utilities that handle different booking modes
 * and pricing models with clear, transparent breakdowns.
 */

import type { BookingMode } from '@digilist-saas/shared';

export type { BookingMode } from '@digilist-saas/shared';

export type PricingModel =
  | 'per_hour'
  | 'per_day'
  | 'per_half_day'
  | 'per_week'
  | 'per_month'
  | 'per_session'
  | 'per_person'
  | 'per_person_hour'
  | 'per_person_day'
  | 'per_booking'
  | 'sport_slot';

export interface ResourcePricingConfig {
  /** Pricing model type */
  model: PricingModel;
  /** Currency code */
  currency: string;
  /** Price per hour (for hourly pricing) */
  pricePerHour?: number;
  /** Price per day (for daily pricing) */
  pricePerDay?: number;
  /** Price per half day */
  pricePerHalfDay?: number;
  /** Price per week */
  pricePerWeek?: number;
  /** Price per month */
  pricePerMonth?: number;
  /** Price per person */
  pricePerPerson?: number;
  /** Price per person per hour */
  pricePerPersonHour?: number;
  /** Base/flat price */
  basePrice?: number;
  /** Price per ticket */
  pricePerTicket?: number;
  /** Minimum booking duration in minutes */
  minDurationMinutes?: number;
  /** Maximum booking duration in minutes */
  maxDurationMinutes?: number;
  /** Minimum people allowed */
  minPeople?: number;
  /** Maximum people allowed */
  maxPeople?: number;
  /** Cleaning fee (one-time) */
  cleaningFee?: number;
  /** Deposit amount (refundable) */
  depositAmount?: number;
  /** Tax rate (e.g., 0.25 for 25% MVA) */
  taxRate?: number;
}

export interface BookingDetails {
  /** Booking mode */
  mode: BookingMode;
  /** Duration in minutes */
  durationMinutes: number;
  /** Number of people/attendees */
  attendees: number;
  /** Number of tickets (for TICKETS mode) */
  tickets?: number;
  /** Selected price group ID */
  priceGroupId?: string;
  /** Price group discount percent */
  priceGroupDiscount?: number;
}

export interface PriceLineItem {
  /** Item type for categorization */
  type: 'base' | 'duration' | 'person' | 'ticket' | 'addon' | 'fee';
  /** Display label */
  label: string;
  /** Quantity (if applicable) */
  quantity?: number;
  /** Unit label (e.g., "timer", "personer", "billetter") */
  unit?: string;
  /** Price per unit */
  unitPrice?: number;
  /** Total amount for this line */
  amount: number;
  /** Calculation explanation */
  calculation?: string;
}

export interface PriceCalculationResult {
  /** Line items breakdown */
  items: PriceLineItem[];
  /** Subtotal before discounts */
  subtotal: number;
  /** Applied discounts */
  discounts: Array<{
    label: string;
    percent?: number;
    amount: number;
  }>;
  /** Subtotal after discounts */
  subtotalAfterDiscount: number;
  /** Tax amount */
  taxAmount: number;
  /** Tax rate used */
  taxRate: number;
  /** Final total */
  total: number;
  /** Currency */
  currency: string;
  /** Deposit amount (not included in total) */
  deposit?: number;
  /** Human-readable summary */
  summary: string;
  /** Detailed explanation */
  explanation: string;
  /** Pricing model used */
  pricingModel: PricingModel;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? '1 time' : `${hours} timer`;
  return `${hours}t ${mins}min`;
}

function formatCurrency(amount: number, currency: string = 'NOK'): string {
  return `${amount.toLocaleString('nb-NO')} ${currency}`;
}

function getPricingModelLabel(model: PricingModel): string {
  const labels: Record<PricingModel, string> = {
    per_hour: 'timepris',
    per_day: 'dagspris',
    per_half_day: 'halvdagspris',
    per_session: 'øktpris',
    per_person: 'pris per person',
    per_person_hour: 'pris per person/time',
    per_person_day: 'pris per person/dag',
    per_week: 'ukespris',
    per_month: 'månedspris',
    per_booking: 'fast bookingpris',
    sport_slot: 'sportstid',
  };
  return labels[model] || model;
}

// =============================================================================
// Main Calculation Function
// =============================================================================

/**
 * Calculate price for a booking with full transparency
 */
export function calculateBookingPrice(
  config: ResourcePricingConfig,
  booking: BookingDetails
): PriceCalculationResult {
  const items: PriceLineItem[] = [];
  let subtotal = 0;
  const currency = config.currency || 'NOK';

  // Determine effective pricing model based on booking mode and config
  const effectiveModel = determineEffectiveModel(config, booking);

  // Calculate base price based on model
  switch (effectiveModel) {
    case 'per_hour': {
      const hours = booking.durationMinutes / 60;
      const pricePerHour = config.pricePerHour || config.basePrice || 0;
      const amount = Math.round(hours * pricePerHour);
      items.push({
        type: 'duration',
        label: 'Timeleie',
        quantity: hours,
        unit: hours === 1 ? 'time' : 'timer',
        unitPrice: pricePerHour,
        amount,
        calculation: `${hours} ${hours === 1 ? 'time' : 'timer'} × ${formatCurrency(pricePerHour, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_day': {
      const days = Math.ceil(booking.durationMinutes / (24 * 60)) || 1;
      const pricePerDay = config.pricePerDay || config.basePrice || 0;
      const amount = Math.round(days * pricePerDay);
      items.push({
        type: 'duration',
        label: 'Dagsleie',
        quantity: days,
        unit: days === 1 ? 'dag' : 'dager',
        unitPrice: pricePerDay,
        amount,
        calculation: `${days} ${days === 1 ? 'dag' : 'dager'} × ${formatCurrency(pricePerDay, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_half_day': {
      const halfDays = Math.ceil(booking.durationMinutes / (4 * 60)) || 1;
      const pricePerHalfDay = config.pricePerHalfDay || config.basePrice || 0;
      const amount = Math.round(halfDays * pricePerHalfDay);
      items.push({
        type: 'duration',
        label: 'Halvdagsleie',
        quantity: halfDays,
        unit: halfDays === 1 ? 'halvdag' : 'halvdager',
        unitPrice: pricePerHalfDay,
        amount,
        calculation: `${halfDays} halvdag × ${formatCurrency(pricePerHalfDay, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_week': {
      const weeks = Math.ceil(booking.durationMinutes / (7 * 24 * 60)) || 1;
      const pricePerWeek = config.pricePerWeek || config.basePrice || 0;
      const amount = Math.round(weeks * pricePerWeek);
      items.push({
        type: 'duration',
        label: 'Ukesleie',
        quantity: weeks,
        unit: weeks === 1 ? 'uke' : 'uker',
        unitPrice: pricePerWeek,
        amount,
        calculation: `${weeks} ${weeks === 1 ? 'uke' : 'uker'} × ${formatCurrency(pricePerWeek, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_month': {
      const months = Math.ceil(booking.durationMinutes / (30 * 24 * 60)) || 1;
      const pricePerMonth = config.pricePerMonth || config.basePrice || 0;
      const amount = Math.round(months * pricePerMonth);
      items.push({
        type: 'duration',
        label: 'Månedsleie',
        quantity: months,
        unit: months === 1 ? 'måned' : 'måneder',
        unitPrice: pricePerMonth,
        amount,
        calculation: `${months} ${months === 1 ? 'måned' : 'måneder'} × ${formatCurrency(pricePerMonth, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_person': {
      const people = booking.attendees || 1;
      const pricePerPerson = config.pricePerPerson || config.basePrice || 0;
      const amount = Math.round(people * pricePerPerson);
      items.push({
        type: 'person',
        label: 'Pris per person',
        quantity: people,
        unit: people === 1 ? 'person' : 'personer',
        unitPrice: pricePerPerson,
        amount,
        calculation: `${people} ${people === 1 ? 'person' : 'personer'} × ${formatCurrency(pricePerPerson, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_person_hour': {
      const hours = booking.durationMinutes / 60;
      const people = booking.attendees || 1;
      const pricePerPersonHour = config.pricePerPersonHour || config.basePrice || 0;
      const amount = Math.round(hours * people * pricePerPersonHour);
      items.push({
        type: 'person',
        label: 'Pris per person/time',
        quantity: people,
        unit: 'personer',
        unitPrice: pricePerPersonHour,
        amount,
        calculation: `${people} pers. × ${hours} timer × ${formatCurrency(pricePerPersonHour, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_person_day': {
      const days = Math.ceil(booking.durationMinutes / (24 * 60)) || 1;
      const people = booking.attendees || 1;
      const pricePerPersonDay = config.pricePerPerson || config.basePrice || 0;
      const amount = Math.round(days * people * pricePerPersonDay);
      items.push({
        type: 'person',
        label: 'Pris per person/dag',
        quantity: people,
        unit: 'personer',
        unitPrice: pricePerPersonDay,
        amount,
        calculation: `${people} pers. × ${days} dager × ${formatCurrency(pricePerPersonDay, currency)}`,
      });
      subtotal += amount;
      break;
    }

    case 'per_booking':
    case 'per_session': {
      const basePrice = config.basePrice || 0;
      items.push({
        type: 'base',
        label: 'Fast pris',
        amount: basePrice,
        calculation: `Fast pris per booking`,
      });
      subtotal += basePrice;
      break;
    }

    default: {
      // Fallback to base price
      const basePrice = config.basePrice || 0;
      items.push({
        type: 'base',
        label: 'Grunnpris',
        amount: basePrice,
      });
      subtotal += basePrice;
    }
  }

  // Handle TICKETS mode specially
  if (booking.mode === 'TICKETS' && booking.tickets) {
    const ticketPrice = config.pricePerTicket || config.pricePerPerson || config.basePrice || 0;
    const ticketAmount = Math.round(booking.tickets * ticketPrice);
    // Replace items with ticket calculation
    items.length = 0;
    items.push({
      type: 'ticket',
      label: 'Billetter',
      quantity: booking.tickets,
      unit: booking.tickets === 1 ? 'billett' : 'billetter',
      unitPrice: ticketPrice,
      amount: ticketAmount,
      calculation: `${booking.tickets} ${booking.tickets === 1 ? 'billett' : 'billetter'} × ${formatCurrency(ticketPrice, currency)}`,
    });
    subtotal = ticketAmount;
  }

  // Add cleaning fee if applicable
  if (config.cleaningFee && config.cleaningFee > 0) {
    items.push({
      type: 'fee',
      label: 'Rengjøringsgebyr',
      amount: config.cleaningFee,
    });
    subtotal += config.cleaningFee;
  }

  // Apply discounts
  const discounts: Array<{ label: string; percent?: number; amount: number }> = [];
  let subtotalAfterDiscount = subtotal;

  if (booking.priceGroupDiscount && booking.priceGroupDiscount > 0) {
    const discountAmount = Math.round(subtotal * (booking.priceGroupDiscount / 100));
    discounts.push({
      label: 'Prisgruppe-rabatt',
      percent: booking.priceGroupDiscount,
      amount: discountAmount,
    });
    subtotalAfterDiscount -= discountAmount;
  }

  // Calculate tax
  const taxRate = config.taxRate ?? 0.25; // Default 25% MVA
  const taxAmount = Math.round(subtotalAfterDiscount * taxRate);
  const total = subtotalAfterDiscount + taxAmount;

  // Build explanation
  const summary = `${formatCurrency(total, currency)} (inkl. MVA)`;
  const explanation = buildExplanation(effectiveModel, booking, config, currency);

  return {
    items,
    subtotal,
    discounts,
    subtotalAfterDiscount,
    taxAmount,
    taxRate,
    total,
    currency,
    deposit: config.depositAmount,
    summary,
    explanation,
    pricingModel: effectiveModel,
  };
}

/**
 * Determine the effective pricing model based on booking mode and config
 */
function determineEffectiveModel(
  config: ResourcePricingConfig,
  booking: BookingDetails
): PricingModel {
  // If config has explicit model, use it
  if (config.model) return config.model;

  // Infer from booking mode and available prices
  switch (booking.mode) {
    case 'ALL_DAY':
      if (config.pricePerDay) return 'per_day';
      if (config.pricePerPerson) return 'per_person_day';
      return 'per_booking';

    case 'WEEKLY':
      if (config.pricePerWeek) return 'per_week';
      return 'per_booking';

    case 'MONTHLY':
      if (config.pricePerMonth) return 'per_month';
      return 'per_booking';

    case 'TICKETS':
      return 'per_person';

    case 'DURATION':
    case 'SLOTS':
    default:
      if (config.pricePerHour) return 'per_hour';
      if (config.pricePerPersonHour) return 'per_person_hour';
      if (config.pricePerDay) return 'per_day';
      return 'per_booking';
  }
}

/**
 * Build human-readable explanation of the price
 */
function buildExplanation(
  model: PricingModel,
  booking: BookingDetails,
  config: ResourcePricingConfig,
  currency: string
): string {
  const parts: string[] = [];

  switch (model) {
    case 'per_hour':
      parts.push(`Prisen beregnes basert på varighet: ${formatCurrency(config.pricePerHour || 0, currency)} per time.`);
      parts.push(`Valgt varighet: ${formatDuration(booking.durationMinutes)}.`);
      break;

    case 'per_day':
      parts.push(`Dagspris: ${formatCurrency(config.pricePerDay || 0, currency)} per dag.`);
      break;

    case 'per_week':
      parts.push(`Ukespris: ${formatCurrency(config.pricePerWeek || 0, currency)} per uke.`);
      break;

    case 'per_month':
      parts.push(`Månedspris: ${formatCurrency(config.pricePerMonth || 0, currency)} per måned.`);
      break;

    case 'per_person':
      parts.push(`Prisen beregnes per person: ${formatCurrency(config.pricePerPerson || 0, currency)} per person.`);
      parts.push(`Antall deltakere: ${booking.attendees}.`);
      break;

    case 'per_person_hour':
      parts.push(`Prisen beregnes per person per time: ${formatCurrency(config.pricePerPersonHour || 0, currency)}.`);
      parts.push(`${booking.attendees} deltakere × ${formatDuration(booking.durationMinutes)}.`);
      break;

    case 'per_booking':
    case 'per_session':
      parts.push(`Fast pris per booking, uavhengig av varighet eller antall deltakere.`);
      break;

    default:
      parts.push(`Pris basert på ${getPricingModelLabel(model)}.`);
  }

  if (config.cleaningFee) {
    parts.push(`Inkluderer rengjøringsgebyr: ${formatCurrency(config.cleaningFee, currency)}.`);
  }

  if (config.depositAmount) {
    parts.push(`Depositum (refunderbart): ${formatCurrency(config.depositAmount, currency)}.`);
  }

  return parts.join(' ');
}

// =============================================================================
// Utility Functions for Display
// =============================================================================

/**
 * Get a short price label for display (e.g., "500 kr/time")
 */
export function getPriceLabel(config: ResourcePricingConfig): string {
  const currency = config.currency || 'NOK';

  if (config.pricePerHour) {
    return `${config.pricePerHour.toLocaleString('nb-NO')} ${currency}/time`;
  }
  if (config.pricePerDay) {
    return `${config.pricePerDay.toLocaleString('nb-NO')} ${currency}/dag`;
  }
  if (config.pricePerWeek) {
    return `${config.pricePerWeek.toLocaleString('nb-NO')} ${currency}/uke`;
  }
  if (config.pricePerMonth) {
    return `${config.pricePerMonth.toLocaleString('nb-NO')} ${currency}/mnd`;
  }
  if (config.pricePerPerson) {
    return `${config.pricePerPerson.toLocaleString('nb-NO')} ${currency}/person`;
  }
  if (config.basePrice) {
    return `${config.basePrice.toLocaleString('nb-NO')} ${currency}`;
  }
  return 'Pris på forespørsel';
}

/**
 * Get constraints summary for display
 */
export function getConstraintsSummary(config: ResourcePricingConfig): string[] {
  const constraints: string[] = [];

  if (config.minDurationMinutes) {
    constraints.push(`Min. varighet: ${formatDuration(config.minDurationMinutes)}`);
  }
  if (config.maxDurationMinutes) {
    constraints.push(`Maks. varighet: ${formatDuration(config.maxDurationMinutes)}`);
  }
  if (config.minPeople) {
    constraints.push(`Min. ${config.minPeople} personer`);
  }
  if (config.maxPeople) {
    constraints.push(`Maks. ${config.maxPeople} personer`);
  }

  return constraints;
}

/**
 * Validate booking against constraints
 */
export function validateBookingConstraints(
  config: ResourcePricingConfig,
  booking: BookingDetails
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.minDurationMinutes && booking.durationMinutes < config.minDurationMinutes) {
    errors.push(`Minimum varighet er ${formatDuration(config.minDurationMinutes)}`);
  }
  if (config.maxDurationMinutes && booking.durationMinutes > config.maxDurationMinutes) {
    errors.push(`Maksimum varighet er ${formatDuration(config.maxDurationMinutes)}`);
  }
  if (config.minPeople && booking.attendees < config.minPeople) {
    errors.push(`Minimum ${config.minPeople} personer kreves`);
  }
  if (config.maxPeople && booking.attendees > config.maxPeople) {
    errors.push(`Maksimum ${config.maxPeople} personer tillatt`);
  }

  return { valid: errors.length === 0, errors };
}
