/**
 * useFeatureModule / FeatureGate Tests
 *
 * Verifies feature flag gating logic with mocked SDK hooks.
 */

/// <reference types="@testing-library/jest-dom/vitest" />

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, render, screen } from '@testing-library/react';
import { useFeatureModule, MODULE_IDS } from '../useFeatureModule';
import { FeatureGate } from '../../guards/FeatureGate';

const mockUseSessionTenantId = vi.fn();
const mockUseTenantFeatureFlags = vi.fn();

vi.mock('@digipicks/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@digipicks/sdk')>();
  return {
    ...actual,
    useSessionTenantId: (...args: unknown[]) => mockUseSessionTenantId(...args),
    useTenantFeatureFlags: (...args: unknown[]) => mockUseTenantFeatureFlags(...args),
  };
});

describe('useFeatureModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionTenantId.mockReturnValue('tenants_1');
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: (id: string) => id === 'messaging',
      isLoading: false,
      isSkipped: false,
    });
  });

  it('returns isEnabled true when module is enabled', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => true,
      isLoading: false,
      isSkipped: false,
    });

    const { result } = renderHook(() => useFeatureModule('messaging'));

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSkipped).toBe(false);
  });

  it('returns isEnabled false when module is disabled', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => false,
      isLoading: false,
      isSkipped: false,
    });

    const { result } = renderHook(() => useFeatureModule('reviews'));

    expect(result.current.isEnabled).toBe(false);
  });

  it('returns isEnabled false when tenantId is missing (isSkipped)', () => {
    mockUseSessionTenantId.mockReturnValue(null);
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => true,
      isLoading: false,
      isSkipped: true,
    });

    const { result } = renderHook(() => useFeatureModule('messaging'));

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isSkipped).toBe(true);
  });

  it('returns isLoading true while tenant config loads', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => true,
      isLoading: true,
      isSkipped: false,
    });

    const { result } = renderHook(() => useFeatureModule('messaging'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isEnabled).toBe(true);
  });

  it('passes appId to useSessionTenantId', () => {
    renderHook(() => useFeatureModule('messaging', { appId: 'web' }));

    expect(mockUseSessionTenantId).toHaveBeenCalledWith('web');
  });
});

describe('FeatureGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSessionTenantId.mockReturnValue('tenants_1');
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: (id: string) => id === 'messaging',
      isLoading: false,
      isSkipped: false,
    });
  });

  it('renders children when module is enabled', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => true,
      isLoading: false,
      isSkipped: false,
    });

    render(
      <FeatureGate module="messaging">
        <span data-testid="gated-content">Gated content</span>
      </FeatureGate>,
    );

    expect(screen.getByTestId('gated-content')).toBeInTheDocument();
    expect(screen.getByText('Gated content')).toBeVisible();
  });

  it('renders fallback when module is disabled', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => false,
      isLoading: false,
      isSkipped: false,
    });

    render(
      <FeatureGate module="reviews" fallback={<span data-testid="fallback">Not available</span>}>
        <span data-testid="gated-content">Reviews</span>
      </FeatureGate>,
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Not available')).toBeVisible();
    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
  });

  it('renders nothing when disabled and no fallback', () => {
    mockUseTenantFeatureFlags.mockReturnValue({
      isModuleEnabled: () => false,
      isLoading: false,
      isSkipped: false,
    });

    const { container } = render(
      <FeatureGate module="reviews">
        <span data-testid="gated-content">Reviews</span>
      </FeatureGate>,
    );

    expect(screen.queryByTestId('gated-content')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});

describe('MODULE_IDS', () => {
  it('exports MODULE_IDS from useFeatureModule (re-export from SDK)', () => {
    expect(MODULE_IDS).toBeDefined();
    expect(Array.isArray(MODULE_IDS)).toBe(true);
    expect(MODULE_IDS).toContain('messaging');
    expect(MODULE_IDS).toContain('reviews');
    expect(MODULE_IDS).toContain('seasonal-leases');
  });
});
