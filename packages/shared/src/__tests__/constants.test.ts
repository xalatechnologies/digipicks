import { describe, it, expect } from 'vitest';
import {
  APPS,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_DIRECTION,
  LOCALE_NAMES,
  SDK_ALLOWED_NAMESPACES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  TENANT_STATUSES,
  CORE_MODULES,
  THEME_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  DAY_NAMES_NB,
  MONTH_NAMES_NB,
  DAY_NAMES_FULL_NB,
  MONTH_NAMES_FULL_NB,
  DAYS_OF_WEEK_MONDAY_FIRST_NB,
  ROLE_LABEL_KEYS,
  getIntlLocale,
} from '../constants';

describe('APPS', () => {
  it('contains all expected app IDs', () => {
    const expectedIds = ['backoffice', 'dashboard', 'web', 'minside', 'docs', 'monitoring', 'saas-admin'];
    expect(Object.keys(APPS)).toEqual(expect.arrayContaining(expectedIds));
    expect(Object.keys(APPS)).toHaveLength(expectedIds.length);
  });

  it('each app has required fields', () => {
    for (const [key, app] of Object.entries(APPS)) {
      expect(app.appId).toBe(key);
      expect(typeof app.name).toBe('string');
      expect(app.name.length).toBeGreaterThan(0);
      expect(typeof app.port).toBe('number');
      expect(app.port).toBeGreaterThan(0);
      expect(typeof app.description).toBe('string');
    }
  });

  it('all apps have unique ports', () => {
    const ports = Object.values(APPS).map(a => a.port);
    expect(new Set(ports).size).toBe(ports.length);
  });
});

describe('Locale constants', () => {
  it('SUPPORTED_LOCALES contains nb, en, ar', () => {
    expect(SUPPORTED_LOCALES).toContain('nb');
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('ar');
    expect(SUPPORTED_LOCALES).toHaveLength(3);
  });

  it('DEFAULT_LOCALE is nb', () => {
    expect(DEFAULT_LOCALE).toBe('nb');
  });

  it('LOCALE_DIRECTION maps each locale to a direction', () => {
    expect(LOCALE_DIRECTION.nb).toBe('ltr');
    expect(LOCALE_DIRECTION.en).toBe('ltr');
    expect(LOCALE_DIRECTION.ar).toBe('rtl');
  });

  it('LOCALE_NAMES has display names for each locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(typeof LOCALE_NAMES[locale]).toBe('string');
      expect(LOCALE_NAMES[locale].length).toBeGreaterThan(0);
    }
  });
});

describe('getIntlLocale', () => {
  it('maps nb to nb-NO', () => {
    expect(getIntlLocale('nb')).toBe('nb-NO');
  });

  it('maps en to en-US', () => {
    expect(getIntlLocale('en')).toBe('en-US');
  });

  it('maps ar to ar', () => {
    expect(getIntlLocale('ar')).toBe('ar');
  });
});

describe('SDK_ALLOWED_NAMESPACES', () => {
  it('has an entry for every app', () => {
    for (const appId of Object.keys(APPS)) {
      expect(SDK_ALLOWED_NAMESPACES).toHaveProperty(appId);
      expect(Array.isArray(SDK_ALLOWED_NAMESPACES[appId as keyof typeof SDK_ALLOWED_NAMESPACES])).toBe(true);
    }
  });

  it('web app only allows public and auth namespaces', () => {
    expect(SDK_ALLOWED_NAMESPACES.web).toContain('*.public');
    expect(SDK_ALLOWED_NAMESPACES.web).toContain('auth');
  });
});

describe('Pagination constants', () => {
  it('DEFAULT_PAGE_SIZE is a positive number', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('MAX_PAGE_SIZE is greater than DEFAULT_PAGE_SIZE', () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});

describe('TENANT_STATUSES', () => {
  it('includes active, suspended, pending, archived', () => {
    expect(TENANT_STATUSES).toContain('active');
    expect(TENANT_STATUSES).toContain('suspended');
    expect(TENANT_STATUSES).toContain('pending');
    expect(TENANT_STATUSES).toContain('archived');
    expect(TENANT_STATUSES).toHaveLength(4);
  });
});

describe('CORE_MODULES', () => {
  it('includes expected core modules', () => {
    expect(CORE_MODULES).toContain('auth');
    expect(CORE_MODULES).toContain('tenant');
    expect(CORE_MODULES).toContain('billing');
    expect(CORE_MODULES).toContain('audit');
    expect(CORE_MODULES).toHaveLength(4);
  });
});

describe('Storage keys', () => {
  it('THEME_STORAGE_KEY is a non-empty string', () => {
    expect(typeof THEME_STORAGE_KEY).toBe('string');
    expect(THEME_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it('FAVORITES_STORAGE_KEY is a non-empty string', () => {
    expect(typeof FAVORITES_STORAGE_KEY).toBe('string');
    expect(FAVORITES_STORAGE_KEY.length).toBeGreaterThan(0);
  });
});

describe('Norwegian date constants', () => {
  it('DAY_NAMES_NB has 7 entries starting with Sunday', () => {
    expect(DAY_NAMES_NB).toHaveLength(7);
    expect(DAY_NAMES_NB[0]).toBe('Søn');
    expect(DAY_NAMES_NB[1]).toBe('Man');
  });

  it('MONTH_NAMES_NB has 12 entries', () => {
    expect(MONTH_NAMES_NB).toHaveLength(12);
    expect(MONTH_NAMES_NB[0]).toBe('jan');
    expect(MONTH_NAMES_NB[11]).toBe('des');
  });

  it('DAY_NAMES_FULL_NB has full day names', () => {
    expect(DAY_NAMES_FULL_NB).toHaveLength(7);
    expect(DAY_NAMES_FULL_NB[0]).toBe('søndag');
    expect(DAY_NAMES_FULL_NB[1]).toBe('mandag');
  });

  it('MONTH_NAMES_FULL_NB has full month names', () => {
    expect(MONTH_NAMES_FULL_NB).toHaveLength(12);
    expect(MONTH_NAMES_FULL_NB[0]).toBe('januar');
    expect(MONTH_NAMES_FULL_NB[11]).toBe('desember');
  });

  it('DAYS_OF_WEEK_MONDAY_FIRST_NB starts with Man', () => {
    expect(DAYS_OF_WEEK_MONDAY_FIRST_NB).toHaveLength(7);
    expect(DAYS_OF_WEEK_MONDAY_FIRST_NB[0]).toBe('Man');
    expect(DAYS_OF_WEEK_MONDAY_FIRST_NB[6]).toBe('Søn');
  });
});

describe('ROLE_LABEL_KEYS', () => {
  it('maps known roles to i18n keys', () => {
    expect(ROLE_LABEL_KEYS.admin).toBeDefined();
    expect(ROLE_LABEL_KEYS.super_admin).toBeDefined();
    expect(ROLE_LABEL_KEYS.user).toBeDefined();
    for (const value of Object.values(ROLE_LABEL_KEYS)) {
      expect(typeof value).toBe('string');
      expect(value).toContain('.');
    }
  });
});
