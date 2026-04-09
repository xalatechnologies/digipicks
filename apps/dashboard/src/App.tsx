import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DesignsystemetProvider, DialogProvider, ErrorBoundary, ToastProvider } from '@digipicks/ds';
import { DEFAULT_THEME, type ThemeId } from '@digipicks/ds';
import { I18nProvider } from '@digipicks/i18n';
import { useTenantConfig, useTenantBranding, useBackofficeWebMCPTools, useMinsideWebMCPTools } from '@digipicks/sdk';

import {
  BackofficeAuthBridge,
  BackofficeRoleProvider,
  ConvexRealtimeProvider,
  NotificationCenterProvider,
  NotificationCenterPanel,
  RealtimeToast,
  AccountContextProvider,
  ModeProvider,
  useMode,
  useAuthBridge,
  useBackofficeRole,
  ThemeProvider,
  useTheme,
  useBundledTheme,
  env,
  FeatureGate,
} from '@digipicks/app-shell';
import { ProtectedRouteConnected } from '@digipicks/app-shell';
import { DashboardLayout } from '@digipicks/app-shell';
import { createAuditableErrorHandler, captureException, initSentry } from '@digipicks/app-shell';

// Auth pages (public)
import { LoginPage } from '@/routes/login';
import { AuthCallbackPage } from '@/routes/auth-callback';
import { MagicLinkCallbackPage } from '@/routes/magic-link-callback';
import { RoleSelectionPage } from '@/routes/role-selection';
import { OnboardingPage } from '@/routes/onboarding';
import { WelcomePage } from '@/routes/welcome';

// Admin: Content management
import { DashboardPage } from '@/routes/dashboard';
import { NotificationsPage } from '@/routes/notifications';
import { SupportPage } from '@/routes/support';
import { AuditPage } from '@/routes/audit';
import { SettingsPage } from '@/routes/settings';

// Admin pages
import { UsersManagementPage } from '@/routes/users-management';
// TenantAdmin pages
import { TenantSettingsPage } from '@/routes/tenant/settings';
import { TenantBrandingPage } from '@/routes/tenant/branding';
import { EmailTemplatesPage } from '@/routes/email-templates';
import { EmailTemplateEditPage } from '@/routes/email-template-edit';
import { FormBuilderPage } from '@/routes/form-builder';
import { FormBuilderEditPage } from '@/routes/form-builder-edit';
import { IntegrationsPage } from '@/routes/integrations';
import { IntegrationEditPage } from '@/routes/integration-edit';

// Missing backoffice routes (absorbed from backoffice app)

// Platform routes (absorbed from saas-admin app)
import { OverviewPage as PlatformOverviewPage } from '@/routes/platform/overview';
import { TenantsPage as PlatformTenantsPage } from '@/routes/platform/tenants';
import { TenantFormPage as PlatformTenantFormPage } from '@/routes/platform/tenant-form';
import { UsersPage as PlatformUsersPage } from '@/routes/platform/users';
import { UserDetailPage as PlatformUserDetailPage } from '@/routes/platform/user-detail';
import { UserFormPage as PlatformUserFormPage } from '@/routes/platform/user-form';
import { ModulesPage as PlatformModulesPage } from '@/routes/platform/modules';
import { BillingPage as PlatformBillingPage } from '@/routes/platform/billing';
import { AuditPage as PlatformAuditPage } from '@/routes/platform/audit';
import { ModerationPage as PlatformModerationPage } from '@/routes/platform/moderation';

// Owner application flow

// User-only pages (personal context)
import { PersonalHomePage } from '@/routes/my/home';
import { UserBillingPage } from '@/routes/my/billing';
import { UserPreferencesPage } from '@/routes/my/preferences';

// Additional admin pages
import { AuditTimelinePage } from '@/routes/audit-timeline';
import { EquipmentServicesPage } from '@/routes/equipment-services';
import { GDPRPage } from '@/routes/gdpr';
import { UserDetailPage } from '@/routes/users/UserDetailPage';

// User-only pages from minside (unique)
import { NotificationSettingsPage } from '@/routes/notification-settings';
import { HelpPage } from '@/routes/help';

// DigiPicks — creator pick posting
import { PicksPage } from '@/routes/picks';
import { PickEditPage } from '@/routes/pick-edit';

// DigiPicks — creator white-label branding
import { CreatorBrandingPage } from '@/routes/creator-branding';

// DigiPicks — broadcast messaging
import { BroadcastsPage, BroadcastInboxPage } from '@/routes/broadcasts';
import { BroadcastComposePage } from '@/routes/broadcast-compose';

// DigiPicks — Stripe integration (payouts & subscribers)
import { PayoutsPage } from '@/routes/payouts';
import { SubscribersPage } from '@/routes/subscribers';
import { TrialSettingsPage } from '@/routes/trial-settings';

// Organization portal pages (org-scoped views — single deduplicated source)
import {
  OrganizationDashboardPage,
  OrganizationInvoicesPage,
  OrganizationMembersPage,
  OrganizationSettingsPage,
  OrganizationActivityPage,
} from '@/routes/org';

initSentry();

const errorHandler = createAuditableErrorHandler((error: Error, info: React.ErrorInfo) => {
  captureException(error, {
    react: { componentStack: info.componentStack ?? undefined },
  });
});

/**
 * AccountContextBridge — bridges auth user into account context.
 */
function AccountContextBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuthBridge();
  return (
    <AccountContextProvider userId={user?.id} userName={user?.name}>
      {children}
    </AccountContextProvider>
  );
}

/**
 * AccountSelectionWrapper — shows the account selection modal for users
 * who haven't selected personal/organization context yet.
 * Only active for users with role=user (not admin/case_handler/arranger).
 */
function AccountSelectionWrapper({ children }: { children: React.ReactNode }) {
  // Modal disabled — org switching via header dropdown instead
  return <>{children}</>;
}

/**
 * RoleAwareIndex — Redirect index route based on effective role + mode.
 *
 * - superadmin → /platform
 * - admin → admin DashboardPage
 * - user (owner) in utleier mode → admin DashboardPage
 * - user (owner) in leietaker mode → /my (personal dashboard)
 * - user (normal, no tenant) → /my (personal dashboard)
 */
function RoleAwareIndex() {
  const { effectiveRole } = useBackofficeRole();
  const { mode, isOwner } = useMode();

  if (effectiveRole === 'superadmin') return <Navigate to="/platform" replace />;
  if (effectiveRole === 'admin') return <DashboardPage />;

  // User role: check mode
  if (isOwner && mode === 'utleier') return <DashboardPage />;

  // Normal user or owner in leietaker mode → personal dashboard
  return <PersonalHomePage />;
}

/**
 * DashboardLayoutBridge — selects backoffice or minside layout variant
 * based on the user's effective role and mode.
 *
 * - superadmin → platform layout
 * - admin → backoffice layout
 * - user (owner, utleier mode) → backoffice layout
 * - user (normal or leietaker mode) → minside layout
 */
function DashboardLayoutBridge() {
  const { effectiveRole } = useBackofficeRole();
  const { mode, isOwner } = useMode();

  const variant =
    effectiveRole === 'superadmin'
      ? 'platform'
      : effectiveRole === 'admin'
        ? 'backoffice'
        : isOwner && mode === 'utleier'
          ? 'backoffice'
          : 'minside';

  // Expose tools to AI agents via WebMCP (Chrome 146+)
  if (variant !== 'minside') {
    useBackofficeWebMCPTools();
  } else {
    useMinsideWebMCPTools();
  }

  const { user, logout } = useAuthBridge();
  return (
    <>
      {variant === 'platform' ? (
        <DashboardLayout variant="platform" user={user} onLogout={logout} />
      ) : variant === 'backoffice' ? (
        <DashboardLayout variant="backoffice" user={user} onLogout={logout} effectiveRole={effectiveRole} />
      ) : (
        <DashboardLayout variant="minside" />
      )}
      <NotificationCenterPanel />
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
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

function AppWithTheme() {
  const { colorScheme } = useTheme();
  // Default to light mode when user hasn't explicitly chosen dark
  const effectiveColorScheme = colorScheme === 'auto' ? 'light' : colorScheme;
  const tenantId = env.tenantId;

  // Fetch tenant settings to resolve the correct theme
  const { config } = useTenantConfig(tenantId || undefined);
  const tenantTheme = (config?.settings as { theme?: string } | null)?.theme;
  const themeId = resolveThemeId(tenantTheme);

  // Inject tenant brand CSS custom properties
  useTenantBranding(tenantId || undefined);

  // Inject theme CSS from bundle (no runtime copy from /themes/)
  useBundledTheme(themeId);

  return (
    <I18nProvider>
      <DesignsystemetProvider theme={themeId} colorScheme={effectiveColorScheme} size="md" skipThemeLoading>
        <DialogProvider>
          <ErrorBoundary onError={errorHandler}>
            <ToastProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <BackofficeAuthBridge>
                  <BackofficeRoleProvider>
                    <ModeProvider>
                      <AccountContextBridge>
                        <AccountSelectionWrapper>
                          <ConvexRealtimeProvider wsUrl={env.wsUrl || undefined} tenantId={env.tenantId || undefined}>
                            <RealtimeToast />
                            <NotificationCenterProvider>
                              <Routes>
                                {/* ===== Public routes ===== */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                                <Route path="/auth/magic-link" element={<MagicLinkCallbackPage />} />
                                <Route path="/role-selection" element={<RoleSelectionPage />} />
                                <Route path="/onboarding" element={<OnboardingPage />} />

                                {/* ===== Protected layout ===== */}
                                <Route
                                  path="/"
                                  element={
                                    <ProtectedRouteConnected>
                                      <DashboardLayoutBridge />
                                    </ProtectedRouteConnected>
                                  }
                                >
                                  {/* Role-aware index */}
                                  <Route index element={<RoleAwareIndex />} />
                                  <Route path="welcome" element={<WelcomePage />} />

                                  {/* ─── Content management (admin + owner in utleier) ─── */}

                                  {/* ─── Shared: Messaging & notifications ─── */}
                                  <Route path="notifications" element={<NotificationsPage />} />
                                  <Route path="notification-settings" element={<NotificationSettingsPage />} />

                                  <Route path="help" element={<HelpPage />} />

                                  {/* ─── DigiPicks: Creator pick management ─── */}
                                  <Route path="picks" element={<PicksPage />} />
                                  <Route path="picks/new" element={<PickEditPage />} />
                                  <Route path="picks/:id" element={<PickEditPage />} />

                                  {/* ─── DigiPicks: Creator white-label branding ─── */}
                                  <Route path="branding" element={<CreatorBrandingPage />} />

                                  {/* ─── DigiPicks: Broadcast messaging ─── */}
                                  <Route path="broadcasts" element={<BroadcastsPage />} />
                                  <Route path="broadcasts/compose" element={<BroadcastComposePage />} />
                                  <Route path="broadcasts/inbox" element={<BroadcastInboxPage />} />

                                  {/* ─── DigiPicks: Stripe integration ─── */}
                                  <Route path="payouts" element={<PayoutsPage />} />
                                  <Route path="subscribers" element={<SubscribersPage />} />
                                  <Route path="trial-settings" element={<TrialSettingsPage />} />

                                  {/* ─── Admin: Operations ─── */}
                                  <Route
                                    path="support"
                                    element={
                                      <FeatureGate
                                        module="support"
                                        fallback={<Navigate to="/" replace />}
                                        appId="backoffice"
                                      >
                                        <ProtectedRouteConnected requiredRole="admin">
                                          <SupportPage />
                                        </ProtectedRouteConnected>
                                      </FeatureGate>
                                    }
                                  />
                                  <Route
                                    path="email-templates"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <EmailTemplatesPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="email-templates/new"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <EmailTemplateEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="email-templates/:slug"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <EmailTemplateEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="form-builder"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <FormBuilderPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="form-builder/new"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <FormBuilderEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="form-builder/:slug"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <FormBuilderEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="integrations"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <IntegrationsPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="integrations/new"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <IntegrationEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="integrations/:slug"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <IntegrationEditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="audit"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <AuditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="settings"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <SettingsPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />

                                  <Route
                                    path="users-management"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin" requiredCapability="CAP_USER_ADMIN">
                                        <UsersManagementPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="users/:id"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin" requiredCapability="CAP_USER_ADMIN">
                                        <UserDetailPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="audit-timeline"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <AuditTimelinePage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="equipment-services"
                                    element={
                                      <ProtectedRouteConnected requiredRole="admin">
                                        <EquipmentServicesPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  {/* ─── TenantAdmin routes ─── */}
                                  <Route
                                    path="tenant/settings"
                                    element={
                                      <ProtectedRouteConnected
                                        requiredRole="admin"
                                        requiredCapability="CAP_TENANT_SETTINGS"
                                      >
                                        <TenantSettingsPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="tenant/branding"
                                    element={
                                      <ProtectedRouteConnected
                                        requiredRole="admin"
                                        requiredCapability="CAP_TENANT_BRANDING"
                                      >
                                        <TenantBrandingPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route path="tenant/audit-log" element={<Navigate to="/audit" replace />} />

                                  {/* ─── Platform (superadmin, capability: CAP_PLATFORM_ADMIN) ─── */}
                                  <Route
                                    path="platform"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformOverviewPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/tenants"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_TENANT_MANAGE">
                                        <PlatformTenantsPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/tenants/new"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_TENANT_MANAGE">
                                        <PlatformTenantFormPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/tenants/:slug"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_TENANT_MANAGE">
                                        <PlatformTenantFormPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/tenants/:slug/edit"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_TENANT_MANAGE">
                                        <PlatformTenantFormPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/users"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformUsersPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/users/:id"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformUserDetailPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/users/:id/edit"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformUserFormPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/modules"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_MODULE_MANAGE">
                                        <PlatformModulesPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/billing"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_BILLING">
                                        <PlatformBillingPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/audit"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformAuditPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="platform/moderation"
                                    element={
                                      <ProtectedRouteConnected requiredCapability="CAP_PLATFORM_ADMIN">
                                        <PlatformModerationPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />

                                  {/* ─── Owner application flow ─── */}

                                  {/* ===== Personal routes (all user roles — context-driven) ===== */}
                                  <Route path="my/billing" element={<UserBillingPage />} />
                                  <Route path="my/preferences" element={<UserPreferencesPage />} />
                                  <Route path="gdpr" element={<GDPRPage />} />

                                  {/* ===== Organization portal routes (role=user, context=organization) ===== */}
                                  <Route
                                    path="org"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <OrganizationDashboardPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="org/invoices"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <OrganizationInvoicesPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="org/members"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <OrganizationMembersPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="org/settings"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <OrganizationSettingsPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                  <Route
                                    path="org/activity"
                                    element={
                                      <ProtectedRouteConnected requiredRole="user">
                                        <OrganizationActivityPage />
                                      </ProtectedRouteConnected>
                                    }
                                  />
                                </Route>

                                <Route path="*" element={<Navigate to="/" replace />} />
                              </Routes>
                            </NotificationCenterProvider>
                          </ConvexRealtimeProvider>
                        </AccountSelectionWrapper>
                      </AccountContextBridge>
                    </ModeProvider>
                  </BackofficeRoleProvider>
                </BackofficeAuthBridge>
              </BrowserRouter>
            </ToastProvider>
          </ErrorBoundary>
        </DialogProvider>
      </DesignsystemetProvider>
    </I18nProvider>
  );
}
