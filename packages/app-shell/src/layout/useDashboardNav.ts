/**
 * useDashboardNavSections, useDashboardBottomNav
 *
 * Unified hooks for dashboard layout. variant selects config from shared.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { SidebarNavSection, BottomNavigationItem } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAccountContext, useFeatureModule, env, useModeOptional, useIsOwner } from '@digilist-saas/app-shell';
import { useTenantConfig } from '@digilist-saas/sdk';
import type { PlatformRole } from '@digilist-saas/app-shell';
import {
  DASHBOARD_NAV_CONFIG,
  type DashboardVariant,
  type DashboardNavItemConfig,
  type DashboardNavSectionConfig,
} from '@digilist-saas/shared';
import { getNavIcon } from '@digilist-saas/ds';

const BOTTOM_NAV_ID_TO_ICON: Record<string, string> = {
  dashboard: 'home',
  bookings: 'bookOpen',
  calendar: 'calendar',
  messages: 'message',
  settings: 'settings',
  listings: 'building',
};

const BOTTOM_NAV_ID_TO_HREF: Record<string, Record<DashboardVariant, string>> = {
  dashboard: { minside: '/', backoffice: '/', platform: '/platform' },
  bookings: { minside: '/bookings', backoffice: '/bookings', platform: '/platform' },
  calendar: { minside: '/calendar', backoffice: '/calendar', platform: '/platform' },
  notifications: { minside: '/notifications', backoffice: '/notifications', platform: '/platform' },
  messages: { minside: '/messages', backoffice: '/messages', platform: '/platform' },
  settings: { minside: '/preferences', backoffice: '/settings', platform: '/platform' },
  listings: { minside: '/', backoffice: '/listings', platform: '/platform/tenants' },
  tenants: { minside: '/', backoffice: '/', platform: '/platform/tenants' },
  audit: { minside: '/', backoffice: '/audit', platform: '/platform/audit' },
};

const BOTTOM_NAV_LABEL_KEYS: Record<string, Record<DashboardVariant, string>> = {
  dashboard: { minside: 'minside.dashboard', backoffice: 'backoffice.nav.dashboard', platform: 'platform.nav.overview' },
  bookings: { minside: 'minside.myBookings', backoffice: 'backoffice.nav.bookings', platform: 'platform.nav.overview' },
  calendar: { minside: 'minside.myCalendar', backoffice: 'backoffice.nav.calendar', platform: 'platform.nav.overview' },
  messages: { minside: 'minside.messages', backoffice: 'backoffice.nav.messages', platform: 'platform.nav.overview' },
  settings: { minside: 'minside.settings', backoffice: 'backoffice.nav.settings', platform: 'platform.nav.overview' },
  listings: { minside: 'minside.dashboard', backoffice: 'backoffice.nav.listings', platform: 'platform.nav.tenants' },
  tenants: { minside: 'minside.dashboard', backoffice: 'backoffice.nav.dashboard', platform: 'platform.nav.tenants' },
  audit: { minside: 'minside.dashboard', backoffice: 'backoffice.nav.dashboard', platform: 'platform.nav.audit' },
};

export interface UseDashboardNavSectionsOptions {
  variant: DashboardVariant;
  /** Required when variant='backoffice' */
  effectiveRole?: PlatformRole | null;
}

export function useDashboardNavSections({
  variant,
  effectiveRole = null,
}: UseDashboardNavSectionsOptions): SidebarNavSection[] {
  const accountContext = useAccountContext();
  const accountType = accountContext?.accountType ?? 'personal';
  const t = useT();
  const appId = variant === 'minside' ? 'minside' : variant === 'platform' ? 'backoffice' : 'backoffice';
  const { isEnabled: messagingEnabled } = useFeatureModule('messaging', { appId });
  const { isEnabled: reviewsEnabled } = useFeatureModule('reviews', { appId });
  const { isEnabled: seasonalLeasesEnabled } = useFeatureModule('seasonal-leases', { appId });
  const modeCtx = useModeOptional();
  const isOwner = useIsOwner();

  // Fetch tenant config for navigation filtering
  const tenantId = env.tenantId || undefined;
  const { hiddenNavItems } = useTenantConfig(tenantId);

  return useMemo(() => {
    // owner is removed. Only admin is used.
    const navRole = effectiveRole;

    const moduleEnabled = (moduleId?: string) => {
      if (!moduleId) return true;
      if (moduleId === 'messaging') return messagingEnabled;
      if (moduleId === 'reviews') return reviewsEnabled;
      if (moduleId === 'seasonal-leases') return seasonalLeasesEnabled;
      return true;
    };

    const config = DASHBOARD_NAV_CONFIG[variant];
    return config.sections
      .map((section: DashboardNavSectionConfig) => ({
        title: section.titleKey ? t(section.titleKey) : section.title,
        items: section.items
          .filter((item: DashboardNavItemConfig) => {
            // Filter by tenant hiddenNavItems
            if (hiddenNavItems.includes(item.id)) {
              return false;
            }

            if (variant === 'minside') {
              if (!item.contexts || item.contexts.length === 0 || item.contexts.includes(accountType)) {
                return moduleEnabled(item.module);
              }
              return false;
            }
            const roleOk =
              !item.roles ||
              item.roles.length === 0 ||
              (navRole != null && item.roles.some((r) => r === navRole));
            if (!roleOk) return false;
            // For user role: filter by mode (leietaker/utleier)
            if (effectiveRole === 'user' && item.modes && item.modes.length > 0) {
              const currentMode = modeCtx?.mode ?? 'leietaker';
              if (!item.modes.includes(currentMode as 'leietaker' | 'utleier')) return false;
            }
            // Hide items for owners (e.g. "Bli utleier" when already owner)
            if (item.hideForOwners && isOwner) return false;
            // For user role in backoffice, also filter by context (personal/organization)
            if (effectiveRole === 'user' && item.contexts && item.contexts.length > 0) {
              if (!item.contexts.includes(accountType)) return false;
            }
            return moduleEnabled(item.module);
          })
          .map((item: DashboardNavItemConfig) => ({
            name: t(item.nameKey),
            description: item.descriptionKey ? t(item.descriptionKey) : item.description,
            href: item.href,
            icon: getNavIcon(item.icon),
            badge: typeof item.badge === 'number' ? item.badge : undefined,
          })),
      }))
      .filter((section) => section.items.length > 0);
  }, [variant, accountType, effectiveRole, t, messagingEnabled, reviewsEnabled, seasonalLeasesEnabled, hiddenNavItems, modeCtx?.mode, isOwner]);
}

export function useDashboardBottomNav(variant: DashboardVariant): BottomNavigationItem[] {
  const location = useLocation();
  const t = useT();
  const config = DASHBOARD_NAV_CONFIG[variant];

  return useMemo(
    () =>
      config.bottomNavIds.map((id: string) => ({
        id,
        label: t(BOTTOM_NAV_LABEL_KEYS[id]?.[variant] ?? id),
        icon: getNavIcon(BOTTOM_NAV_ID_TO_ICON[id] ?? 'home'),
        href: BOTTOM_NAV_ID_TO_HREF[id]?.[variant] ?? '/',
        active:
          (BOTTOM_NAV_ID_TO_HREF[id]?.[variant] ?? '/') === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(BOTTOM_NAV_ID_TO_HREF[id]?.[variant] ?? '/'),
      })),
    [variant, location.pathname, t]
  );
}
