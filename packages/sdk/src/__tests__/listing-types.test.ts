/**
 * Listing Type Compatibility Tests
 *
 * Verifies that types from transforms/listing are correctly used by use-listings
 * and that the type chain (transforms -> use-listings -> hooks index) works.
 */
import { describe, it, expect } from 'vitest';
import type {
  ListingType,
  ListingStatus,
  BookingModel,
  ListingPricing,
  ListingLocation,
  CreateListingDTO,
  UpdateListingDTO,
  ListingQueryParams,
  PublicListingParams,
  AvailabilityQueryParams,
} from '../hooks/use-listings';
import type {
  ListingType as TransformListingType,
  ListingStatus as TransformListingStatus,
  BookingModel as TransformBookingModel,
} from '../transforms/listing';

describe('listing types compatibility', () => {
  it('ListingType from use-listings matches transforms', () => {
    const types: ListingType[] = ['SPACE', 'RESOURCE', 'SERVICE', 'EVENT', 'VEHICLE', 'OTHER'];
    const transformTypes: TransformListingType[] = types;
    expect(transformTypes).toEqual(types);
  });

  it('ListingStatus from use-listings matches transforms', () => {
    const statuses: ListingStatus[] = ['draft', 'published', 'archived', 'maintenance'];
    const transformStatuses: TransformListingStatus[] = statuses;
    expect(transformStatuses).toEqual(statuses);
  });

  it('BookingModel from use-listings matches transforms', () => {
    const models: BookingModel[] = [
      'TIME_RANGE',
      'SLOT',
      'ALL_DAY',
      'QUANTITY',
      'CAPACITY',
      'PACKAGE',
    ];
    const transformModels: TransformBookingModel[] = models;
    expect(transformModels).toEqual(models);
  });

  it('CreateListingDTO has required fields', () => {
    const dto: CreateListingDTO = {
      name: 'Test Listing',
      type: 'SPACE',
    };
    expect(dto.name).toBe('Test Listing');
    expect(dto.type).toBe('SPACE');
  });

  it('ListingQueryParams accepts tenantId', () => {
    const params: ListingQueryParams = {
      tenantId: 'tenant-123',
      page: 1,
      limit: 10,
    };
    expect(params.tenantId).toBe('tenant-123');
  });

  it('ListingPricing has correct shape', () => {
    const pricing: ListingPricing = {
      basePrice: 100,
      currency: 'NOK',
      unit: 'hour',
    };
    expect(pricing.basePrice).toBe(100);
    expect(pricing.unit).toBe('hour');
  });

  it('ListingLocation has correct shape', () => {
    const location: ListingLocation = {
      city: 'Oslo',
      address: 'Test St 1',
    };
    expect(location.city).toBe('Oslo');
  });
});
