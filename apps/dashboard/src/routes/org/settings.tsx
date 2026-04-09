/**
 * OrganizationSettingsPage
 *
 * Organization portal settings page — connected to real SDK hooks
 * - Organization profile (from useOrganization)
 * - Notification preferences
 * - Contact information
 * - Billing settings
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Input,
  Switch,
  Stack,
  Grid,
  Spinner,
  FormField,
  useIsMobile,
  useToast,
  DashboardPageHeader,
  PageContentLayout,
} from '@digipicks/ds';
import { useOrganization, useUpdateOrganization } from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { useAccountContext } from '@digipicks/app-shell';
import s from './Settings.module.css';

export function OrganizationSettingsPage() {
  const t = useT();
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  const accountCtx = useAccountContext();
  const orgId = accountCtx?.selectedOrganization?.id as Id<'organizations'> | undefined;

  const { data: orgData, isLoading: orgLoading } = useOrganization(orgId);
  const updateOrg = useUpdateOrganization();

  const org = orgData?.data;

  // Settings state — initialized from org data
  const [settings, setSettings] = useState({
    orgName: '',
    orgNumber: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    emailBookingConfirm: true,
    emailBookingReminder: true,
    emailInvoice: true,
    smsReminder: false,
    invoiceEmail: '',
    paymentTerms: '30',
  });

  // Sync from org data when loaded
  useEffect(() => {
    if (org) {
      const meta = (org.metadata ?? {}) as Record<string, any>;
      const orgSettings = (org.settings ?? {}) as Record<string, any>;
      setSettings((prev) => ({
        ...prev,
        orgName: org.name ?? '',
        orgNumber: meta.orgNumber ?? '',
        email: meta.email ?? '',
        phone: meta.phone ?? '',
        address: meta.address ?? '',
        postalCode: meta.postalCode ?? '',
        city: meta.city ?? '',
        emailBookingConfirm: orgSettings.emailBookingConfirm ?? true,
        emailBookingReminder: orgSettings.emailBookingReminder ?? true,
        emailInvoice: orgSettings.emailInvoice ?? true,
        smsReminder: orgSettings.smsReminder ?? false,
        invoiceEmail: meta.invoiceEmail ?? '',
        paymentTerms: meta.paymentTerms ?? '30',
      }));
    }
  }, [org]);

  const [isSaving, setIsSaving] = useState(false);

  const updateSetting = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!orgId) return;
    setIsSaving(true);
    try {
      await updateOrg.mutateAsync({
        id: orgId,
        name: settings.orgName,
        metadata: {
          orgNumber: settings.orgNumber,
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          postalCode: settings.postalCode,
          city: settings.city,
          invoiceEmail: settings.invoiceEmail,
          paymentTerms: settings.paymentTerms,
        },
        settings: {
          emailBookingConfirm: settings.emailBookingConfirm,
          emailBookingReminder: settings.emailBookingReminder,
          emailInvoice: settings.emailInvoice,
          smsReminder: settings.smsReminder,
        },
      });
      showToast({ title: t('settings.saved'), variant: 'success' });
    } catch {
      showToast({ title: t('settings.saveFailed', 'Kunne ikke lagre innstillinger.'), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (orgLoading) {
    return (
      <PageContentLayout>
        <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
          <Spinner aria-label={t('common.loading')} data-size="lg" />
        </Stack>
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('org.settings')}
        subtitle={t('org.settingsDesc')}
        backHref="/org"
        backLabel={t('org.backToDashboard')}
        actions={
          <Button type="button" variant="primary" data-size="md" onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        }
      />

      {/* Organization Profile */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="sm" className={s.sectionTitle}>
          {t('org.organizationProfile')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
            <FormField label={t('common.name')}>
              <Input
                value={settings.orgName}
                onChange={(e) => updateSetting('orgName', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
            <FormField label={t('org.orgNumber')}>
              <Input
                value={settings.orgNumber}
                onChange={(e) => updateSetting('orgNumber', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
          </Grid>
          <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
            <FormField label={t('common.email')}>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
            <FormField label={t('settings.phoneNumber')}>
              <Input
                value={settings.phone}
                onChange={(e) => updateSetting('phone', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
          </Grid>
          <FormField label={t('settings.streetAddress')}>
            <Input
              value={settings.address}
              onChange={(e) => updateSetting('address', e.target.value)}
              className={s.fullWidth}
            />
          </FormField>
          <Grid columns={isMobile ? '1fr' : '1fr 2fr'} gap="var(--ds-size-4)">
            <FormField label={t('settings.postalCode')}>
              <Input
                value={settings.postalCode}
                onChange={(e) => updateSetting('postalCode', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
            <FormField label={t('settings.city')}>
              <Input
                value={settings.city}
                onChange={(e) => updateSetting('city', e.target.value)}
                className={s.fullWidth}
              />
            </FormField>
          </Grid>
        </Stack>
      </Card>

      {/* Notifications */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="sm" className={s.sectionTitle}>
          {t('settings.notifications')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          {[
            {
              key: 'emailBookingConfirm',
              label: t('org.notifBookingConfirm'),
              description: t('org.notifBookingConfirmDesc'),
            },
            { key: 'emailBookingReminder', label: t('org.notifReminders'), description: t('org.notifRemindersDesc') },
            { key: 'emailInvoice', label: t('org.notifInvoices'), description: t('org.notifInvoicesDesc') },
            { key: 'smsReminder', label: t('org.notifSmsReminders'), description: t('org.notifSmsRemindersDesc') },
          ].map((item) => (
            <Stack key={item.key} direction="horizontal" justify="between" align="center" className={s.notificationRow}>
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={s.notificationLabel}>
                  {item.label}
                </Paragraph>
                <Paragraph data-size="xs" className={s.notificationDesc}>
                  {item.description}
                </Paragraph>
              </Stack>
              <Switch
                aria-label={item.label}
                checked={settings[item.key as keyof typeof settings] as boolean}
                onChange={(e) => updateSetting(item.key, e.target.checked)}
              />
            </Stack>
          ))}
        </Stack>
      </Card>

      {/* Billing */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="sm" className={s.sectionTitle}>
          {t('org.billing')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <FormField label={t('org.invoiceEmail')}>
            <Input
              type="email"
              value={settings.invoiceEmail}
              onChange={(e) => updateSetting('invoiceEmail', e.target.value)}
              className={s.fullWidth}
            />
          </FormField>
          <FormField label={t('org.paymentTermsDays')}>
            <Input
              type="number"
              value={settings.paymentTerms}
              onChange={(e) => updateSetting('paymentTerms', e.target.value)}
              className={s.fullWidth}
            />
          </FormField>
        </Grid>
      </Card>
    </PageContentLayout>
  );
}
