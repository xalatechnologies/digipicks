/**
 * UserPreferencesPage
 *
 * User portal preferences page — wired to real SDK hooks
 * - Notification preferences (real backend)
 * - Privacy preferences
 * - Display settings (language/theme)
 * - Account management (export/delete)
 */

import { useState } from 'react';
import ps from './Preferences.module.css';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Switch,
  PillDropdown,
  Stack,
  Grid,
  Spinner,
  FormField,
  useIsMobile,
  useToast,
  DashboardPageHeader,
  PageContentLayout,
  useDialog,
} from '@digilist-saas/ds';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useExportData,
  useDeleteAccount,
} from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import { useT, useLocale } from '@digilist-saas/i18n';
import { useAuth, useTenantContext } from '@digilist-saas/app-shell';

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'preferencesPage.themeSystem' as const },
  { value: 'light', labelKey: 'preferencesPage.themeLight' as const },
  { value: 'dark', labelKey: 'preferencesPage.themeDark' as const },
];

const LANG_OPTIONS = [
  { value: 'nb', label: 'Norsk (Bokmal)' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
];

// Notification categories to configure
const NOTIFICATION_CATEGORIES = [
  { category: 'booking', channels: ['email', 'push', 'in_app'] },
  { category: 'reminder', channels: ['email', 'push', 'in_app'] },
  { category: 'message', channels: ['email', 'push', 'in_app'] },
  { category: 'system', channels: ['email', 'in_app'] },
];

export function UserPreferencesPage() {
  const t = useT();
  const { user, signOut } = useAuth();
  const { locale, setLocale } = useLocale();
  const { showToast } = useToast();
  const { confirm } = useDialog();
  const isMobile = useIsMobile();

  const userId = user?.id as Id<"users"> | undefined;
  const { tenantId } = useTenantContext();

  // Real SDK hooks
  const { data: prefsData, isLoading: prefsLoading } = useNotificationPreferences(userId);
  const updatePref = useUpdateNotificationPreferences();
  const exportDataMutation = useExportData();
  const deleteAccountMutation = useDeleteAccount();

  const prefs = prefsData?.data;

  // Local display preferences
  const [theme, setTheme] = useState('system');
  const [isExporting, setIsExporting] = useState(false);

  const handleTogglePreference = (category: string, channel: string, currentValue: boolean) => {
    if (!userId || !tenantId) return;
    updatePref.mutate({
      tenantId: tenantId as any,
      userId,
      category,
      channel,
      enabled: !currentValue,
    });
    showToast({ title: t('settings.preferenceUpdated'), variant: 'success' });
  };

  const getPreferenceValue = (category: string, channel: string): boolean => {
    if (!prefs?.categories[category]) return true;
    if (channel === 'email') return prefs.categories[category].email;
    if (channel === 'push') return prefs.categories[category].push;
    if (channel === 'in_app') return prefs.categories[category].inApp;
    return true;
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'booking': return t('notifications.typeBooking');
      case 'reminder': return t('notifications.typeReminder');
      case 'message': return t('notifications.typeMessage');
      case 'system': return t('notifications.typeSystem');
      default: return category;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'email': return t('preferencesPage.channelEmail');
      case 'push': return t('preferencesPage.channelPush');
      case 'in_app': return t('preferencesPage.channelInApp');
      default: return channel;
    }
  };

  const handleExportData = async () => {
    if (!tenantId || !userId) return;
    setIsExporting(true);
    try {
      await exportDataMutation.mutateAsync({ tenantId: tenantId as string, userId: userId as string });
      showToast({ title: t('settings.exportStarted'), variant: 'success' });
    } catch {
      showToast({ title: t('settings.exportFailed'), variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: t('settings.deleteAccountTitle'),
      description: t('settings.deleteAccountConfirm'),
      confirmText: t('settings.deleteAccountTitle'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed && userId) {
      try {
        await deleteAccountMutation.mutateAsync({ id: userId as any });
        await signOut();
        window.location.href = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:5190';
      } catch {
        showToast({ title: t('settings.deleteAccountFailed', 'Kunne ikke slette kontoen.'), variant: 'error' });
      }
    }
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('settings.preferences')}
        subtitle={t('settings.preferencesDesc')}
      />

      {/* Notification Preferences */}
      <Card className={ps.sectionCard}>
        <Heading level={2} data-size="sm" className={ps.sectionHeading}>
          {t('settings.notifications.tabLabel')}
        </Heading>

        {prefsLoading ? (
          <Stack direction="horizontal" justify="center" className={ps.loadingCenter}>
            <Spinner aria-label={t('common.loading')} />
          </Stack>
        ) : (
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            {NOTIFICATION_CATEGORIES.map(({ category, channels }) => (
              <div key={category}>
                <Paragraph data-size="sm" className={ps.preferenceLabel}>
                  {getCategoryLabel(category)}
                </Paragraph>
                <Stack direction="vertical" spacing="var(--ds-size-2)">
                  {channels.map((channel) => {
                    const value = getPreferenceValue(category, channel);
                    return (
                      <Stack
                        key={`${category}-${channel}`}
                        direction="horizontal"
                        justify="between"
                        align="center"
                        className={ps.preferenceRow}
                      >
                        <Paragraph data-size="sm" className={ps.noMargin}>
                          {getChannelLabel(channel)}
                        </Paragraph>
                        <Switch
                          aria-label={`${getCategoryLabel(category)} - ${getChannelLabel(channel)}`}
                          checked={value}
                          onChange={() => handleTogglePreference(category, channel, value)}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
              </div>
            ))}
          </Stack>
        )}
      </Card>

      {/* Display Settings */}
      <Card className={ps.sectionCard}>
        <Heading level={2} data-size="sm" className={ps.sectionHeading}>
          {t('preferencesPage.display')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <FormField label={t('preferencesPage.theme')}>
            <PillDropdown
              label={THEME_OPTIONS.find(o => o.value === theme) ? t(THEME_OPTIONS.find(o => o.value === theme)!.labelKey) : t('preferencesPage.selectTheme')}
              options={THEME_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey) }))}
              value={theme}
              onChange={setTheme}
              className={ps.fullWidthButton}
              ariaLabel={t('preferencesPage.selectTheme')}
            />
          </FormField>
          <FormField label={t('preferencesPage.language')}>
            <PillDropdown
              label={LANG_OPTIONS.find(o => o.value === locale)?.label ?? t('preferencesPage.selectLanguage')}
              options={LANG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              value={locale}
              onChange={(v) => setLocale(v as 'nb' | 'en' | 'ar')}
              className={ps.fullWidthButton}
              ariaLabel={t('preferencesPage.selectLanguage')}
            />
          </FormField>
        </Grid>
      </Card>

      {/* Danger Zone */}
      <Card className={ps.dangerCard}>
        <Heading level={2} data-size="sm" className={ps.dangerHeading}>
          {t('preferencesPage.dangerZone')}
        </Heading>
        <Paragraph data-size="sm" className={ps.dangerDesc}>
          {t('preferencesPage.dangerZoneDesc')}
        </Paragraph>
        <Stack direction="horizontal" spacing="var(--ds-size-3)" wrap>
          <Button
            type="button"
            variant="secondary"
            data-size="md"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? t('settings.exporting') : t('preferencesPage.exportData')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            data-size="md"
            onClick={handleDeleteAccount}
            className={ps.dangerButton}
          >
            {t('preferencesPage.deleteAccount')}
          </Button>
        </Stack>
      </Card>
    </PageContentLayout>
  );
}
