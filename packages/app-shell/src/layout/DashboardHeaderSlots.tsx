/**
 * DashboardHeaderSlots
 *
 * Shared header content for Digilist dashboard apps (minside, backoffice).
 * Uses DashboardHeader from @digilist-saas/ds with GlobalSearch, theme toggle, notifications, user menu.
 *
 * Variants:
 * - minside: appId="minside", search placeholder for user dashboard
 * - backoffice: appId="backoffice", search placeholder for admin
 *
 * onNotificationClick: Optional. Opens notification center modal when NotificationCenterProvider is present; falls back to navigate('/notifications').
 */

import { useNavigate } from 'react-router-dom';
import {
  DashboardHeader,
  Heading,
  HeaderActions,
  HeaderIconButton,
  HeaderLanguageSwitch,
  HeaderThemeToggle,
  NotificationBell,
  UserMenu,
  SettingsIcon,
  UserIcon,
  BuildingIcon,
} from '@digilist-saas/ds';
import { useNotificationUnreadCount, type Id } from '@digilist-saas/sdk';
import { useI18nLocale, useT } from '@digilist-saas/i18n';
import { GlobalSearch, useTheme, useNotificationCenterOptional, useAccountContext, useModeOptional } from '@digilist-saas/app-shell';
import { usePageTitle } from '../providers/PageTitleContext';
import headerStyles from './DashboardHeaderSlots.module.css';

export type DashboardHeaderSlotsVariant = 'minside' | 'backoffice' | 'docs';

const VARIANT_CONFIG: Record<
  DashboardHeaderSlotsVariant,
  { appId?: 'minside' | 'backoffice'; placeholder: string; context?: 'dashboard' | 'learning' }
> = {
  minside: {
    appId: 'minside',
    placeholder: 'Søk i bookinger, brukere...',
    context: 'dashboard',
  },
  backoffice: {
    appId: 'backoffice',
    placeholder: 'Søk i lokaler, kategorier, populære søk...',
    context: 'dashboard',
  },
  docs: {
    placeholder: 'Søk i veiledninger...',
    context: 'learning',
  },
};

export interface DashboardHeaderUser {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface DashboardHeaderSlotsProps {
  variant: DashboardHeaderSlotsVariant;
  /** Optional. Opens notification center modal when NotificationCenterProvider is present; falls back to navigate('/notifications'). */
  onNotificationClick?: () => void;
  /** User for UserMenu. Pass from app's useAuth. Docs: optional (omit when unauthenticated). */
  user?: DashboardHeaderUser | null;
  /** Logout handler. Pass from app's useAuth. Docs: optional. */
  onLogout?: () => void | Promise<void>;
}

export function DashboardHeaderSlots({
  variant,
  onNotificationClick: onNotificationClickProp,
  user,
  onLogout,
}: DashboardHeaderSlotsProps): React.ReactElement {
  const { isDark, toggleTheme } = useTheme();
  const { locale, setLocale } = useI18nLocale();
  const t = useT();
  const navigate = useNavigate();
  const notificationCenter = useNotificationCenterOptional();
  const { data: unreadData } = useNotificationUnreadCount(
    user?.id ? (user.id as Id<'users'>) : undefined,
  );
  const unreadCount = unreadData?.count ?? 0;

  const accountContext = useAccountContext();
  const modeCtx = useModeOptional();
  const { title: pageTitle, count: pageTitleCount } = usePageTitle();
  const config = VARIANT_CONFIG[variant];
  const { appId, placeholder, context = 'dashboard' } = config;

  // Build account list for UserMenu switcher (minside always, backoffice only for user role)
  const accounts = (() => {
    if (!accountContext) return [];
    if (variant !== 'minside' && variant !== 'backoffice') return [];
    const list: Array<{ id: string; name: string; type: 'personal' | 'organization' }> = [
      { id: 'personal', name: 'Personlig', type: 'personal' },
    ];
    for (const org of accountContext.organizations) {
      list.push({ id: org.id, name: org.name, type: 'organization' });
    }
    return list;
  })();
  const currentAccountId = accountContext?.accountType === 'organization'
    ? accountContext.selectedOrganization?.id ?? 'personal'
    : 'personal';
  const handleAccountSwitch = (accountId: string) => {
    if (!accountContext) return;
    if (accountId === 'personal') {
      accountContext.switchToPersonal();
      navigate('/');
    } else {
      accountContext.switchToOrganization(accountId);
      accountContext.markAccountAsSelected();
      navigate('/org');
    }
  };

  const onNotificationClick =
    onNotificationClickProp ??
    (notificationCenter
      ? notificationCenter.openNotificationCenter
      : () => navigate('/notifications'));

  const showNotifications = variant !== 'docs';
  const showSettings = variant !== 'docs';
  const showUserMenu = variant !== 'docs' && user != null;

  return (
    <DashboardHeader
      id="main-navigation"
      leftSlot={pageTitle ? (
        <Heading data-size="xs" level={1} className={headerStyles.pageTitle}>
          {pageTitle}
          {pageTitleCount != null && (
            <span className={headerStyles.pageTitleCount}> ({pageTitleCount})</span>
          )}
        </Heading>
      ) : undefined}
      centerSlot={variant !== 'backoffice' ? (
        <GlobalSearch
          context={context}
          appId={appId}
          placeholder={placeholder}
          showShortcut
          enableGlobalShortcut
        />
      ) : undefined}
      rightSlot={
        <HeaderActions spacing={variant === 'minside' ? 'var(--ds-size-2)' : 'var(--ds-size-3)'}>
          <HeaderLanguageSwitch
            language={locale}
            onSwitch={(lang) => setLocale(lang as 'nb' | 'en')}
            languages={[{ code: 'nb', label: 'NO' }, { code: 'en', label: 'EN' }]}
          />
          <HeaderThemeToggle isDark={isDark} onToggle={toggleTheme} />
          {showNotifications && (
            <NotificationBell
              count={unreadCount}
              onClick={onNotificationClick!}
              aria-label={`Varsler${unreadCount > 0 ? ` (${unreadCount} uleste)` : ''}`}
            />
          )}
          {showSettings && (
            <HeaderIconButton
              icon={<SettingsIcon size={22} />}
              size="md"
              aria-label="Innstillinger"
              title="Innstillinger"
              onClick={() => navigate('/settings')}
            />
          )}
          {showUserMenu && user && onLogout && (
            <UserMenu
              user={{
                name: user.name || user.email || 'User',
                email: user.email || '',
                avatar: user.avatarUrl,
              }}
              accounts={accounts}
              currentAccountId={currentAccountId}
              onAccountSwitch={handleAccountSwitch}
              onLogout={onLogout}
              menuItems={[
                // Mode toggle (owners only)
                ...(modeCtx?.canToggle ? [{
                  label: modeCtx.mode === 'leietaker'
                    ? t('mode.switchToUtleier', 'Bytt til utleier-modus')
                    : t('mode.switchToLeietaker', 'Bytt til leietaker-modus'),
                  icon: <BuildingIcon size={16} />,
                  onClick: () => {
                    const newMode = modeCtx.mode === 'leietaker' ? 'utleier' : 'leietaker';
                    modeCtx.setMode(newMode);
                    navigate('/');
                  },
                }] : []),
                // Standard menu items
                ...(variant === 'minside'
                  ? [{ label: t('minside.settings', 'Innstillinger'), icon: <SettingsIcon size={16} />, onClick: () => navigate('/preferences') }]
                  : [
                      { label: t('nav.myDashboard', 'Min side'), icon: <UserIcon size={16} />, onClick: () => navigate('/') },
                      { label: t('backoffice.nav.settings', 'Innstillinger'), icon: <SettingsIcon size={16} />, onClick: () => navigate('/settings') },
                    ]
                ),
              ]}
            />
          )}
        </HeaderActions>
      }
    />
  );
}
