/**
 * TenantSettingsPage
 *
 * TenantAdmin page for managing tenant configuration
 * - General settings
 * - Feature toggles
 * - Module configuration
 * - Integration settings
 */


import { useState } from 'react';
import { useT } from '@digilist-saas/i18n';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Input,
  PillDropdown,
  Switch,
  DashboardPageHeader,
  PageContentLayout,
  Stack,
  Grid,
  FormField,
  useIsMobile,
} from '@digilist-saas/ds';
import styles from './settings.module.css';

const FEATURES = [
  { key: 'bookingEnabled', labelKey: 'tenantSettings.bookingEnabled', descKey: 'tenantSettings.bookingEnabledDesc' },
  { key: 'seasonalLeaseEnabled', labelKey: 'tenantSettings.seasonalLeaseEnabled', descKey: 'tenantSettings.seasonalLeaseEnabledDesc' },
  { key: 'organizationPortalEnabled', labelKey: 'tenantSettings.organizationPortalEnabled', descKey: 'tenantSettings.organizationPortalEnabledDesc' },
  { key: 'publicListingsEnabled', labelKey: 'tenantSettings.publicListingsEnabled', descKey: 'tenantSettings.publicListingsEnabledDesc' },
  { key: 'reviewsEnabled', labelKey: 'tenantSettings.reviewsEnabled', descKey: 'tenantSettings.reviewsEnabledDesc' },
] as const;

const INTEGRATIONS = [
  { key: 'paymentEnabled', labelKey: 'tenantSettings.paymentEnabled', descKey: 'tenantSettings.paymentEnabledDesc' },
  { key: 'vippsIntegration', labelKey: 'tenantSettings.vippsIntegration', descKey: 'tenantSettings.vippsIntegrationDesc' },
  { key: 'emailNotifications', labelKey: 'tenantSettings.emailNotifications', descKey: 'tenantSettings.emailNotificationsDesc' },
  { key: 'smsNotifications', labelKey: 'tenantSettings.smsNotifications', descKey: 'tenantSettings.smsNotificationsDesc' },
] as const;

export function TenantSettingsPage() {
  const t = useT();
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Settings state
  const [settings, setSettings] = useState({
    tenantName: '',
    tenantSlug: '',
    defaultLanguage: 'nb',
    timezone: 'Europe/Oslo',
    currency: 'NOK',
    bookingEnabled: true,
    seasonalLeaseEnabled: true,
    organizationPortalEnabled: true,
    publicListingsEnabled: true,
    reviewsEnabled: true,
    paymentEnabled: false,
    vippsIntegration: false,
    emailNotifications: true,
    smsNotifications: false,
    maxBookingAdvanceDays: '90',
    defaultCancellationHours: '24',
  });

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('tenantSettings.title')}
        subtitle={t('tenantSettings.subtitle')}
        actions={
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        }
      />

      {/* General Settings */}
      <Card data-color="neutral" className={styles.sectionCard}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantSettings.generalSettings')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
            <FormField label={t('tenantSettings.tenantName')}>
              <Input
                value={settings.tenantName}
                onChange={(e) => updateSetting('tenantName', e.target.value)}
                className={styles.fullWidthInput}
              />
            </FormField>
            <FormField label={t('tenantSettings.slug')}>
              <Input
                value={settings.tenantSlug}
                onChange={(e) => updateSetting('tenantSlug', e.target.value)}
                className={styles.fullWidthInput}
              />
            </FormField>
          </Grid>
          <Grid columns={isMobile ? '1fr' : 'repeat(3, 1fr)'} gap="var(--ds-size-4)">
            <FormField label={t('tenantSettings.language')}>
              <PillDropdown
                label={[{ value: 'nb', label: 'Norsk (bokmål)' }, { value: 'nn', label: 'Norsk (nynorsk)' }, { value: 'en', label: 'English' }].find(o => o.value === settings.defaultLanguage)?.label ?? t('tenantSettings.selectLanguage')}
                options={[
                  { value: 'nb', label: 'Norsk (bokmål)' },
                  { value: 'nn', label: 'Norsk (nynorsk)' },
                  { value: 'en', label: 'English' },
                ]}
                value={settings.defaultLanguage}
                onChange={(v) => updateSetting('defaultLanguage', v)}
                className={styles.fullWidthInput}
                ariaLabel={t('tenantSettings.selectLanguage')}
              />
            </FormField>
            <FormField label={t('tenantSettings.timezone')}>
              <PillDropdown
                label={[{ value: 'Europe/Oslo', label: 'Europe/Oslo (CET)' }, { value: 'UTC', label: 'UTC' }].find(o => o.value === settings.timezone)?.label ?? t('tenantSettings.selectTimezone')}
                options={[
                  { value: 'Europe/Oslo', label: 'Europe/Oslo (CET)' },
                  { value: 'UTC', label: 'UTC' },
                ]}
                value={settings.timezone}
                onChange={(v) => updateSetting('timezone', v)}
                className={styles.fullWidthInput}
                ariaLabel={t('tenantSettings.selectTimezone')}
              />
            </FormField>
            <FormField label={t('tenantSettings.currency')}>
              <PillDropdown
                label={[{ value: 'NOK', label: 'NOK' }, { value: 'EUR', label: 'EUR' }, { value: 'SEK', label: 'SEK' }].find(o => o.value === settings.currency)?.label ?? t('tenantSettings.selectCurrency')}
                options={[
                  { value: 'NOK', label: 'NOK' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'SEK', label: 'SEK' },
                ]}
                value={settings.currency}
                onChange={(v) => updateSetting('currency', v)}
                className={styles.fullWidthInput}
                ariaLabel={t('tenantSettings.selectCurrency')}
              />
            </FormField>
          </Grid>
        </Stack>
      </Card>

      {/* Feature Toggles */}
      <Card data-color="neutral" className={styles.sectionCard}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantSettings.features')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          {FEATURES.map(feature => (
            <Stack
              key={feature.key}
              direction="horizontal"
              justify="between"
              align="center"
              className={styles.toggleRow}
            >
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.toggleLabel}>{t(feature.labelKey)}</Paragraph>
                <Paragraph data-size="xs" className={styles.toggleDescription}>
                  {t(feature.descKey)}
                </Paragraph>
              </Stack>
              <Switch
                aria-label={t(feature.labelKey)}
                checked={settings[feature.key as keyof typeof settings] as boolean}
                onChange={(e) => updateSetting(feature.key, e.target.checked)}
              />
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* Integrations */}
      <Card data-color="neutral" className={styles.sectionCard}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantSettings.integrations')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          {INTEGRATIONS.map(integration => (
            <Stack
              key={integration.key}
              direction="horizontal"
              justify="between"
              align="center"
              className={styles.toggleRow}
            >
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.toggleLabel}>{t(integration.labelKey)}</Paragraph>
                <Paragraph data-size="xs" className={styles.toggleDescription}>
                  {t(integration.descKey)}
                </Paragraph>
              </Stack>
              <Switch
                aria-label={t(integration.labelKey)}
                checked={settings[integration.key as keyof typeof settings] as boolean}
                onChange={(e) => updateSetting(integration.key, e.target.checked)}
              />
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* Booking Rules */}
      <Card data-color="neutral" className={styles.sectionCard}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantSettings.bookingRules')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <FormField label={t('tenantSettings.maxBookingAdvanceDays')}>
            <Input
              type="number"
              value={settings.maxBookingAdvanceDays}
              onChange={(e) => updateSetting('maxBookingAdvanceDays', e.target.value)}
              className={styles.fullWidthInput}
            />
          </FormField>
          <FormField label={t('tenantSettings.cancellationNoticeHours')}>
            <Input
              type="number"
              value={settings.defaultCancellationHours}
              onChange={(e) => updateSetting('defaultCancellationHours', e.target.value)}
              className={styles.fullWidthInput}
            />
          </FormField>
        </Grid>
      </Card>
    </PageContentLayout>
  );
}
