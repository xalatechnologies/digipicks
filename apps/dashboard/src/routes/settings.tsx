/**
 * Settings Page - Complete Tenant Configuration
 * Manage tenant settings, integrations, and system configuration
 */

import { useState, useRef } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  PillTabs,
  Stack,
  Grid,
  FormField,
  Textfield,
  PillDropdown,
  Switch,
  Badge,
  Alert,
  SaveIcon,
  CheckCircleIcon,
  UserIcon,
  CameraIcon,
  CopyIcon,
  InfoIcon,
  DashboardPageHeader,
  PageContentLayout,
  ErrorState,
  HiddenFileInput,
  useToast,
} from '@digipicks/ds';
import { useSetPageTitle } from '@digipicks/app-shell';
import {
  useTenantSettings,
  useUpdateTenantSettings,
  useIntegrationSettings,
  useUpdateIntegration,
  useCurrentUser,
  useUpdateCurrentUser,
  useUploadUserAvatar,
  type Address,
} from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import styles from './settings.module.css';

// Extended types for settings page UI (SDK types are stubs)
type SettingsData = {
  general?: {
    name: string;
    locale: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
  };
  booking?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  branding?: { logo: string; primaryColor: string; secondaryColor: string; favicon: string };
};
type IntegrationsMap = Record<string, { enabled: boolean; config?: Record<string, unknown> }>;

export function SettingsPage() {
  const t = useT();
  useSetPageTitle(t('settings.title'));
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Queries
  const { data: settingsData, isLoading, error } = useTenantSettings({});
  const settings = (settingsData?.data ?? null) as unknown as SettingsData | null;

  const { data: integrationsData } = useIntegrationSettings('all');
  const integrations = (integrationsData?.data ?? null) as unknown as IntegrationsMap | null;

  const { data: currentUserData, isLoading: isLoadingUser } = useCurrentUser();
  const currentUser = currentUserData?.data as
    | (Record<string, unknown> & {
        id: string;
        name?: string;
        email?: string;
        phone?: string;
        dateOfBirth?: string;
        nationalId?: string;
        invoiceAddress?: Address;
        residenceAddress?: Address;
        avatar?: string;
      })
    | undefined;

  // Mutations
  const updateSettingsMutation = useUpdateTenantSettings();
  const updateIntegrationMutation = useUpdateIntegration();
  const updateProfileMutation = useUpdateCurrentUser();
  const uploadAvatarMutation = useUploadUserAvatar();

  const [formData, setFormData] = useState({
    general: {
      name: '',
      locale: 'nb',
      timezone: 'Europe/Oslo',
      currency: 'NOK',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: '24h',
    },
    booking: {
      autoConfirm: false,
      requireApproval: true,
      allowCancellation: true,
      cancellationDeadlineHours: 24,
      maxAdvanceBookingDays: 90,
      minAdvanceBookingHours: 2,
      bufferTimeMinutes: 0,
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      bookingConfirmation: true,
      bookingReminder: true,
      reminderHoursBefore: 24,
    },
    branding: {
      logo: '',
      primaryColor: '#1A56DB',
      secondaryColor: '#6B7280',
      favicon: '',
    },
  });

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationalId: '',
    invoiceAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Norge',
    } as Address,
    residenceAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Norge',
    } as Address,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Load settings into form
  useState(() => {
    if (settings) {
      setFormData({
        general: (settings.general as typeof formData.general) || formData.general,
        booking: (settings.booking as typeof formData.booking) || formData.booking,
        notifications: (settings.notifications as typeof formData.notifications) || formData.notifications,
        branding: (settings.branding as typeof formData.branding) || formData.branding,
      });
    }
  });

  // Load current user into profile form
  useState(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        dateOfBirth: currentUser.dateOfBirth || '',
        nationalId: currentUser.nationalId || '',
        invoiceAddress: currentUser.invoiceAddress || { street: '', city: '', postalCode: '', country: 'Norge' },
        residenceAddress: currentUser.residenceAddress || { street: '', city: '', postalCode: '', country: 'Norge' },
      });
      if (currentUser.avatar) {
        setAvatarPreview(currentUser.avatar);
      }
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateSettingsMutation.mutateAsync({ ...formData, tenantId: '' } as any);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      showToast({ title: t('common.saveError'), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleIntegrationToggle = async (provider: string, enabled: boolean) => {
    try {
      await updateIntegrationMutation.updateIntegration({ provider, data: { enabled } });
    } catch (error) {
      showToast({ title: t('common.saveError'), variant: 'error' });
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updateProfileMutation.mutateAsync(profileData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      showToast({ title: t('common.saveError'), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload avatar
    setIsUploadingAvatar(true);
    try {
      await uploadAvatarMutation.mutateAsync({
        id: currentUser.id,
        file,
        options: { compress: true },
      });
    } catch (error) {
      showToast({ title: t('common.uploadError'), variant: 'error' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCopyResidenceToInvoice = () => {
    setProfileData((prev) => ({
      ...prev,
      invoiceAddress: { ...prev.residenceAddress },
    }));
  };

  if (error) {
    return (
      <PageContentLayout>
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      </PageContentLayout>
    );
  }

  if (isLoading || isLoadingUser) {
    return (
      <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
        <Spinner data-size="lg" aria-label={t('common.loading')} />
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" spacing="var(--ds-size-5)">
      <DashboardPageHeader />
      {saveSuccess && (
        <Alert className={styles.successAlert}>
          <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
            <CheckCircleIcon />
            {t('settings.saveSuccess')}
          </Stack>
        </Alert>
      )}

      {/* Tabs */}
      <PillTabs
        tabs={[
          { id: 'profile', label: t('settings.profile.tabLabel') },
          { id: 'addresses', label: t('settings.addresses.tabLabel') },
          { id: 'general', label: t('settings.general.tabLabel') },
          { id: 'booking', label: t('settings.booking.tabLabel') },
          { id: 'notifications', label: t('settings.notifications.tabLabel') },
          { id: 'integrations', label: t('settings.integrations.tabLabel') },
          { id: 'branding', label: t('settings.branding.tabLabel') },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel={t('settings.tabsAriaLabel')}
        className={styles.tabsMargin}
      />

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <Stack spacing={4}>
          {/* Avatar Section */}
          <Card>
            <Stack spacing={5}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                  {t('settings.profile.avatar')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.profile.avatarDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" align="center" spacing="var(--ds-size-4)">
                <Stack direction="horizontal" justify="center" align="center" className={styles.avatarContainer}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={t('settings.profile.avatarAlt')} className={styles.avatarImage} />
                  ) : (
                    <UserIcon className={styles.avatarIcon} />
                  )}
                </Stack>

                <Stack spacing={2}>
                  <HiddenFileInput ref={fileInputRef} accept="image/*" onChange={handleAvatarChange} />
                  <Button
                    variant="secondary"
                    data-size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    type="button"
                  >
                    <CameraIcon />
                    {isUploadingAvatar ? t('settings.profile.uploading') : t('settings.profile.changePicture')}
                  </Button>
                  <Paragraph data-size="xs" className={styles.subtleText}>
                    {t('settings.profile.avatarFormats')}
                  </Paragraph>
                </Stack>
              </Stack>
            </Stack>
          </Card>

          {/* Personal Information */}
          <Card>
            <Stack spacing={5}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                  {t('settings.profile.personalInfo')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.profile.personalInfoDesc')}
                </Paragraph>
              </div>

              <Stack spacing={4}>
                <FormField label={t('settings.profile.fullName')} required>
                  <Textfield
                    aria-label={t('settings.profile.fullName')}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t('settings.profile.fullNamePlaceholder')}
                  />
                </FormField>

                <FormField label={t('settings.profile.emailAddress')} required>
                  <Textfield
                    aria-label={t('settings.profile.emailAddress')}
                    value={profileData.email}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder={t('settings.profile.emailPlaceholder')}
                  />
                </FormField>

                <FormField label={t('settings.profile.phoneNumber')}>
                  <Textfield
                    aria-label={t('settings.profile.phoneNumber')}
                    value={profileData.phone}
                    onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('settings.profile.phonePlaceholder')}
                  />
                </FormField>

                <Grid columns="1fr 1fr" gap="var(--ds-size-3)">
                  <FormField label={t('settings.profile.dateOfBirth')}>
                    <Textfield
                      aria-label={t('settings.profile.dateOfBirth')}
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </FormField>

                  <FormField label={t('settings.profile.nationalId')}>
                    <Textfield
                      aria-label={t('settings.profile.nationalId')}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, nationalId: e.target.value }))}
                      placeholder={t('settings.profile.nationalIdPlaceholder')}
                      maxLength={11}
                    />
                  </FormField>
                </Grid>
              </Stack>

              <div className={styles.formDivider}>
                <Button variant="primary" data-size="lg" onClick={handleSaveProfile} disabled={isSaving} type="button">
                  <SaveIcon />
                  {isSaving ? t('common.saving') : t('settings.saveChanges')}
                </Button>
              </div>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <Stack spacing={5}>
          {/* Intro */}
          <Card>
            <Stack spacing={3}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.addresses.title')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.addresses.description')}
                </Paragraph>
              </div>
            </Stack>
          </Card>

          {/* Residence Address */}
          <Card>
            <Stack spacing={5}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.addresses.residenceAddress')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.addresses.residenceAddressDesc')}
                </Paragraph>
              </div>

              <Stack spacing={4}>
                <FormField label={t('settings.addresses.streetAddress')} required>
                  <Textfield
                    aria-label={t('settings.addresses.streetAddress')}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        residenceAddress: { ...prev.residenceAddress, street: e.target.value },
                      }))
                    }
                    placeholder={t('settings.addresses.streetPlaceholder')}
                  />
                </FormField>

                <Grid columns="2fr 1fr" gap="var(--ds-size-3)">
                  <FormField label={t('settings.addresses.city')} required>
                    <Textfield
                      aria-label={t('settings.addresses.city')}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          residenceAddress: { ...prev.residenceAddress, city: e.target.value },
                        }))
                      }
                      placeholder={t('settings.addresses.cityPlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('settings.addresses.postalCode')} required>
                    <Textfield
                      aria-label={t('settings.addresses.postalCodeResidence')}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          residenceAddress: { ...prev.residenceAddress, postalCode: e.target.value },
                        }))
                      }
                      placeholder={t('settings.addresses.postalCodePlaceholder')}
                      maxLength={4}
                    />
                  </FormField>
                </Grid>

                <FormField label={t('settings.addresses.country')} required>
                  <PillDropdown
                    label={profileData.residenceAddress.country || t('settings.addresses.countryNorway')}
                    options={[
                      { value: 'Norge', label: t('settings.addresses.countryNorway') },
                      { value: 'Sverige', label: t('settings.addresses.countrySweden') },
                      { value: 'Danmark', label: t('settings.addresses.countryDenmark') },
                      { value: 'Finland', label: t('settings.addresses.countryFinland') },
                    ]}
                    value={profileData.residenceAddress.country || 'Norge'}
                    onChange={(v) =>
                      setProfileData((prev) => ({
                        ...prev,
                        residenceAddress: { ...prev.residenceAddress, country: v },
                      }))
                    }
                    ariaLabel={t('settings.addresses.country')}
                  />
                </FormField>
              </Stack>
            </Stack>
          </Card>

          {/* Invoice Address */}
          <Card>
            <Stack spacing={5}>
              <Stack direction="horizontal" justify="between" align="start">
                <div>
                  <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                    {t('settings.addresses.invoiceAddress')}
                  </Heading>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.addresses.invoiceAddressDesc')}
                  </Paragraph>
                </div>
                <Button variant="tertiary" data-size="sm" onClick={handleCopyResidenceToInvoice} type="button">
                  <CopyIcon />
                  {t('settings.addresses.copyFromResidence')}
                </Button>
              </Stack>

              <Stack spacing={4}>
                <FormField label={t('settings.addresses.streetAddress')} required>
                  <Textfield
                    aria-label={t('settings.addresses.streetAddress')}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        invoiceAddress: { ...prev.invoiceAddress, street: e.target.value },
                      }))
                    }
                    placeholder={t('settings.addresses.streetPlaceholder')}
                  />
                </FormField>

                <Grid columns="2fr 1fr" gap="var(--ds-size-3)">
                  <FormField label={t('settings.addresses.city')} required>
                    <Textfield
                      aria-label={t('settings.addresses.city')}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          invoiceAddress: { ...prev.invoiceAddress, city: e.target.value },
                        }))
                      }
                      placeholder={t('settings.addresses.cityPlaceholder')}
                    />
                  </FormField>

                  <FormField label={t('settings.addresses.postalCode')} required>
                    <Textfield
                      aria-label={t('settings.addresses.postalCodeInvoice')}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          invoiceAddress: { ...prev.invoiceAddress, postalCode: e.target.value },
                        }))
                      }
                      placeholder={t('settings.addresses.postalCodePlaceholder')}
                      maxLength={4}
                    />
                  </FormField>
                </Grid>

                <FormField label={t('settings.addresses.country')} required>
                  <PillDropdown
                    label={profileData.invoiceAddress.country || t('settings.addresses.countryNorway')}
                    options={[
                      { value: 'Norge', label: t('settings.addresses.countryNorway') },
                      { value: 'Sverige', label: t('settings.addresses.countrySweden') },
                      { value: 'Danmark', label: t('settings.addresses.countryDenmark') },
                      { value: 'Finland', label: t('settings.addresses.countryFinland') },
                    ]}
                    value={profileData.invoiceAddress.country || 'Norge'}
                    onChange={(v) =>
                      setProfileData((prev) => ({
                        ...prev,
                        invoiceAddress: { ...prev.invoiceAddress, country: v },
                      }))
                    }
                    ariaLabel={t('settings.addresses.country')}
                  />
                </FormField>
              </Stack>
            </Stack>
          </Card>

          {/* Address Verification Info */}
          <Card data-color="neutral" className={styles.infoCard}>
            <Stack spacing={3}>
              <Stack direction="horizontal" spacing="var(--ds-size-2)" align="start">
                <InfoIcon className={styles.infoIcon} />
                <div>
                  <Paragraph data-size="sm" className={styles.verificationTitle}>
                    {t('settings.addresses.verificationTitle')}
                  </Paragraph>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.addresses.verificationDesc')}
                  </Paragraph>
                </div>
              </Stack>
            </Stack>
          </Card>

          {/* Save Button */}
          <Stack direction="horizontal" justify="end">
            <Button variant="primary" data-size="lg" onClick={handleSaveProfile} disabled={isSaving} type="button">
              <SaveIcon />
              {isSaving ? t('common.saving') : t('settings.addresses.saveAddresses')}
            </Button>
          </Stack>
        </Stack>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card>
          <Stack spacing={5}>
            <div>
              <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                {t('settings.general.title')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('settings.general.description')}
              </Paragraph>
            </div>

            <Stack spacing={4}>
              <FormField label={t('settings.general.systemName')} description={t('settings.general.systemNameDesc')}>
                <Textfield
                  aria-label={t('settings.general.systemName')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      general: { ...prev.general, name: e.target.value },
                    }))
                  }
                  placeholder={t('settings.general.systemNamePlaceholder')}
                />
              </FormField>

              <FormField label={t('tenantSettings.language')}>
                <PillDropdown
                  label={
                    [
                      { value: 'nb', label: t('settings.general.langNb') },
                      { value: 'nn', label: t('settings.general.langNn') },
                      { value: 'en', label: t('settings.general.langEn') },
                    ].find((o) => o.value === formData.general.locale)?.label ?? t('tenantSettings.language')
                  }
                  options={[
                    { value: 'nb', label: t('settings.general.langNb') },
                    { value: 'nn', label: t('settings.general.langNn') },
                    { value: 'en', label: t('settings.general.langEn') },
                  ]}
                  value={formData.general.locale}
                  onChange={(v) => setFormData((prev) => ({ ...prev, general: { ...prev.general, locale: v } }))}
                  ariaLabel={t('tenantSettings.language')}
                />
              </FormField>

              <FormField label={t('tenantSettings.timezone')}>
                <PillDropdown
                  label={
                    [
                      { value: 'Europe/Oslo', label: t('settings.general.tzOslo') },
                      { value: 'Europe/London', label: t('settings.general.tzLondon') },
                      { value: 'America/New_York', label: t('settings.general.tzNewYork') },
                    ].find((o) => o.value === formData.general.timezone)?.label ?? t('tenantSettings.timezone')
                  }
                  options={[
                    { value: 'Europe/Oslo', label: t('settings.general.tzOslo') },
                    { value: 'Europe/London', label: t('settings.general.tzLondon') },
                    { value: 'America/New_York', label: t('settings.general.tzNewYork') },
                  ]}
                  value={formData.general.timezone}
                  onChange={(v) => setFormData((prev) => ({ ...prev, general: { ...prev.general, timezone: v } }))}
                  ariaLabel={t('tenantSettings.timezone')}
                />
              </FormField>

              <FormField label={t('tenantSettings.currency')}>
                <PillDropdown
                  label={
                    [
                      { value: 'NOK', label: t('settings.general.currNok') },
                      { value: 'EUR', label: t('settings.general.currEur') },
                      { value: 'USD', label: t('settings.general.currUsd') },
                    ].find((o) => o.value === formData.general.currency)?.label ?? t('tenantSettings.currency')
                  }
                  options={[
                    { value: 'NOK', label: t('settings.general.currNok') },
                    { value: 'EUR', label: t('settings.general.currEur') },
                    { value: 'USD', label: t('settings.general.currUsd') },
                  ]}
                  value={formData.general.currency}
                  onChange={(v) => setFormData((prev) => ({ ...prev, general: { ...prev.general, currency: v } }))}
                  ariaLabel={t('tenantSettings.currency')}
                />
              </FormField>

              <Grid columns="1fr 1fr" gap="var(--ds-size-3)">
                <FormField label={t('settings.general.dateFormat')}>
                  <PillDropdown
                    label={
                      [
                        { value: 'dd.MM.yyyy', label: '31.12.2024' },
                        { value: 'yyyy-MM-dd', label: '2024-12-31' },
                        { value: 'MM/dd/yyyy', label: '12/31/2024' },
                      ].find((o) => o.value === formData.general.dateFormat)?.label ?? t('settings.general.dateFormat')
                    }
                    options={[
                      { value: 'dd.MM.yyyy', label: '31.12.2024' },
                      { value: 'yyyy-MM-dd', label: '2024-12-31' },
                      { value: 'MM/dd/yyyy', label: '12/31/2024' },
                    ]}
                    value={formData.general.dateFormat}
                    onChange={(v) => setFormData((prev) => ({ ...prev, general: { ...prev.general, dateFormat: v } }))}
                    ariaLabel={t('settings.general.dateFormat')}
                  />
                </FormField>

                <FormField label={t('settings.general.timeFormat')}>
                  <PillDropdown
                    label={
                      [
                        { value: '24h', label: t('settings.general.time24h') },
                        { value: '12h', label: t('settings.general.time12h') },
                      ].find((o) => o.value === formData.general.timeFormat)?.label ?? t('settings.general.timeFormat')
                    }
                    options={[
                      { value: '24h', label: t('settings.general.time24h') },
                      { value: '12h', label: t('settings.general.time12h') },
                    ]}
                    value={formData.general.timeFormat}
                    onChange={(v) => setFormData((prev) => ({ ...prev, general: { ...prev.general, timeFormat: v } }))}
                    ariaLabel={t('settings.general.timeFormat')}
                  />
                </FormField>
              </Grid>
            </Stack>

            <div className={styles.formDivider}>
              <Button variant="primary" data-size="lg" onClick={handleSave} disabled={isSaving} type="button">
                <SaveIcon />
                {isSaving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </Stack>
        </Card>
      )}

      {/* Booking Settings */}
      {activeTab === 'booking' && (
        <Card>
          <Stack spacing={5}>
            <div>
              <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                {t('settings.booking.title')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('settings.booking.description')}
              </Paragraph>
            </div>

            <Stack spacing={4}>
              <FormField label={t('settings.booking.autoConfirm')}>
                <Switch
                  checked={formData.booking.autoConfirm}
                  aria-label={t('settings.booking.autoConfirmDesc')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking: { ...prev.booking, autoConfirm: e.target.checked },
                    }))
                  }
                >
                  {t('settings.booking.autoConfirmDesc')}
                </Switch>
              </FormField>

              {!formData.booking.autoConfirm && (
                <FormField label={t('settings.booking.requireApproval')}>
                  <Switch
                    checked={formData.booking.requireApproval}
                    aria-label={t('settings.booking.requireApprovalDesc')}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        booking: { ...prev.booking, requireApproval: e.target.checked },
                      }))
                    }
                  >
                    {t('settings.booking.requireApprovalDesc')}
                  </Switch>
                </FormField>
              )}

              <FormField label={t('settings.booking.allowCancellation')}>
                <Switch
                  checked={formData.booking.allowCancellation}
                  aria-label={t('settings.booking.allowCancellationDesc')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking: { ...prev.booking, allowCancellation: e.target.checked },
                    }))
                  }
                >
                  {t('settings.booking.allowCancellationDesc')}
                </Switch>
              </FormField>

              {formData.booking.allowCancellation && (
                <FormField
                  label={t('settings.booking.cancellationDeadline')}
                  description={t('settings.booking.cancellationDeadlineDesc')}
                >
                  <Textfield
                    aria-label={t('settings.booking.cancellationDeadline')}
                    value={formData.booking.cancellationDeadlineHours.toString()}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        booking: { ...prev.booking, cancellationDeadlineHours: parseInt(e.target.value) || 0 },
                      }))
                    }
                    min="0"
                    suffix={t('settings.booking.suffixHours')}
                  />
                </FormField>
              )}

              <FormField
                label={t('settings.booking.maxAdvanceBooking')}
                description={t('settings.booking.maxAdvanceBookingDesc')}
              >
                <Textfield
                  aria-label={t('settings.booking.maxAdvanceBooking')}
                  value={formData.booking.maxAdvanceBookingDays.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking: { ...prev.booking, maxAdvanceBookingDays: parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="1"
                  suffix={t('settings.booking.suffixDays')}
                />
              </FormField>

              <FormField
                label={t('settings.booking.minAdvanceTime')}
                description={t('settings.booking.minAdvanceTimeDesc')}
              >
                <Textfield
                  aria-label={t('settings.booking.minAdvanceTime')}
                  value={formData.booking.minAdvanceBookingHours.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking: { ...prev.booking, minAdvanceBookingHours: parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  suffix={t('settings.booking.suffixHours')}
                />
              </FormField>

              <FormField label={t('settings.booking.bufferTime')} description={t('settings.booking.bufferTimeDesc')}>
                <Textfield
                  aria-label={t('settings.booking.bufferTime')}
                  value={formData.booking.bufferTimeMinutes.toString()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      booking: { ...prev.booking, bufferTimeMinutes: parseInt(e.target.value) || 0 },
                    }))
                  }
                  min="0"
                  suffix={t('settings.booking.suffixMinutes')}
                />
              </FormField>
            </Stack>

            <div className={styles.formDivider}>
              <Button variant="primary" data-size="lg" onClick={handleSave} disabled={isSaving} type="button">
                <SaveIcon />
                {isSaving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </Stack>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <Card>
          <Stack spacing={5}>
            <div>
              <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                {t('settings.notifications.title')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('settings.notifications.description')}
              </Paragraph>
            </div>

            <Stack spacing={4}>
              <FormField label={t('settings.notifications.emailAlerts')}>
                <Switch
                  checked={formData.notifications.emailEnabled}
                  aria-label={t('settings.notifications.emailAlertsDesc')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, emailEnabled: e.target.checked },
                    }))
                  }
                >
                  {t('settings.notifications.emailAlertsDesc')}
                </Switch>
              </FormField>

              <FormField label={t('settings.notifications.smsAlerts')}>
                <Switch
                  checked={formData.notifications.smsEnabled}
                  aria-label={t('settings.notifications.smsAlertsDesc')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, smsEnabled: e.target.checked },
                    }))
                  }
                >
                  {t('settings.notifications.smsAlertsDesc')}
                </Switch>
              </FormField>

              <FormField label={t('settings.notifications.pushAlerts')}>
                <Switch
                  checked={formData.notifications.pushEnabled}
                  aria-label={t('settings.notifications.pushAlertsDesc')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: { ...prev.notifications, pushEnabled: e.target.checked },
                    }))
                  }
                >
                  {t('settings.notifications.pushAlertsDesc')}
                </Switch>
              </FormField>

              <div className={styles.notificationSection}>
                <Paragraph data-size="sm" className={styles.notificationSectionTitle}>
                  {t('settings.notifications.automaticAlerts')}
                </Paragraph>

                <Stack spacing={3}>
                  <FormField label={t('settings.notifications.bookingConfirmation')}>
                    <Switch
                      checked={formData.notifications.bookingConfirmation}
                      aria-label={t('settings.notifications.bookingConfirmationDesc')}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, bookingConfirmation: e.target.checked },
                        }))
                      }
                    >
                      {t('settings.notifications.bookingConfirmationDesc')}
                    </Switch>
                  </FormField>

                  <FormField label={t('settings.notifications.bookingReminder')}>
                    <Switch
                      checked={formData.notifications.bookingReminder}
                      aria-label={t('settings.notifications.bookingReminderDesc')}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, bookingReminder: e.target.checked },
                        }))
                      }
                    >
                      {t('settings.notifications.bookingReminderDesc')}
                    </Switch>
                  </FormField>

                  {formData.notifications.bookingReminder && (
                    <FormField
                      label={t('settings.notifications.reminderTiming')}
                      description={t('settings.notifications.reminderTimingDesc')}
                    >
                      <Textfield
                        aria-label={t('settings.notifications.reminderTiming')}
                        value={formData.notifications.reminderHoursBefore.toString()}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              reminderHoursBefore: parseInt(e.target.value) || 24,
                            },
                          }))
                        }
                        min="1"
                        suffix={t('settings.notifications.suffixHoursBefore')}
                      />
                    </FormField>
                  )}
                </Stack>
              </div>
            </Stack>

            <div className={styles.formDivider}>
              <Button variant="primary" data-size="lg" onClick={handleSave} disabled={isSaving} type="button">
                <SaveIcon />
                {isSaving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </Stack>
        </Card>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <Stack spacing={4}>
          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.authentication')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.authenticationDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'BankID'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.bankidDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.bankid?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleBankid')}
                    checked={integrations?.bankid?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('bankid', !integrations?.bankid?.enabled)}
                  />
                </Stack>
              </Stack>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'ID-porten'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.idportenDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.idporten?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleIdporten')}
                    checked={integrations?.idporten?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('idporten', !integrations?.idporten?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.payment')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.paymentDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'Vipps'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.vippsDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.vipps?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleVipps')}
                    checked={integrations?.vipps?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('vipps', !integrations?.vipps?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.accessControl')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.accessControlDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'RCO'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.rcoDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.rco?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleRco')}
                    checked={integrations?.rco?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('rco', !integrations?.rco?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.calendar')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.calendarDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'Google Calendar'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.googleCalendarDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.googleCalendar?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleGoogleCalendar')}
                    checked={integrations?.googleCalendar?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('googleCalendar', !integrations?.googleCalendar?.enabled)}
                  />
                </Stack>
              </Stack>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'Outlook'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.outlookDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.outlook?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleOutlook')}
                    checked={integrations?.outlook?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('outlook', !integrations?.outlook?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.economyErp')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.economyErpDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{'Visma'}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.vismaDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.visma?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleVisma')}
                    checked={integrations?.visma?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('visma', !integrations?.visma?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Card>
            <Stack spacing={4}>
              <div>
                <Heading level={3} data-size="sm" className={styles.sectionHeadingSm}>
                  {t('settings.integrations.publicRegistries')}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('settings.integrations.publicRegistriesDesc')}
                </Paragraph>
              </div>

              <Stack direction="horizontal" justify="between" align="center" className={styles.integrationRow}>
                <div>
                  <div className={styles.integrationName}>{t('settings.integrations.brregName')}</div>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('settings.integrations.brregDesc')}
                  </Paragraph>
                </div>
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                  {integrations?.brreg?.enabled ? (
                    <Badge variant="success">{t('settings.integrations.active')}</Badge>
                  ) : (
                    <Badge variant="neutral">{t('settings.integrations.inactive')}</Badge>
                  )}
                  <Switch
                    aria-label={t('settings.integrations.toggleBrreg')}
                    checked={integrations?.brreg?.enabled || false}
                    onChange={(_e) => handleIntegrationToggle('brreg', !integrations?.brreg?.enabled)}
                  />
                </Stack>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* Branding */}
      {activeTab === 'branding' && (
        <Card>
          <Stack spacing={5}>
            <div>
              <Heading level={3} data-size="sm" className={styles.sectionHeading}>
                {t('settings.branding.title')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('settings.branding.description')}
              </Paragraph>
            </div>

            <Stack spacing={4}>
              <FormField label={t('settings.branding.logoUrl')} description={t('settings.branding.logoUrlDesc')}>
                <Textfield
                  aria-label={t('settings.branding.logoUrl')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, logo: e.target.value },
                    }))
                  }
                  placeholder={t('settings.branding.logoPlaceholder')}
                />
              </FormField>

              <FormField
                label={t('settings.branding.primaryColor')}
                description={t('settings.branding.primaryColorDesc')}
              >
                <Textfield
                  aria-label={t('settings.branding.primaryColor')}
                  value={formData.branding.primaryColor || '#1A56DB'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value },
                    }))
                  }
                />
              </FormField>

              <FormField
                label={t('settings.branding.secondaryColor')}
                description={t('settings.branding.secondaryColorDesc')}
              >
                <Textfield
                  aria-label={t('settings.branding.secondaryColor')}
                  value={formData.branding.secondaryColor || '#6B7280'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, secondaryColor: e.target.value },
                    }))
                  }
                />
              </FormField>

              <FormField label={t('settings.branding.faviconUrl')} description={t('settings.branding.faviconUrlDesc')}>
                <Textfield
                  aria-label={t('settings.branding.faviconUrl')}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, favicon: e.target.value },
                    }))
                  }
                  placeholder={t('settings.branding.faviconPlaceholder')}
                />
              </FormField>
            </Stack>

            <div className={styles.formDivider}>
              <Button variant="primary" data-size="lg" onClick={handleSave} disabled={isSaving} type="button">
                <SaveIcon />
                {isSaving ? t('common.saving') : t('settings.saveChanges')}
              </Button>
            </div>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
