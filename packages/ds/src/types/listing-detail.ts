/**
 * Shared UI Types
 *
 * Generic type definitions used by DS components and application-level code.
 * Domain-specific types (ListingDetail, BookingConfig, etc.) are defined at the application level.
 */

/**
 * Listing type enum matching the schema
 */
export type ListingType = 'SPACE' | 'RESOURCE' | 'EVENT' | 'SERVICE' | 'VEHICLE' | 'OTHER';

/**
 * Time slot availability status
 */
export type TimeSlotStatus = 'available' | 'occupied' | 'selected' | 'unavailable';

/**
 * Image for gallery display
 */
export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  thumbnail?: string;
}

/**
 * Facility with optional icon
 */
export interface Facility {
  id: string;
  label: string;
  icon?: string;
}

/**
 * Additional service with pricing
 */
export interface AdditionalService {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
}

/**
 * Opening hours for a single day
 */
export interface OpeningHoursDay {
  day: string;
  hours: string;
  isClosed?: boolean;
}

/**
 * Time slot for availability calendar
 */
export interface TimeSlot {
  id: string;
  date: Date;
  startTime: string;
  endTime?: string;
  status: TimeSlotStatus;
  eventName?: string;
  eventSlug?: string;
}

/**
 * Breadcrumb navigation item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

/**
 * Booking step
 */
export interface BookingStep {
  id: string;
  label: string;
}

/**
 * Activity type for booking
 */
export type ActivityType =
  | 'meeting'      // Møte
  | 'training'     // Trening
  | 'event'        // Arrangement
  | 'workshop'     // Workshop
  | 'presentation' // Presentasjon
  | 'party'        // Fest/Selskap
  | 'other';       // Annet

/**
 * Booking details form data
 */
export interface BookingDetails {
  /** Contact name */
  name: string;
  /** Contact email */
  email: string;
  /** Contact phone */
  phone: string;
  /** Additional notes (short description) */
  notes?: string;
  /** Whether terms are accepted */
  acceptedTerms: boolean;
  /** Purpose of booking */
  purpose?: string;
  /** Show purpose in calendar */
  showPurposeInCalendar?: boolean;
  /** Book multiple days */
  bookMultipleDays?: boolean;
  /** Number of attendees */
  numberOfPeople?: number;
  /** Type of activity */
  activityType?: ActivityType;
  /** Organization name */
  organization?: string;
}

/**
 * Guideline section for accordion
 */
export interface GuidelineSection {
  id: string;
  title: string;
  content: string;
}

/**
 * FAQ item for accordion
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

/**
 * Shared base props for listing display components (ListingCard, ListingItem).
 * Extend this when creating new listing display variants.
 */
export interface ListingDisplayBaseProps {
  /** Unique identifier */
  id: string;
  /** Listing name/title */
  name: string;
  /** Category/type label */
  type: string;
  /** Listing type from schema */
  listingType?: ListingType;
  /** Override label for the type badge (e.g. subcategory names) */
  typeLabel?: string;
  /** Location text */
  location: string;
  /** Description text */
  description: string;
  /** Image URL */
  image: string;
  /** List of facilities */
  facilities?: string[];
  /** Number of additional facilities not shown */
  moreFacilities?: number;
  /** Capacity (number of people) */
  capacity?: number;
  /** Price amount */
  price?: number;
  /** Price unit (e.g., 'time', 'dag') */
  priceUnit?: string;
  /** Currency code */
  currency?: string;
  /** Click handler */
  onClick?: (id: string) => void;
  /** Click handler for favorite button */
  onFavorite?: (id: string) => void;
  /** Click handler for share button */
  onShare?: (id: string) => void;
  /** Whether this listing is favorited */
  isFavorited?: boolean;
  /** Custom class name */
  className?: string;
  /** Show/hide different elements */
  showCapacity?: boolean;
  showFacilities?: boolean;
  showDescription?: boolean;
  showLocation?: boolean;
  showTypeBadge?: boolean;
  showFavoriteButton?: boolean;
  showShareButton?: boolean;
  showListingType?: boolean;
  showPrice?: boolean;
  /** Show location/map-pin icon next to location text (default: true) */
  showLocationIcon?: boolean;
  /** Event date label shown in footer (e.g. "Lør 15. mar kl. 19:00") */
  dateLabel?: string;
  /** Max facilities to display */
  maxFacilities?: number;
}
