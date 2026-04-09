import {
  Card,
  Heading,
  Paragraph,
  Switch,
  Spinner,
  Stack,
  DashboardPageHeader,
  PageContentLayout,
  useToast,
} from '@digipicks/ds';
import s from './NotificationSettings.module.css';
import { useT } from '@digipicks/i18n';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  usePushPermission,
  usePushSubscriptionFlow,
  usePushSubscriptions,
  type NotificationPreferences,
} from '@digipicks/sdk';
import { useAuth, useTenantContext } from '@digipicks/app-shell';
import { useState, useEffect } from 'react';

/**
 * Notification Settings Page
 *
 * Allows users to configure notification preferences including:
 * - Push notification subscription
 * - Email notifications
 * - In-app notifications
 * - Booking-specific notification types
 * - Reminder timing preferences
 */
export function NotificationSettingsPage() {
  const t = useT();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { tenantId } = useTenantContext();
  const userId = user?.id as string | undefined;

  // SDK hooks for notification preferences
  const { data: preferencesData, isLoading: isLoadingPreferences } = useNotificationPreferences();
  const updatePreferencesMutation = useUpdateNotificationPreferences();

  // Push notification subscription hooks (stubs)
  const { data: pushPermissionData } = usePushPermission();
  const permission = pushPermissionData?.data ?? 'default';
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isGranted = permission === 'granted';

  const pushSubscriptionFlow = usePushSubscriptionFlow();
  const subscribeFn = pushSubscriptionFlow.mutateAsync;
  const isSubscribing = pushSubscriptionFlow.isLoading;

  const { data: subscriptionsData, isLoading: isLoadingSubscriptions } = usePushSubscriptions();

  // Local state for form
  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    smsEnabled: false,
    bookingConfirmationEnabled: true,
    bookingReminderEnabled: true,
    bookingCancellationEnabled: true,
    bookingModificationEnabled: true,
    reminderTiming: {
      enabled24h: true,
      enabled1h: true,
    },
  });

  // Track if subscription exists
  const subscriptions = subscriptionsData?.data ?? [];
  const hasActiveSubscription = subscriptions.length > 0;

  // Update local state when preferences load
  useEffect(() => {
    if (preferencesData?.data) {
      const prefs = preferencesData.data as NotificationPreferences;
      setPreferences({
        emailEnabled: prefs.email ?? true,
        pushEnabled: prefs.push ?? false,
        inAppEnabled: prefs.inApp ?? true,
        smsEnabled: false,
        bookingConfirmationEnabled: prefs.categories?.booking_confirmation?.email ?? true,
        bookingReminderEnabled: prefs.categories?.booking_reminder?.email ?? true,
        bookingCancellationEnabled: prefs.categories?.booking_cancellation?.email ?? true,
        bookingModificationEnabled: prefs.categories?.booking_modification?.email ?? true,
        reminderTiming: {
          enabled24h: true,
          enabled1h: true,
        },
      });
    }
  }, [preferencesData]);

  // Handle preference change
  const handlePreferenceChange = (key: string, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
  };

  // Handle nested preference change (reminderTiming)
  const handleReminderTimingChange = (key: 'enabled24h' | 'enabled1h', value: boolean) => {
    const newReminderTiming = { ...preferences.reminderTiming, [key]: value };
    const newPreferences = { ...preferences, reminderTiming: newReminderTiming };
    setPreferences(newPreferences);
  };

  // Handle push notification toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && tenantId && userId) {
      try {
        await subscribeFn({ tenantId, userId });
      } catch {
        showToast({ title: t('common.saveError'), variant: 'error' });
      }
    }
  };

  // Show loading state
  if (isLoadingPreferences || isLoadingSubscriptions) {
    return (
      <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
        <Spinner aria-label={t('common.loading')} data-size="md" />
      </Stack>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader title={t('notificationSettings.title')} subtitle={t('notificationSettings.subtitle')} />
      <Stack direction="vertical" spacing="var(--ds-size-6)">
        {/* Push Notifications Section */}
        <Card className={s.sectionCard}>
          <Heading level={2} data-size="md" className={s.sectionHeading}>
            {t('notificationSettings.pushTitle')}
          </Heading>

          {!isSupported ? (
            <div className={s.warningBanner}>
              <Paragraph data-size="sm" className={s.warningText}>
                {t('notificationSettings.pushNotSupported')}
              </Paragraph>
            </div>
          ) : (
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              {/* Main push toggle */}
              <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
                <div>
                  <Paragraph data-size="sm" className={s.preferenceLabel}>
                    {t('notificationSettings.pushEnable')}
                  </Paragraph>
                  <Paragraph data-size="xs" className={s.preferenceDesc}>
                    {t('notificationSettings.pushDescription')}
                  </Paragraph>
                  {isGranted && hasActiveSubscription && (
                    <Paragraph data-size="xs" className={s.statusSuccess}>
                      {t('notificationSettings.pushEnabled')}
                    </Paragraph>
                  )}
                  {permission === 'denied' && (
                    <Paragraph data-size="xs" className={s.statusDanger}>
                      {t('notificationSettings.pushBlocked')}
                    </Paragraph>
                  )}
                </div>
                <Switch
                  checked={hasActiveSubscription && preferences.pushEnabled}
                  onChange={(e) => handlePushToggle(e.target.checked)}
                  disabled={isSubscribing || permission === 'denied'}
                  aria-label={t('notificationSettings.pushEnable')}
                />
              </Stack>
            </Stack>
          )}
        </Card>

        {/* Notification Channels Section */}
        <Card className={s.sectionCard}>
          <Heading level={2} data-size="md" className={s.sectionHeading}>
            {t('notificationSettings.channelsTitle')}
          </Heading>

          <Stack direction="vertical" spacing="var(--ds-size-4)">
            {/* Email notifications */}
            <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.emailTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.emailDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.emailEnabled}
                onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)}
                aria-label={t('notificationSettings.emailTitle')}
              />
            </Stack>

            {/* In-app notifications */}
            <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.inAppTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.inAppDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.inAppEnabled}
                onChange={(e) => handlePreferenceChange('inAppEnabled', e.target.checked)}
                aria-label={t('notificationSettings.inAppTitle')}
              />
            </Stack>

            {/* SMS notifications */}
            <Stack direction="horizontal" justify="between" align="center">
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.smsTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.smsDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.smsEnabled}
                onChange={(e) => handlePreferenceChange('smsEnabled', e.target.checked)}
                disabled={true}
                aria-label={t('notificationSettings.smsTitle')}
              />
            </Stack>
          </Stack>
        </Card>

        {/* Booking Notification Types Section */}
        <Card className={s.sectionCard}>
          <Heading level={2} data-size="md" className={s.sectionHeading}>
            {t('notificationSettings.bookingTitle')}
          </Heading>

          <Stack direction="vertical" spacing="var(--ds-size-4)">
            {/* Booking confirmations */}
            <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.confirmationsTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.confirmationsDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.bookingConfirmationEnabled}
                onChange={(e) => handlePreferenceChange('bookingConfirmationEnabled', e.target.checked)}
                aria-label={t('notificationSettings.confirmationsTitle')}
              />
            </Stack>

            {/* Booking reminders */}
            <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.remindersTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.remindersDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.bookingReminderEnabled}
                onChange={(e) => handlePreferenceChange('bookingReminderEnabled', e.target.checked)}
                aria-label={t('notificationSettings.remindersTitle')}
              />
            </Stack>

            {/* Reminder timing - only show if reminders are enabled */}
            {preferences.bookingReminderEnabled && (
              <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.nestedGroup}>
                <Stack direction="horizontal" justify="between" align="center">
                  <div>
                    <Paragraph data-size="sm" className={s.preferenceLabel}>
                      {t('notificationSettings.reminder24h')}
                    </Paragraph>
                    <Paragraph data-size="xs" className={s.preferenceDesc}>
                      {t('notificationSettings.reminder24hDescription')}
                    </Paragraph>
                  </div>
                  <Switch
                    checked={preferences.reminderTiming.enabled24h}
                    onChange={(e) => handleReminderTimingChange('enabled24h', e.target.checked)}
                    aria-label={t('notificationSettings.reminder24h')}
                  />
                </Stack>

                <Stack direction="horizontal" justify="between" align="center">
                  <div>
                    <Paragraph data-size="sm" className={s.preferenceLabel}>
                      {t('notificationSettings.reminder1h')}
                    </Paragraph>
                    <Paragraph data-size="xs" className={s.preferenceDesc}>
                      {t('notificationSettings.reminder1hDescription')}
                    </Paragraph>
                  </div>
                  <Switch
                    checked={preferences.reminderTiming.enabled1h}
                    onChange={(e) => handleReminderTimingChange('enabled1h', e.target.checked)}
                    aria-label={t('notificationSettings.reminder1h')}
                  />
                </Stack>
              </Stack>
            )}

            {/* Cancellations */}
            <Stack direction="horizontal" justify="between" align="center" className={s.preferenceRow}>
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.cancellationsTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.cancellationsDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.bookingCancellationEnabled}
                onChange={(e) => handlePreferenceChange('bookingCancellationEnabled', e.target.checked)}
                aria-label={t('notificationSettings.cancellationsTitle')}
              />
            </Stack>

            {/* Modifications */}
            <Stack direction="horizontal" justify="between" align="center">
              <div>
                <Paragraph data-size="sm" className={s.preferenceLabel}>
                  {t('notificationSettings.modificationsTitle')}
                </Paragraph>
                <Paragraph data-size="xs" className={s.preferenceDesc}>
                  {t('notificationSettings.modificationsDescription')}
                </Paragraph>
              </div>
              <Switch
                checked={preferences.bookingModificationEnabled}
                onChange={(e) => handlePreferenceChange('bookingModificationEnabled', e.target.checked)}
                aria-label={t('notificationSettings.modificationsTitle')}
              />
            </Stack>
          </Stack>
        </Card>

        {/* Save indicator */}
        {updatePreferencesMutation.isLoading && (
          <Stack direction="horizontal" align="center" spacing="var(--ds-size-3)" className={s.saveIndicator}>
            <Spinner data-size="sm" aria-hidden="true" />
            <Paragraph data-size="sm" className={s.saveIndicatorText}>
              {t('notificationSettings.saving')}
            </Paragraph>
          </Stack>
        )}
      </Stack>
    </PageContentLayout>
  );
}
