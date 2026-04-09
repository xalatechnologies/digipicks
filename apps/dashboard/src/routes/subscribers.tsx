/**
 * Subscribers Page — Creator's subscriber list
 *
 * Shows creators who is subscribed to their picks,
 * subscription status, and aggregate stats.
 */

import { Card, Heading, Paragraph, Spinner, PageContentLayout, Grid, EmptyState, StatusTag } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useCreatorSubscribers } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './subscribers.module.css';

function statusColor(status: string): 'success' | 'danger' | 'warning' | 'neutral' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'cancelled':
      return 'danger';
    case 'past_due':
      return 'warning';
    default:
      return 'neutral';
  }
}

function statusLabel(status: string, t: (key: string, fallback: string) => string): string {
  switch (status) {
    case 'active':
      return t('subscribers.status.active', 'Active');
    case 'trialing':
      return t('subscribers.status.trialing', 'Free Trial');
    case 'cancelled':
      return t('subscribers.status.cancelled', 'Cancelled');
    case 'past_due':
      return t('subscribers.status.past_due', 'Past Due');
    case 'pending':
      return t('subscribers.status.pending', 'Pending');
    default:
      return status;
  }
}

export function SubscribersPage() {
  const t = useT();
  const { user } = useAuthBridge();
  const tenantId = user?.tenantId as string;
  const userId = user?.id;

  const { subscribers, isLoading } = useCreatorSubscribers(tenantId, userId);

  const activeCount = subscribers.filter((s: any) => s.status === 'active').length;
  const trialingCount = subscribers.filter((s: any) => s.status === 'trialing').length;

  if (isLoading) {
    return (
      <PageContentLayout data-gap="sm">
        <Spinner aria-label="Loading" data-size="md" />
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout data-gap="sm">
      <Heading level={1} data-size="md">
        {t('subscribers.title', 'Subscribers')}
      </Heading>
      <Paragraph>{t('subscribers.description', 'People subscribed to your picks.')}</Paragraph>

      <Grid columns="repeat(3, 1fr)" data-gap="sm">
        <Card>
          <Paragraph data-size="sm">{t('subscribers.total', 'Total Subscribers')}</Paragraph>
          <Heading level={3} data-size="lg">
            {subscribers.length}
          </Heading>
        </Card>
        <Card>
          <Paragraph data-size="sm">{t('subscribers.active', 'Active')}</Paragraph>
          <Heading level={3} data-size="lg">
            {activeCount}
          </Heading>
        </Card>
        <Card>
          <Paragraph data-size="sm">{t('subscribers.trialing', 'Free Trials')}</Paragraph>
          <Heading level={3} data-size="lg">
            {trialingCount}
          </Heading>
        </Card>
      </Grid>

      {subscribers.length === 0 ? (
        <EmptyState
          title={t('subscribers.empty.title', 'No subscribers yet')}
          description={t('subscribers.empty.description', 'Share your profile to attract subscribers to your picks.')}
        />
      ) : (
        <Card>
          {subscribers.map((sub: any) => (
            <div key={sub._id} className={styles.subscriberCard}>
              <div className={styles.subscriberInfo}>
                <span className={styles.subscriberName}>
                  {sub.user?.displayName || sub.user?.name || t('subscribers.anonymous', 'Anonymous')}
                </span>
                <span className={styles.subscriberDate}>
                  {t('subscribers.since', 'Since')} {new Date(sub.startDate).toLocaleDateString()}
                </span>
              </div>
              <StatusTag color={statusColor(sub.status)} size="sm">
                {statusLabel(sub.status, t)}
              </StatusTag>
            </div>
          ))}
        </Card>
      )}
    </PageContentLayout>
  );
}
