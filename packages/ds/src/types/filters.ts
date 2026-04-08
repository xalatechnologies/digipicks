/**
 * Filter Types and Schemas
 * 
 * Based on Digilist Platform requirements and listing schema
 */

/**
 * Primary listing types from schema
 */
export type ListingType = 'SPACE' | 'RESOURCE' | 'EVENT' | 'SERVICE' | 'VEHICLE' | 'OTHER';

/**
 * Venue/Category types (subcategories within listing types)
 */
export type VenueType = 
  | 'idrettshall'
  | 'moterom'
  | 'svommebasseng'
  | 'utendors'
  | 'kulturhus'
  | 'bibliotek'
  | 'park'
  | 'studio'
  | 'workshop'
  | 'other';

/**
 * Price unit types
 */
export type PriceUnit = 'time' | 'dag' | 'uke' | 'måned' | 'person' | 'stk';

/**
 * Availability status
 */
export type AvailabilityStatus = 'available' | 'unavailable' | 'soon';

/**
 * Filter option with optional count
 */
export interface FilterOption {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional count of items matching this filter */
  count?: number;
}

/**
 * Price range filter
 */
export interface PriceRangeFilter {
  /** Minimum price */
  min?: number;
  /** Maximum price */
  max?: number;
  /** Currency code (default: 'NOK') */
  currency?: string;
}

/**
 * Capacity range filter
 */
export interface CapacityRangeFilter {
  /** Minimum capacity */
  min?: number;
  /** Maximum capacity (optional) */
  max?: number;
}

/**
 * Rating filter
 */
export interface RatingFilter {
  /** Minimum rating (0-5) */
  min?: number;
}

/**
 * Location filter
 */
export interface LocationFilter {
  /** Location ID */
  locationId?: string;
  /** Location name */
  locationName?: string;
  /** Radius in kilometers (for proximity search) */
  radiusKm?: number;
  /** Latitude for proximity search */
  latitude?: number;
  /** Longitude for proximity search */
  longitude?: number;
}

/**
 * Facilities filter (multi-select)
 */
export interface FacilitiesFilter {
  /** Selected facility IDs */
  facilityIds: string[];
}

/**
 * Date/Time filter for availability
 */
export interface DateTimeFilter {
  /** Start date/time */
  startDate?: Date | string;
  /** End date/time */
  endDate?: Date | string;
}

/**
 * Complete filter state
 */
export interface FilterState {
  /** Primary listing type filter (top-level) */
  listingType?: ListingType | 'ALL';
  
  /** Venue/category type filter */
  venueType?: VenueType | 'all';
  
  /** Price range filter */
  priceRange?: PriceRangeFilter;
  
  /** Capacity range filter */
  capacity?: CapacityRangeFilter;
  
  /** Rating filter */
  rating?: RatingFilter;
  
  /** Availability status */
  availability?: AvailabilityStatus;
  
  /** Location filter */
  location?: LocationFilter;
  
  /** Facilities filter */
  facilities?: FacilitiesFilter;
  
  /** Date/time filter for booking availability */
  dateTime?: DateTimeFilter;
  
  /** Search query (text search) */
  searchQuery?: string;
}

/**
 * Filter configuration for FilterBar component
 */
export interface FilterConfig {
  /** Filter field identifier */
  id: string;
  /** Display label */
  label: string;
  /** Filter type */
  type: 'select' | 'multiselect' | 'range' | 'checkbox' | 'date';
  /** Available options (for select/multiselect) */
  options?: FilterOption[];
  /** Current value(s) */
  value?: string | string[] | number | number[] | PriceRangeFilter | CapacityRangeFilter | RatingFilter;
  /** Change handler */
  onChange: (value: any) => void;
  /** Whether this filter is active */
  isActive?: boolean;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional help text */
  helpText?: string;
}

/**
 * Mock data generators for development
 */
export const mockFilterData = {
  /**
   * Listing type options
   */
  listingTypes: (): FilterOption[] => [
    { id: 'ALL', label: 'Alle typer', count: 15 },
    { id: 'SPACE', label: 'Lokaler', count: 3 },
    { id: 'RESOURCE', label: 'Ressurser', count: 3 },
    { id: 'EVENT', label: 'Arrangementer', count: 3 },
    { id: 'SERVICE', label: 'Tjenester', count: 3 },
    { id: 'VEHICLE', label: 'Kjøretøy', count: 3 },
  ],

  /**
   * Venue type options (subcategories)
   */
  venueTypes: (): FilterOption[] => [
    { id: 'all', label: 'Alle kategorier', count: 15 },
    { id: 'idrettshall', label: 'Idrettshall', count: 3 },
    { id: 'moterom', label: 'Møterom', count: 2 },
    { id: 'svommebasseng', label: 'Svømmebasseng', count: 2 },
    { id: 'utendors', label: 'Utendørs', count: 1 },
    { id: 'kulturhus', label: 'Kulturhus', count: 2 },
    { id: 'bibliotek', label: 'Bibliotek', count: 1 },
    { id: 'park', label: 'Park', count: 1 },
    { id: 'studio', label: 'Studio', count: 1 },
  ],

  /**
   * Price range presets
   */
  priceRanges: (): FilterOption[] => [
    { id: '0-500', label: '0 - 500 kr' },
    { id: '500-1000', label: '500 - 1 000 kr' },
    { id: '1000-2000', label: '1 000 - 2 000 kr' },
    { id: '2000-5000', label: '2 000 - 5 000 kr' },
    { id: '5000+', label: '5 000+ kr' },
  ],

  /**
   * Capacity presets
   */
  capacityRanges: (): FilterOption[] => [
    { id: '1-10', label: '1-10 personer' },
    { id: '11-25', label: '11-25 personer' },
    { id: '26-50', label: '26-50 personer' },
    { id: '51-100', label: '51-100 personer' },
    { id: '100+', label: '100+ personer' },
  ],

  /**
   * Rating options
   */
  ratings: (): FilterOption[] => [
    { id: '4.5+', label: '4.5+ stjerner' },
    { id: '4.0+', label: '4.0+ stjerner' },
    { id: '3.5+', label: '3.5+ stjerner' },
    { id: '3.0+', label: '3.0+ stjerner' },
  ],

  /**
   * Availability options
   */
  availability: (): FilterOption[] => [
    { id: 'available', label: 'Tilgjengelig nå', count: 12 },
    { id: 'unavailable', label: 'Ikke tilgjengelig', count: 3 },
    { id: 'soon', label: 'Tilgjengelig snart', count: 2 },
  ],

  /**
   * Common facilities
   */
  facilities: (): FilterOption[] => [
    { id: 'wifi', label: 'WiFi', count: 10 },
    { id: 'parking', label: 'Parkering', count: 8 },
    { id: 'projector', label: 'Projektor', count: 6 },
    { id: 'catering', label: 'Catering', count: 4 },
    { id: 'accessibility', label: 'Tilgjengelighet', count: 7 },
    { id: 'aircondition', label: 'Aircondition', count: 5 },
    { id: 'sound', label: 'Lydanlegg', count: 3 },
    { id: 'lighting', label: 'Profesjonell belysning', count: 2 },
  ],
};
