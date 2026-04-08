/**
 * Role Selection Page - Backoffice App
 *
 * Displays role selection for dual-role users after authentication.
 * Uses LoginLayout for consistent styling with the login page.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LoginLayout,
  PlatformIcon,
  ShieldCheckIcon,
  ClipboardListIcon,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuthBridge, useRole, useNeedsRoleSelection } from '@digilist-saas/app-shell';
import { RoleSelector } from '@digilist-saas/app-shell';
import type { PlatformRole } from '@digilist-saas/app-shell';

export function RoleSelectionPage(): React.ReactElement {
  const { isAuthenticated, isLoading: authLoading } = useAuthBridge();
  const {
    effectiveRole,
    isInitializing,
    getHomeRoute,
    grantedRoles,
    setEffectiveRole,
  } = useRole();
  const needsRoleSelection = useNeedsRoleSelection();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  // Get the intended destination if any
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Redirect away if role is already selected (single-role or already chose)
  useEffect(() => {
    if (!isInitializing && !needsRoleSelection && effectiveRole) {
      // If there's a saved destination, go there, otherwise go to home
      const destination = from ?? getHomeRoute();
      navigate(destination, { replace: true });
    }
  }, [isInitializing, needsRoleSelection, effectiveRole, navigate, from, getHomeRoute]);

  // Show nothing while loading auth or role state
  if (authLoading || isInitializing) {
    return <></>;
  }

  // Handle role selection - navigate to appropriate home page
  const handleRoleSelect = (role: PlatformRole): void => {
    // Navigate to saved destination or role-appropriate home
    const destination = from ?? (role === 'admin' ? '/' : '/work-queue');
    navigate(destination, { replace: true });
  };

  const features = [
    {
      icon: <PlatformIcon size={20} />,
      title: t('auth.roleSelection.adminFeatures', 'Full tilgang'),
      description: t('auth.roleSelection.adminFeaturesDesc', 'Administrere brukere, organisasjoner og innstillinger'),
    },
    {
      icon: <ShieldCheckIcon size={20} />,
      title: t('auth.roleSelection.caseHandlerFeatures', 'Saksbehandling'),
      description: t('auth.roleSelection.caseHandlerFeaturesDesc', 'Behandle bookinger, søknader og henvendelser'),
    },
    {
      icon: <ClipboardListIcon size={20} />,
      title: t('auth.roleSelection.roleSwitch', 'Fleksibel bytte'),
      description: t('auth.roleSelection.roleSwitchDesc', 'Bytt mellom roller når som helst uten ny innlogging'),
    },
  ];

  const privacyUrl = import.meta.env.VITE_PRIVACY_URL || '/privacy';
  const termsUrl = import.meta.env.VITE_TERMS_URL || '/terms';
  const contactUrl = import.meta.env.VITE_CONTACT_URL || '/about';

  const footerLinks = [
    { href: privacyUrl, label: t('auth.privacy') },
    { href: termsUrl, label: t('auth.terms') },
    { href: contactUrl, label: t('auth.contactSupport') },
  ];

  return (
    <LoginLayout
      brandName={import.meta.env.VITE_PLATFORM_NAME || "Xala Foundation"}
      brandTagline="ENKEL SAAS"
      title={t('auth.roleSelection.title', 'Velg rolle')}
      subtitle={t('auth.roleSelection.subtitle', 'Du har tilgang til flere roller. Velg hvordan du vil fortsette.')}
      panelTitle={t('auth.backoffice')}
      panelSubtitle={t('auth.roleSelection.panelTitle', 'Flere roller, en innlogging')}
      panelDescription={t(
        'auth.roleSelection.panelDescription',
        'Du har tilgang til både administrator- og saksbehandlerroller. Velg hvilken rolle du vil bruke for denne økten.'
      )}
      features={features}
      footerLinks={footerLinks}
      copyright={t('auth.copyright')}
    >
      <RoleSelector
        grantedRoles={grantedRoles}
        setEffectiveRole={setEffectiveRole}
        onRoleSelect={handleRoleSelect}
      />
    </LoginLayout>
  );
}

export default RoleSelectionPage;
