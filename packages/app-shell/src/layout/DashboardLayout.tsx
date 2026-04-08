/**
 * DashboardLayout
 *
 * Single layout for the unified portal (minside, admin, platform) with variant.
 * Uses config and hooks from shared. No wrappers needed.
 */

import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Alert } from '@digilist-saas/ds';
import { useAuth } from '@digilist-saas/app-shell';
import { useAccountContext } from '@digilist-saas/app-shell';
import { DashboardHeaderSlots } from '@digilist-saas/app-shell';
import type { DashboardHeaderUser } from '@digilist-saas/app-shell';
import type { PlatformRole } from '@digilist-saas/app-shell';
import { AppDashboardLayout } from '@digilist-saas/ds';
import { DashboardSidebar, HeaderLogo } from '@digilist-saas/ds';
import { PageTitleProvider } from '../providers/PageTitleContext';
import { useDashboardNavSections } from './useDashboardNav';
import { useDashboardBottomNav } from './useDashboardNav';

interface LocationState {
  contextRedirectMessage?: string;
  from?: { pathname: string };
}

interface DashboardLayoutMinsideProps {
  variant: 'minside';
}

interface DashboardLayoutAdminProps {
  variant: 'backoffice';
  user: DashboardHeaderUser | null;
  onLogout: () => void | Promise<void>;
  effectiveRole: PlatformRole | null;
}

interface DashboardLayoutPlatformProps {
  variant: 'platform';
  user: DashboardHeaderUser | null;
  onLogout: () => void | Promise<void>;
}

export type DashboardLayoutProps =
  | DashboardLayoutMinsideProps
  | DashboardLayoutAdminProps
  | DashboardLayoutPlatformProps;

function DashboardLayoutMinside(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const accountContext = useAccountContext();
  const lostOrganizationMessage = accountContext?.lostOrganizationMessage ?? null;
  const clearLostOrganizationMessage = accountContext?.clearLostOrganizationMessage ?? (() => {});
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  const sections = useDashboardNavSections({ variant: 'minside' });
  const bottomNavItems = useDashboardBottomNav('minside');

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.contextRedirectMessage) {
      setRedirectMessage(state.contextRedirectMessage);
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setRedirectMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (lostOrganizationMessage) {
      const timer = setTimeout(clearLostOrganizationMessage, 7000);
      return () => clearTimeout(timer);
    }
  }, [lostOrganizationMessage, clearLostOrganizationMessage]);

  const topAlerts =
    redirectMessage || lostOrganizationMessage ? (
      <>
        {redirectMessage && (
          <Alert data-color="info" data-size="sm" role="status" aria-live="polite">
            {redirectMessage}
          </Alert>
        )}
        {lostOrganizationMessage && (
          <Alert data-color="warning" data-size="sm" role="alert" aria-live="assertive">
            {lostOrganizationMessage}
          </Alert>
        )}
      </>
    ) : undefined;

  return (
    <AppDashboardLayout
      header={
        <DashboardHeaderSlots variant="minside" user={auth.user} onLogout={() => {
          // Clear local session state without awaiting server deletion (avoids browser "Leave page?" prompt)
          const group = 'digilist';
          ['user', 'session_token', 'tenant_id'].forEach(k => { localStorage.removeItem(`digilist_saas_${group}_${k}`); localStorage.removeItem(`digilist_saas_${k}`); });
          const host = window.location.hostname;
          const parts = host.split('.');
          const cookieDomain = parts.length >= 2 ? `.${parts.slice(-2).join('.')}` : '';
          document.cookie = `digilist_saas_session_${group}=; path=/;${cookieDomain ? ` domain=${cookieDomain};` : ''} max-age=0`;
          document.cookie = `digilist_saas_session_${group}=; path=/; max-age=0`;
          window.location.href = String(import.meta.env.VITE_WEB_APP_URL || 'http://localhost:5190');
        }} />
      }
      sidebar={
        <DashboardSidebar
          logoTitle={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")}
          logoSubtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")}
          logo={
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
              <HeaderLogo src="/logo.svg" title={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")} subtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")} height="36px" />
            </Link>
          }
          sections={sections}
          id="minside-sidebar"
          dataTestId="minside-sidebar"
        />
      }
      bottomNavItems={bottomNavItems}
      topAlerts={topAlerts}
      showSidebarOnMobile={false}
    />
  );
}

function DashboardLayoutAdmin({
  user,
  onLogout,
  effectiveRole,
}: {
  user: DashboardHeaderUser | null;
  onLogout: () => void | Promise<void>;
  effectiveRole: PlatformRole | null;
}): React.ReactElement {
  const sections = useDashboardNavSections({ variant: 'backoffice', effectiveRole });
  const bottomNavItems = useDashboardBottomNav('backoffice');

  return (
    <AppDashboardLayout
      header={
        <DashboardHeaderSlots variant="backoffice" user={user} onLogout={onLogout} />
      }
      sidebar={
        <DashboardSidebar
          logoTitle={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")}
          logoSubtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")}
          logo={
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
              <HeaderLogo src="/logo.svg" title={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")} subtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")} height="36px" />
            </Link>
          }
          sections={sections}
          id="backoffice-sidebar"
          dataTestId="backoffice-sidebar"
        />
      }
      bottomNavItems={bottomNavItems}
      showSidebarOnMobile
    />
  );
}

function DashboardLayoutPlatform({
  user,
  onLogout,
}: {
  user: DashboardHeaderUser | null;
  onLogout: () => void | Promise<void>;
}): React.ReactElement {
  const sections = useDashboardNavSections({ variant: 'platform', effectiveRole: 'superadmin' });
  const bottomNavItems = useDashboardBottomNav('platform');

  return (
    <AppDashboardLayout
      header={
        <DashboardHeaderSlots variant="backoffice" user={user} onLogout={onLogout} />
      }
      sidebar={
        <DashboardSidebar
          logoTitle={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")}
          logoSubtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")}
          logo={
            <Link to="/platform" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
              <HeaderLogo src="/logo.svg" title={String(import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation")} subtitle={String(import.meta.env.VITE_PLATFORM_TAGLINE || "Simple SAAS")} height="36px" />
            </Link>
          }
          sections={sections}
          id="platform-sidebar"
          dataTestId="platform-sidebar"
        />
      }
      bottomNavItems={bottomNavItems}
      showSidebarOnMobile
    />
  );
}

export function DashboardLayout(props: DashboardLayoutProps): React.ReactElement {
  if (props.variant === 'minside') {
    return (
      <PageTitleProvider>
        <DashboardLayoutMinside />
      </PageTitleProvider>
    );
  }
  if (props.variant === 'platform') {
    return (
      <PageTitleProvider>
        <DashboardLayoutPlatform
          user={props.user}
          onLogout={props.onLogout}
        />
      </PageTitleProvider>
    );
  }
  return (
    <PageTitleProvider>
      <DashboardLayoutAdmin
        user={props.user}
        onLogout={props.onLogout}
        effectiveRole={props.effectiveRole}
      />
    </PageTitleProvider>
  );
}
