/**
 * OrganizationActivityPage
 *
 * Organization portal activity log — connected to real SDK hooks
 * - Recent audit events from the tenant audit log
 * - Entity type filtering (booking, member, invoice, etc.)
 * - Real-time stats for today/this week
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Paragraph,
  Badge,
  Spinner,
  Stack,
  StatCard,
  Grid,
  DashboardPageHeader,
  PageContentLayout,
  PillDropdown,
  EmptyState,
  InboxIcon,
} from '@digipicks/ds';
import { useTenantActivity, useTenantActivityStats } from '@digipicks/sdk';
import type { TenantActivityEntry } from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useLocale, useT } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import { useTenantContext } from '@digipicks/app-shell';
import s from './Activity.module.css';

type EntityTypeFilter = 'all' | 'booking' | 'resource' | 'user' | 'payment';

export function OrganizationActivityPage() {
  const { locale } = useLocale();
  const t = useT();
  const { tenantId } = useTenantContext();
  const [typeFilter, setTypeFilter] = useState<EntityTypeFilter>('all');

  const safeTenantId = tenantId as any;

  // Fetch activity entries (filtered by entity type if set)
  const { activities, isLoading } = useTenantActivity(safeTenantId, {
    entityType: typeFilter === 'all' ? undefined : typeFilter,
    limit: 50,
  });

  // Stats for the current period
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday

  const { stats: weekStats } = useTenantActivityStats(safeTenantId, {
    startDate: weekStart.getTime(),
    endDate: now,
  });

  const todayCount = useMemo(() => {
    return activities.filter((a) => a.timestamp >= todayStart.getTime()).length;
  }, [activities, todayStart]);

  const bookingCount = weekStats?.byEntityType?.booking ?? 0;
  const userCount = weekStats?.byEntityType?.user ?? 0;

  const intlLocale = getIntlLocale(locale);

  const formatRelativeTime = (timestamp: number) => {
    const diffMs = now - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return t('common.justNow');
    if (diffHours < 24) return t('common.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('common.daysAgo', { count: diffDays });
    return new Date(timestamp).toLocaleDateString(intlLocale);
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'booking':
        return t('org.activityTypeBooking');
      case 'resource':
        return t('org.activityTypeResource', 'Ressurs');
      case 'user':
        return t('org.activityTypeMember');
      case 'payment':
        return t('org.activityTypeInvoice');
      default:
        return entityType;
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'booking':
        return { bg: 'var(--ds-color-accent-surface-default)', text: 'var(--ds-color-accent-text-default)' };
      case 'user':
        return { bg: 'var(--ds-color-info-surface-default)', text: 'var(--ds-color-info-text-default)' };
      case 'payment':
        return { bg: 'var(--ds-color-success-surface-default)', text: 'var(--ds-color-success-text-default)' };
      case 'resource':
        return { bg: 'var(--ds-color-warning-surface-default)', text: 'var(--ds-color-warning-text-default)' };
      default:
        return { bg: 'var(--ds-color-neutral-surface-default)', text: 'var(--ds-color-neutral-text-default)' };
    }
  };

  const getActionLabel = (entry: TenantActivityEntry) => {
    // Map known actions to human-readable labels
    const key = `audit.action.${entry.action}`;
    const translated = t(key);
    // If translation key doesn't exist, use the raw action
    return translated !== key ? translated : entry.action.replace(/[._]/g, ' ');
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('org.activityLog')}
        subtitle={t('org.activityLogDesc')}
        backHref="/org"
        backLabel={t('org.backToDashboard')}
        actions={
          <PillDropdown
            label={typeFilter === 'all' ? t('org.allTypes') : getEntityTypeLabel(typeFilter)}
            options={[
              { value: 'all', label: t('org.allTypes') },
              { value: 'booking', label: t('org.activityTypeBookings') },
              { value: 'user', label: t('org.activityTypeMembers') },
              { value: 'payment', label: t('org.activityTypeInvoices') },
              { value: 'resource', label: t('org.activityTypeResource', 'Ressurser') },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as EntityTypeFilter)}
            ariaLabel={t('org.filterActivityType')}
          />
        }
      />

      {/* Stats */}
      <Grid columns="repeat(auto-fill, minmax(200px, 1fr))" gap="var(--ds-size-4)">
        <StatCard title={t('org.today')} value={todayCount} />
        <StatCard title={t('org.thisWeek')} value={weekStats?.total ?? 0} />
        <StatCard title={t('org.activityTypeBookings')} value={bookingCount} />
        <StatCard title={t('org.activityTypeMembers')} value={userCount} />
      </Grid>

      {/* Activity List */}
      <Card className={s.activityCard}>
        {isLoading ? (
          <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : activities.length === 0 ? (
          <EmptyState icon={<InboxIcon />} title={t('org.noActivity')} />
        ) : (
          <Stack direction="vertical" spacing="var(--ds-size-3)">
            {activities.map((activity) => {
              const color = getEntityTypeColor(activity.entityType);
              const displayName =
                activity.userName ?? activity.user?.name ?? activity.userEmail ?? activity.user?.email ?? 'System';
              return (
                <Stack
                  key={activity.id}
                  direction="horizontal"
                  spacing="var(--ds-size-4)"
                  align="center"
                  className={s.activityRow}
                >
                  {/* eslint-disable-next-line react/forbid-dom-props -- dynamic color per activity type */}
                  <div className={s.activityIndicator} style={{ backgroundColor: color.bg }} />
                  <div className={s.activityContent}>
                    <Stack direction="horizontal" justify="between" align="start" wrap spacing="var(--ds-size-2)">
                      <div>
                        <Paragraph data-size="sm" className={s.activityTitle}>
                          {getActionLabel(activity)}
                        </Paragraph>
                        <Paragraph data-size="xs" className={s.activityDescription}>
                          {activity.entityType}: {activity.entityId.substring(0, 12)}...
                        </Paragraph>
                      </div>
                      <Badge style={{ backgroundColor: color.bg, color: color.text }}>
                        {getEntityTypeLabel(activity.entityType)}
                      </Badge>
                    </Stack>
                    <Paragraph data-size="xs" className={s.activityMeta}>
                      {`${displayName} \u2022 ${formatRelativeTime(activity.timestamp)}`}
                    </Paragraph>
                  </div>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Card>
    </PageContentLayout>
  );
}
