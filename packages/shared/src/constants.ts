/**
 * @digilist-saas/shared - Constants
 *
 * Shared constants for DigilistSaaS.
 */

import type { AppId, AppConfig, Locale, Direction } from './types';

// =============================================================================
// App Constants
// =============================================================================

/** App configurations */
export const APPS: Record<AppId, AppConfig> = {
  backoffice: {
    appId: 'backoffice',
    name: 'Backoffice',
    port: 5001,
    description: 'Platform administration',
  },
  dashboard: {
    appId: 'dashboard',
    name: 'Dashboard',
    port: 5002,
    description: 'Tenant administration',
  },
  web: {
    appId: 'web',
    name: 'Web',
    port: 5003,
    description: 'End-user application',
  },
  minside: {
    appId: 'minside',
    name: 'Min Side',
    port: 5006,
    description: 'User self-service portal',
  },
  docs: {
    appId: 'docs',
    name: 'Docs',
    port: 5005,
    description: 'Documentation',
  },
  monitoring: {
    appId: 'monitoring',
    name: 'Monitoring',
    port: 5004,
    description: 'Operations dashboard',
  },
  'saas-admin': {
    appId: 'saas-admin',
    name: 'SaaS Admin',
    port: 5176,
    description: 'Multi-tenant platform administration',
  },
};

// =============================================================================
// Locale Constants
// =============================================================================

/** Supported locales */
export const SUPPORTED_LOCALES: Locale[] = ['nb', 'en', 'ar'];

/** Default locale */
export const DEFAULT_LOCALE: Locale = 'nb';

/** Locale to direction mapping */
export const LOCALE_DIRECTION: Record<Locale, Direction> = {
  nb: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};

/** Locale display names */
export const LOCALE_NAMES: Record<Locale, string> = {
  nb: 'Norsk bokmål',
  en: 'English',
  ar: 'العربية',
};

// =============================================================================
// SDK Namespace Constants
// =============================================================================

/** SDK namespaces allowed per app (per Architecture Contract) */
export const SDK_ALLOWED_NAMESPACES: Record<AppId, string[]> = {
  backoffice: ['tenant', 'modules', 'billing', 'governance', 'ops'],
  dashboard: ['*.admin', 'tenant.read', 'audit.scoped'],
  web: ['*.public', 'auth'],
  minside: ['*.user', 'auth', 'bookings', 'listings'],
  docs: ['docs.*', 'audit.read'],
  monitoring: ['ops.*', 'audit.read', 'events.read'],
  'saas-admin': ['tenant', 'modules', 'billing', 'governance', 'ops', 'audit'],
};

// =============================================================================
// API Constants
// =============================================================================

/** Default page size */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size */
export const MAX_PAGE_SIZE = 100;

// =============================================================================
// Tenant Constants
// =============================================================================

/** Tenant status options */
export const TENANT_STATUSES = ['active', 'suspended', 'pending', 'archived'] as const;

// =============================================================================
// Module Constants
// =============================================================================

/** Core modules */
export const CORE_MODULES = ['auth', 'tenant', 'billing', 'audit'] as const;

// =============================================================================
// Storage Keys
// =============================================================================

/** LocalStorage key for theme preference */
export const THEME_STORAGE_KEY = 'theme-preference';

// =============================================================================
// Locale Formatting
// =============================================================================

/** Maps platform Locale to Intl/BCP-47 locale string for formatting (dates, numbers) */
export function getIntlLocale(locale: Locale): string {
  switch (locale) {
    case 'en':
      return 'en-US';
    case 'nb':
      return 'nb-NO';
    case 'ar':
      return 'ar';
    default:
      return 'nb-NO';
  }
}

/** LocalStorage key for favorites (guest users) */
export const FAVORITES_STORAGE_KEY = 'digilist_favorites';

// =============================================================================
// Locale Date Constants (Norwegian)
// =============================================================================

/** Norwegian day name abbreviations (Sunday-first) */
export const DAY_NAMES_NB = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;

/** Norwegian month name abbreviations */
export const MONTH_NAMES_NB = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

/** Norwegian full day names (Sunday-first) */
export const DAY_NAMES_FULL_NB = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;

/** Norwegian full day names capitalized (Sunday-first) */
export const DAY_NAMES_FULL_CAPITALIZED_NB = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;

/** Norwegian full month names */
export const MONTH_NAMES_FULL_NB = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;

/** Norwegian full month names capitalized (for calendar headers, etc.) */
export const MONTH_NAMES_FULL_CAPITALIZED_NB = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'] as const;

/** Days of week Monday-first for calendar views */
export const DAYS_OF_WEEK_MONDAY_FIRST_NB = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] as const;

// =============================================================================
// Season Constants
// =============================================================================



/** Norwegian weekday labels (Sunday-first, full names) — alias for DAY_NAMES_FULL_CAPITALIZED_NB */
export const WEEKDAY_LABELS_NB = DAY_NAMES_FULL_CAPITALIZED_NB;

/** Norwegian weekday labels (Sunday-first, short) — alias for DAY_NAMES_NB */
export const WEEKDAY_SHORT_LABELS_NB = DAY_NAMES_NB;

// NOTE: TYPE_TO_CATEGORY, CATEGORY_TO_TYPE, DIGILIST_FACILITY_OPTIONS, DIGILIST_SUBCATEGORY_OPTIONS
// were removed — these are domain-specific constants defined at the application level.

// ---------------------------------------------------------------------------
// i18n label key mappings (used across backoffice and admin UIs)
// ---------------------------------------------------------------------------

/** Maps role keys to i18n translation keys */
export const ROLE_LABEL_KEYS: Record<string, string> = {
  super_admin: 'users.detail.roleSuperAdmin',
  admin: 'users.detail.roleAdmin',
  saksbehandler: 'users.detail.roleSaksbehandler',
  manager: 'users.detail.roleManager',
  member: 'users.detail.roleMember',
  viewer: 'users.detail.roleViewer',
  guest: 'users.detail.roleGuest',
  user: 'users.user',
};


