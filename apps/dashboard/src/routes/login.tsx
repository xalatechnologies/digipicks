/**
 * Login Page - Dashboard App
 *
 * Handles two cases:
 * 1. SSO handoff from web app (hash contains session token) — stores and redirects to home
 * 2. No session — redirects to web app login
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@digilist-saas/ds';
import { useAuthBridge, useRole, env } from '@digilist-saas/app-shell';

/**
 * Extract and consume SSO payload from URL hash.
 * Format: #sso=base64({token, user})
 * Returns true if SSO was consumed (page should wait for auth to pick it up).
 */
function consumeSSOFromHash(): boolean {
  const hash = window.location.hash;
  if (!hash.startsWith('#sso=')) return false;

  try {
    const payload = JSON.parse(atob(hash.slice(5)));
    const { token, user } = payload;
    if (token && user) {
      // Store in the same keys the SDK useAuth reads
      localStorage.setItem('digilist_saas_digilist_session_token', token);
      localStorage.setItem('digilist_saas_digilist_user', user);
      // Also store tenantId for SDK hooks that resolve via useSessionTenantId
      try {
        const parsed = JSON.parse(user);
        if (parsed.tenantId) {
          localStorage.setItem('digilist_saas_digilist_tenant_id', parsed.tenantId);
        }
      } catch { /* ignore */ }
      // Also set the cross-domain cookie for AuthBridge detection
      const domain = window.location.hostname.split('.').slice(-2).join('.');
      document.cookie = `digilist_saas_session_digilist=${encodeURIComponent(token)}; path=/; domain=.${domain}; max-age=${30 * 24 * 3600}; SameSite=Lax`;
      // Clean the hash from URL
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return true;
    }
  } catch {
    // Invalid payload — ignore
  }
  return false;
}

export function LoginPage(): React.ReactElement {
  const { isAuthenticated, isLoading: authLoading } = useAuthBridge();
  const { isInitializing, getHomeRoute } = useRole();
  const navigate = useNavigate();
  const [ssoConsumed, setSsoConsumed] = useState(false);

  // First render: check for SSO hash payload
  useEffect(() => {
    if (consumeSSOFromHash()) {
      setSsoConsumed(true);
      // Force full reload so AuthBridge picks up the new session from localStorage/cookie
      window.location.href = window.location.pathname;
    }
  }, []);

  useEffect(() => {
    if (ssoConsumed) return; // Waiting for reload
    if (authLoading || isInitializing) return;

    const searchParams = new URLSearchParams(window.location.search);
    const isLogout = searchParams.get('logout') === 'true';
    const qs = isLogout ? '?logout=true' : '';

    // On logout: clear all session data from this domain before redirecting
    if (isLogout) {
      ['digilist_saas_digilist_session_token', 'digilist_saas_digilist_user', 'digilist_saas_digilist_tenant_id',
       'backoffice_mock_user', 'digilist_saas_backoffice_user', 'digilist_saas_backoffice_tenant_id',
       'backoffice_effective_role', 'backoffice_remember_role_choice', 'dashboard_mode',
      ].forEach(k => localStorage.removeItem(k));
      // Clear SSO cookies
      const domain = window.location.hostname.split('.').slice(-2).join('.');
      document.cookie = `digilist_saas_session_digilist=; path=/; domain=.${domain}; max-age=0`;
      document.cookie = `digilist_saas_mock_sso=; path=/; max-age=0`;
    }

    if (isAuthenticated && !isLogout) {
      navigate(getHomeRoute(), { replace: true });
      return;
    }

    // Not authenticated — redirect to the web app login
    const webLoginUrl = `${env.webAppUrl}/login${qs}`;
    window.location.href = webLoginUrl;
  }, [isAuthenticated, authLoading, isInitializing, navigate, getHomeRoute, ssoConsumed]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spinner aria-label="Logger inn..." />
    </div>
  );
}
