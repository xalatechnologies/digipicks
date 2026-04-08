/**
 * Capabilities — Unit Tests
 *
 * Tests the capability matrix, role lookups, and superadmin detection.
 * Pure logic — no React context or mocking required.
 */

import { describe, it, expect } from 'vitest';
import {
  type PlatformRole,
  getCapabilitiesForRole,
  roleHasCapability,
  isSuperadminRole,
  ROLE_CAPABILITIES,
} from '../capabilities';

// =============================================================================
// getCapabilitiesForRole
// =============================================================================

describe('getCapabilitiesForRole', () => {
  it('returns all capabilities for superadmin (tenant + platform)', () => {
    const caps = getCapabilitiesForRole('superadmin');
    // Must include platform-only capabilities
    expect(caps).toContain('CAP_PLATFORM_ADMIN');
    expect(caps).toContain('CAP_TENANT_MANAGE');
    expect(caps).toContain('CAP_MODULE_MANAGE');
    expect(caps).toContain('CAP_PLATFORM_BILLING');
    // Must also include tenant admin capabilities
    expect(caps).toContain('CAP_LISTING_EDIT');
    expect(caps).toContain('CAP_AUDIT_VIEW');
    expect(caps).toContain('CAP_USER_ADMIN');
    expect(caps).toContain('CAP_GDPR_MANAGE');
    expect(caps).toContain('CAP_WEBHOOK_MANAGE');
    expect(caps).toContain('CAP_PAYMENT_RECONCILE');
  });

  it('returns tenant caps for admin (no platform caps)', () => {
    const caps = getCapabilitiesForRole('admin');
    expect(caps).toContain('CAP_LISTING_EDIT');
    expect(caps).toContain('CAP_USER_ADMIN');
    expect(caps).toContain('CAP_TENANT_SETTINGS');
    expect(caps).toContain('CAP_GDPR_MANAGE');
    // Must NOT include platform caps
    expect(caps).not.toContain('CAP_PLATFORM_ADMIN');
    expect(caps).not.toContain('CAP_TENANT_MANAGE');
    expect(caps).not.toContain('CAP_MODULE_MANAGE');
    expect(caps).not.toContain('CAP_PLATFORM_BILLING');
  });

  it('returns same caps for user as admin', () => {
    const adminCaps = getCapabilitiesForRole('admin');
    const userCaps = getCapabilitiesForRole('user');
    expect(userCaps).toEqual(adminCaps);
  });



  it('returns empty array for undefined role', () => {
    expect(getCapabilitiesForRole(undefined)).toEqual([]);
  });
});

// =============================================================================
// roleHasCapability
// =============================================================================

describe('roleHasCapability', () => {
  it('superadmin has CAP_PLATFORM_ADMIN', () => {
    expect(roleHasCapability('superadmin', 'CAP_PLATFORM_ADMIN')).toBe(true);
  });

  it('admin does NOT have CAP_PLATFORM_ADMIN', () => {
    expect(roleHasCapability('admin', 'CAP_PLATFORM_ADMIN')).toBe(false);
  });

  it('admin has CAP_GDPR_MANAGE', () => {
    expect(roleHasCapability('admin', 'CAP_GDPR_MANAGE')).toBe(true);
  });



  it('undefined role has no capabilities', () => {
    expect(roleHasCapability(undefined, 'CAP_PLATFORM_ADMIN')).toBe(false);
    expect(roleHasCapability(undefined, 'CAP_LISTING_READ')).toBe(false);
  });
});

// =============================================================================
// isSuperadminRole
// =============================================================================

describe('isSuperadminRole', () => {
  it('recognizes canonical superadmin', () => {
    expect(isSuperadminRole('superadmin')).toBe(true);
  });

  it('recognizes case variants', () => {
    expect(isSuperadminRole('SuperAdmin')).toBe(true);
    expect(isSuperadminRole('super_admin')).toBe(true);
    expect(isSuperadminRole('SaaSAdmin')).toBe(true);
    expect(isSuperadminRole('saasadmin')).toBe(true);
  });

  it('rejects non-superadmin roles', () => {
    expect(isSuperadminRole('admin')).toBe(false);
    expect(isSuperadminRole('user')).toBe(false);
  });

  it('handles null/undefined gracefully', () => {
    expect(isSuperadminRole(undefined)).toBe(false);
    expect(isSuperadminRole(null)).toBe(false);
    expect(isSuperadminRole('')).toBe(false);
  });
});

// =============================================================================
// Role hierarchy completeness
// =============================================================================

describe('ROLE_CAPABILITIES completeness', () => {
  const ALL_ROLES: PlatformRole[] = ['superadmin', 'admin', 'user'];

  it('defines capabilities for every PlatformRole', () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_CAPABILITIES[role]).toBeDefined();
      expect(ROLE_CAPABILITIES[role].length).toBeGreaterThan(0);
    }
  });

  it('superadmin has strictly more capabilities than admin', () => {
    const superCaps = new Set(getCapabilitiesForRole('superadmin'));
    const adminCaps = getCapabilitiesForRole('admin');
    // Every admin cap should also be a superadmin cap
    for (const cap of adminCaps) {
      expect(superCaps.has(cap)).toBe(true);
    }
    // Superadmin has extra platform caps
    expect(superCaps.size).toBeGreaterThan(adminCaps.length);
  });

  it('documents simplified platform role order (superadmin → admin → user)', () => {
    const hierarchy: PlatformRole[] = ['superadmin', 'admin', 'user'];
    expect(hierarchy).toEqual(['superadmin', 'admin', 'user']);
  });
});
