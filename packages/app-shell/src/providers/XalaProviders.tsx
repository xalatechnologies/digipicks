/**
 * XalaProviders - Complete provider stack for DigilistSaaS apps
 *
 * This is the single provider composition used by all apps.
 * Follows the thin-app architecture: apps compose providers, not logic.
 */
import React, { ReactNode, useEffect, useState, useCallback, useMemo } from 'react';
import { ErrorBoundary, DesignsystemetProvider } from '@digilist-saas/ds';
import { i18n, getDirection } from '@digilist-saas/i18n';
import type { Locale as SharedLocale, Direction, AppId } from '@digilist-saas/shared';
import type { Locale as I18nLocale } from '@digilist-saas/i18n';
import { ThemeProvider, useTheme } from './ThemeProvider';

// =============================================================================
// Types
// =============================================================================

export interface XalaProvidersProps {
    /** Unique app identifier */
    appId: AppId;
    /** Child components */
    children: ReactNode;
    /** Default locale */
    defaultLocale?: SharedLocale;
    /** Supported locales */
    supportedLocales?: SharedLocale[];
}

export interface RuntimeContext {
    appId: AppId;
    env: Record<string, unknown>;
}

export interface LocaleContextValue {
    locale: SharedLocale;
    direction: Direction;
    setLocale: (locale: SharedLocale) => void;
}

// =============================================================================
// Contexts
// =============================================================================

const RuntimeContext = React.createContext<RuntimeContext | null>(null);
const LocaleContext = React.createContext<LocaleContextValue | null>(null);

// =============================================================================
// Hooks
// =============================================================================

export function useRuntime(): RuntimeContext {
    const ctx = React.useContext(RuntimeContext);
    if (!ctx) throw new Error('useRuntime must be used within XalaProviders');
    return ctx;
}

export function useLocale(): LocaleContextValue {
    const ctx = React.useContext(LocaleContext);
    if (!ctx) throw new Error('useLocale must be used within XalaProviders');
    return ctx;
}

export function useDirection(): Direction {
    const { direction } = useLocale();
    return direction;
}


// =============================================================================
// LocaleProvider - Manages locale state (i18n is initialized synchronously in @digilist-saas/i18n)
// =============================================================================

function LocaleProvider({
    defaultLocale = 'nb',
    supportedLocales = ['nb', 'en', 'ar'],
    children,
}: {
    defaultLocale: SharedLocale;
    supportedLocales: SharedLocale[];
    children: ReactNode;
}): React.ReactElement {
    const [locale, setLocaleState] = useState<SharedLocale>(defaultLocale);
    // getDirection from i18n supports nb, en, ar; shared may add fr - fallback to ltr for others
    const direction = getDirection(locale as I18nLocale);

    // Set initial language
    useEffect(() => {
        if (i18n.language !== defaultLocale) {
            i18n.changeLanguage(defaultLocale);
        }
    }, [defaultLocale]);

    const setLocale = useCallback((newLocale: SharedLocale) => {
        if (supportedLocales.includes(newLocale)) {
            setLocaleState(newLocale);
            i18n.changeLanguage(newLocale);
        }
    }, [supportedLocales]);

    const value: LocaleContextValue = useMemo(
        () => ({
            locale,
            direction,
            setLocale,
        }),
        [locale, direction, setLocale]
    );

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}

// =============================================================================
// RuntimeProvider - Provides app runtime context
// =============================================================================

function RuntimeProvider({
    appId,
    env,
    children,
}: {
    appId: AppId;
    env: Record<string, unknown>;
    children: ReactNode;
}): React.ReactElement {
    const value: RuntimeContext = useMemo(
        () => ({ appId, env }),
        [appId, env]
    );
    return (
        <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
    );
}

// =============================================================================
// ThemedApp - Inner component that has access to theme context
// =============================================================================

function ThemedApp({
    children,
}: {
    locale?: SharedLocale;
    direction?: Direction;
    children: ReactNode;
}): React.ReactElement {
    const { colorScheme } = useTheme();

    return (
        <DesignsystemetProvider
            theme="digilist"
            colorScheme={colorScheme}
            size="md"
            typography="primary"
        >
            {children}
        </DesignsystemetProvider>
    );
}

// =============================================================================
// XalaProviders - Complete provider stack
// =============================================================================

/**
 * Order (outside-in):
 * 1. ErrorBoundary - Catches all errors
 * 2. ThemeProvider - Manages color scheme state
 * 3. LocaleProvider - i18n + locale state
 * 4. DesignsystemetProvider - Injects theme CSS + data attributes
 * 5. RuntimeProvider - App context
 */
export function XalaProviders({
    appId,
    children,
    defaultLocale = 'nb',
    supportedLocales = ['nb', 'en', 'ar'],
}: XalaProvidersProps): React.ReactElement {
    return (
        <React.StrictMode>
            <ErrorBoundary>
                <ThemeProvider>
                    <LocaleProvider
                        defaultLocale={defaultLocale}
                        supportedLocales={supportedLocales}
                    >
                        <LocaleContext.Consumer>
                            {(localeCtx: LocaleContextValue | null) => (
                                <ThemedApp
                                    locale={localeCtx?.locale ?? defaultLocale}
                                    direction={localeCtx?.direction ?? 'ltr'}
                                >
                                    <RuntimeProvider
                                        appId={appId}
                                        env={{ appId }}
                                    >
                                        {children}
                                    </RuntimeProvider>
                                </ThemedApp>
                            )}
                        </LocaleContext.Consumer>
                    </LocaleProvider>
                </ThemeProvider>
            </ErrorBoundary>
        </React.StrictMode>
    );
}

export default XalaProviders;
