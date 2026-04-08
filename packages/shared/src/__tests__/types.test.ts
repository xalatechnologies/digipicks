import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  AppId,
  AppConfig,
  Locale,
  Direction,
  EntityStatus,
  PublishStatus,
  Priority,
  TenantId,
  UserId,
  ResourceId,
} from '../types';

/**
 * Type-level tests: these verify that types compile and have expected shapes.
 * They do not test runtime behavior but ensure the type definitions are sound.
 */

describe('Type exports compile correctly', () => {
  it('AppId is a union of string literals', () => {
    expectTypeOf<AppId>().toBeString();
    const val: AppId = 'dashboard';
    expect(val).toBe('dashboard');
  });

  it('AppConfig has required fields', () => {
    expectTypeOf<AppConfig>().toHaveProperty('appId');
    expectTypeOf<AppConfig>().toHaveProperty('name');
    expectTypeOf<AppConfig>().toHaveProperty('port');
    expectTypeOf<AppConfig>().toHaveProperty('description');
  });

  it('Locale is a union of nb, en, ar', () => {
    const locales: Locale[] = ['nb', 'en', 'ar'];
    expect(locales).toHaveLength(3);
  });

  it('Direction is ltr or rtl', () => {
    const directions: Direction[] = ['ltr', 'rtl'];
    expect(directions).toHaveLength(2);
  });

  it('EntityStatus has expected values', () => {
    const statuses: EntityStatus[] = ['active', 'inactive', 'suspended', 'deleted', 'archived'];
    expect(statuses).toHaveLength(5);
  });

  it('PublishStatus has expected values', () => {
    const statuses: PublishStatus[] = ['draft', 'published', 'unpublished', 'archived'];
    expect(statuses).toHaveLength(4);
  });

  it('Priority has expected values', () => {
    const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
    expect(priorities).toHaveLength(4);
  });

  it('branded ID types are assignable from string with cast', () => {
    const tenantId = 'tenant_123' as TenantId;
    const userId = 'user_456' as UserId;
    const resourceId = 'resource_789' as ResourceId;
    // Branded types are still strings at runtime
    expect(typeof tenantId).toBe('string');
    expect(typeof userId).toBe('string');
    expect(typeof resourceId).toBe('string');
  });
});
