import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Outlet, Navigate, Link } from 'react-router-dom';
import {
  AppHeader,
  HeaderLogo,
  HeaderActions,
  HeaderThemeToggle,
  HeaderLanguageSwitch,
  DialogProvider,
  UserMenu,
  ToastProvider,
  SkipLinks,
  ErrorBoundary,
  Button,
} from '@digipicks/ds';
import { DesignsystemetProvider } from '@digipicks/ds';
import { DEFAULT_THEME, type ThemeId } from '@digipicks/ds';
// Static import of the tenant theme CSS to prevent FOUC (Flash of Unstyled Content).
// Without this, the default DS blue theme renders before the dynamic import in useBundledTheme resolves.
import '@digipicks/ds/themes/hamar-theme.css';
import { I18nProvider, useT, useI18nLocale } from '@digipicks/i18n';
import { useTenantConfig, useTenantBranding, useCreatorFromDomain, useWebMCPTools } from '@digipicks/sdk';
import { GlobalSearch } from '@digipicks/app-shell';
import { useAuth } from '@digipicks/app-shell';
import { ListingsPage } from '@/routes/listings';

import { LoginPage } from '@/routes/login';
import { RegisterPage } from '@/routes/register';
import { AuthCallbackPage } from '@/routes/auth-callback';
import { MagicLinkCallbackPage } from '@/routes/magic-link-callback';
import { FAQPage } from '@/routes/faq';
import { PricingPage } from '@/routes/pricing';
import { BlogPage } from '@/routes/blog';
import { BlogGuidePage } from '@/routes/blog-guide';
import { BlogArticlePage } from '@/routes/blog-article';
import { AboutPage } from '@/routes/about';
import { CreatorProfilePage } from '@/routes/creator-profile';
import { PicksFeedPage } from '@/routes/picks-feed';
import { PickTrackerPage } from '@/routes/pick-tracker';
import LeaderboardPage from '@/routes/leaderboard';
import { PushNotificationOptIn } from '@/components/PushNotificationOptIn';

import {
  AuthProvider,
  ConvexRealtimeProvider,
  NotificationCenterProvider,
  createAuditableErrorHandler,
  captureException,
  initSentry,
  ThemeProvider,
  useTheme,
  useBundledTheme,
  env,
} from '@digipicks/app-shell';
import '@digipicks/app-shell/layout/WebLayoutStyles.css';
import { RealtimeToast } from '@digipicks/app-shell';
initSentry();

/**
 * CustomDomainRedirect — When the hostname matches a creator's custom domain,
 * redirect the root "/" to that creator's profile page.
 */
function CustomDomainRedirect() {
  const { creator, isLoading } = useCreatorFromDomain();

  if (isLoading) return null;
  if (creator) return <Navigate to={`/creator/${creator.creatorId}`} replace />;
  return null;
}

/** Redirects to the minside app (separate app at apps/minside) */
function MinsideRedirect() {
  const url = env.minsideUrl;
  if (url && !url.startsWith('/')) {
    window.location.href = url;
    return null;
  }
  return <Navigate to={url || '/'} replace />;
}

const errorHandler = createAuditableErrorHandler((error, info) => {
  captureException(error, {
    react: { componentStack: info.componentStack ?? undefined },
  });
});

// Layout with header for main pages
function MainLayout() {
  // Expose booking tools to AI agents via WebMCP (Chrome 146+)
  useWebMCPTools();

  const t = useT();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { locale, setLocale } = useI18nLocale();
  // Auth state from local hook (wraps SDK with web-specific interface)
  const auth = useAuth();
  const isLoggedIn = auth.isAuthenticated;

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/';
  };

  // Derive user display info from auth state
  const getUserName = () => auth.user?.name || auth.user?.email?.split('@')[0] || auth.user?.email;
  const getUserEmail = () => auth.user?.email;

  return (
    <div className="web-layout-root">
      <SkipLinks />
      <AppHeader
        id="main-navigation"
        sticky={true}
        logo={
          <HeaderLogo
            src="/logo.svg"
            title={t('web.header.brandName')}
            subtitle={t('web.header.brandTagline')}
            href="/"
            height="40px"
            hideTextOnMobile={true}
          />
        }
        search={
          <div className="header-search-desktop">
            <GlobalSearch context="web" placeholder={t('common.search')} showShortcut enableGlobalShortcut />
          </div>
        }
        actions={
          <HeaderActions spacing="16px">
            <nav className="header-nav-links">
              <Link to="/picks" className="header-nav-link">
                {t('nav.picks', 'Picks')}
              </Link>
              {isLoggedIn && (
                <Link to="/tracker" className="header-nav-link">
                  {t('nav.tracker', 'Tracker')}
                </Link>
              )}
              <Link to="/pricing" className="header-nav-link">
                {t('nav.pricing', 'Pricing')}
              </Link>
              <Link to="/blog" className="header-nav-link">
                {t('nav.blog', 'Blog')}
              </Link>
              <Link to="/about" className="header-nav-link">
                {t('nav.about', 'About')}
              </Link>
            </nav>
            <HeaderLanguageSwitch
              language={locale}
              onSwitch={(lang) => setLocale(lang as 'nb' | 'en')}
              languages={[
                { code: 'nb', label: 'NO' },
                { code: 'en', label: 'EN' },
              ]}
            />
            <HeaderThemeToggle isDark={isDark} onToggle={toggleTheme} />
            {isLoggedIn ? (
              <UserMenu
                user={{ name: getUserName() || '', email: getUserEmail() || '' }}
                onLogout={handleLogout}
                menuItems={[
                  { label: t('nav.dashboard', 'Dashboard'), href: import.meta.env.VITE_DASHBOARD_URL || '/min-side' },
                  { label: t('nav.faq', 'FAQ'), href: '/faq' },
                ]}
              />
            ) : (
              <Button data-size="sm" color="accent" onClick={() => navigate('/register')}>
                {t('landing.hero.cta', 'Get Started')}
              </Button>
            )}
          </HeaderActions>
        }
      />

      <Outlet />
    </div>
  );
}

// Valid theme IDs for type-safe resolution
const VALID_THEMES: ThemeId[] = [
  'digdir',
  'altinn',
  'uutilsynet',
  'portal',
  'digilist',
  'xala-navy',
  'steinkjer',
  'hamar',
];

function resolveThemeId(themeName: string | undefined): ThemeId {
  if (!themeName) return DEFAULT_THEME;
  if (VALID_THEMES.includes(themeName as ThemeId)) return themeName as ThemeId;
  return DEFAULT_THEME;
}

// Resolve initial theme synchronously from env to prevent FOUC (Flash of Unstyled Content).
// Without this, the DS default blue theme shows briefly before the async tenant config loads.
const INITIAL_THEME: ThemeId = (() => {
  // Explicit env override takes priority
  const envTheme = import.meta.env.VITE_TENANT_THEME as string | undefined;
  if (envTheme && VALID_THEMES.includes(envTheme as ThemeId)) return envTheme as ThemeId;
  // Fall back to tenant slug (often matches theme name, e.g. 'hamar', 'steinkjer')
  const slug = env.tenantId;
  if (slug && VALID_THEMES.includes(slug as ThemeId)) return slug as ThemeId;
  return DEFAULT_THEME;
})();

// Bridge component to pass theme context to DesignsystemetProvider
function ThemedApp() {
  const { colorScheme } = useTheme();
  const tenantId = env.tenantId;

  // Fetch tenant settings to resolve the correct theme
  const { config } = useTenantConfig(tenantId || undefined);
  const tenantTheme = (config?.settings as { theme?: string } | null)?.theme;
  // Use INITIAL_THEME while async config is loading to prevent FOUC
  const themeId = tenantTheme ? resolveThemeId(tenantTheme) : INITIAL_THEME;

  // Inject tenant brand CSS custom properties (colors, typography, etc.)
  useTenantBranding(tenantId || undefined);

  // Inject theme CSS from bundle (no runtime copy from /themes/)
  useBundledTheme(themeId);

  return (
    <DesignsystemetProvider theme={themeId} colorScheme={colorScheme} size="auto" skipThemeLoading>
      <ToastProvider>
        <DialogProvider>
          <AuthProvider appId="web">
            <NotificationCenterProvider>
              <ConvexRealtimeProvider>
                <RealtimeToast />
                <PushNotificationOptIn context="picks" />
                <div className="themed-app-root">
                  <Routes>
                    {/* Login page - no header */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    <Route path="/auth/magic-link" element={<MagicLinkCallbackPage />} />

                    {/* Main pages with header */}
                    <Route element={<MainLayout />}>
                      {/* Public pages — custom domain redirects root to creator profile */}
                      <Route
                        path="/"
                        element={
                          <>
                            <CustomDomainRedirect />
                            <ListingsPage />
                          </>
                        }
                      />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      <Route path="/blog" element={<BlogPage />} />
                      <Route path="/blog/:guideSlug" element={<BlogGuidePage />} />
                      <Route path="/blog/:guideSlug/:articleSlug" element={<BlogArticlePage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/creator/:creatorId" element={<CreatorProfilePage />} />
                      <Route path="/picks" element={<PicksFeedPage />} />
                      <Route path="/tracker" element={<PickTrackerPage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />

                      {/* Min Side: redirect to minside app (apps/minside) - external redirect */}
                      <Route path="/min-side" element={<MinsideRedirect />} />
                      <Route path="/min-side/*" element={<MinsideRedirect />} />
                    </Route>
                  </Routes>
                </div>
              </ConvexRealtimeProvider>
            </NotificationCenterProvider>
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </DesignsystemetProvider>
  );
}

// App content with theme provider
function AppContent() {
  return (
    <ErrorBoundary onError={errorHandler}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppContent />
      </BrowserRouter>
    </I18nProvider>
  );
}

export default App;
