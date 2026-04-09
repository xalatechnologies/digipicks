/**
 * @digipicks/i18n
 *
 * Centralized localization package for DigilistSaaS.
 * Provides i18n utilities, hooks, and shared translations.
 *
 * Per UI Guardrails Contract Section 10:
 * - Apps load translations through this package only
 * - No hardcoded strings allowed
 * - All formatting via helpers
 */

import i18n from 'i18next';
import { initReactI18next, useTranslation, Trans, I18nextProvider } from 'react-i18next';
import { useCallback, useMemo } from 'react';

// Import shared translations
import nbTranslations from '../locales/nb.json';
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';

// Types
export type Locale = 'nb' | 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

export interface LocaleConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
}

// Direction mapping
const LOCALE_DIRECTION: Record<Locale, Direction> = {
  nb: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};

/**
 * Get direction for a locale
 */
export function getDirection(locale: Locale): Direction {
  return LOCALE_DIRECTION[locale] || 'ltr';
}

// Shared translations bundled with the package
export const sharedTranslations = {
  nb: { translation: nbTranslations },
  en: { translation: enTranslations },
  ar: { translation: arTranslations },
};

// Initialize i18n synchronously
i18n.use(initReactI18next).init({
  lng: 'nb',
  fallbackLng: 'nb',
  supportedLngs: ['nb', 'en', 'ar'],
  resources: sharedTranslations,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Disable suspense for synchronous loading
  },
});

/**
 * Initialize i18n with custom config (for apps that need to override)
 * Config is optional - if not provided, uses already initialized state
 */
export function initI18n(config?: Partial<LocaleConfig> & { resources?: Record<string, Record<string, object>> }) {
  // If no config, just return the already-initialized instance
  if (!config) {
    return i18n;
  }

  const { defaultLocale = 'nb', supportedLocales = ['nb', 'en', 'ar'], resources } = config;

  // Merge shared translations with app-specific
  const mergedResources: Record<string, Record<string, object>> = { ...sharedTranslations };
  if (resources) {
    for (const [locale, namespaces] of Object.entries(resources)) {
      if (mergedResources[locale]) {
        mergedResources[locale] = {
          ...mergedResources[locale],
          ...namespaces,
        };
      } else {
        mergedResources[locale] = namespaces;
      }
    }
  }

  i18n.init({
    lng: defaultLocale,
    fallbackLng: 'nb',
    supportedLngs: supportedLocales,
    resources: mergedResources,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
}

/**
 * Load translations for a namespace
 */
export function loadTranslations(locale: Locale, namespace: string, translations: object): void {
  i18n.addResourceBundle(locale, namespace, translations, true, true);
}

/**
 * useT - Primary hook for translations
 *
 * Usage:
 * const t = useT();
 * t('backoffice.nav.dashboard')
 */
export function useT(namespace?: string) {
  const { t } = useTranslation(namespace);
  return t;
}

/**
 * useLocale - Get current locale and direction
 */
export function useI18nLocale() {
  const { i18n: i18nInstance } = useTranslation();

  const locale = (i18nInstance.language || 'nb') as Locale;
  const direction = getDirection(locale);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      i18nInstance.changeLanguage(newLocale);
    },
    [i18nInstance],
  );

  return useMemo(
    () => ({
      locale,
      direction,
      setLocale,
    }),
    [locale, direction, setLocale],
  );
}

// Formatting helpers

/**
 * Format date according to locale
 */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date and time according to locale
 */
export function formatDateTime(date: Date, locale: Locale, timezone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
}

/**
 * Format number according to locale
 */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format relative time
 */
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale: Locale): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
}

/**
 * useI18n - Compatibility hook combining t, locale, and setLocale
 *
 * Usage:
 * const { t, locale, setLocale } = useI18n();
 */
export function useI18n(namespace?: string) {
  const t = useT(namespace);
  const { locale, setLocale } = useI18nLocale();

  return useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);
}

/**
 * useLocale - Alias for useI18nLocale
 */
export const useLocale = useI18nLocale;

/**
 * I18nProvider - Wraps children with the initialized i18n instance.
 * Apps use <I18nProvider> without props; the pre-configured instance is injected automatically.
 */
import React from 'react';
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(I18nextProvider, { i18n }, children);
}

// Re-exports
export { Trans, I18nextProvider };
export { i18n };
export default i18n;
