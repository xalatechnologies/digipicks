/**
 * AuditTimelinePage
 *
 * Saksbehandler page for viewing audit trail of decisions
 * - Timeline view of real audit events from Convex
 * - Filter by action outcome
 * - Decision details with user info
 */

import { useState, useMemo } from 'react';
import {
  Card,
  Paragraph,
  Button,
  PillDropdown,
  Badge,
  Spinner,
  DashboardPageHeader,
  PageContentLayout,
  ErrorState,
  Stack,
  FormField,
  useIsMobile,
} from '@digipicks/ds';
import { useT, useLocale } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import { useTenantActivity } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './audit-timeline.module.css';

const OUTCOME_OPTIONS = [
  { value: 'all', labelKey: 'auditTimeline.outcomeAll' },
  { value: 'approved', labelKey: 'auditTimeline.outcomeApproved' },
  { value: 'rejected', labelKey: 'auditTimeline.outcomeRejected' },
  { value: 'cancelled', labelKey: 'auditTimeline.outcomeReturned' },
] as const;

type DecisionOutcome = 'approved' | 'rejected' | 'cancelled';

function getOutcomeColor(outcome: string) {
  if (outcome.includes('approved') || outcome.includes('confirmed')) {
    return { bg: 'var(--ds-color-success-surface-default)', text: 'var(--ds-color-success-text-default)' };
  }
  if (outcome.includes('rejected') || outcome.includes('deleted') || outcome.includes('cancelled')) {
    return { bg: 'var(--ds-color-danger-surface-default)', text: 'var(--ds-color-danger-text-default)' };
  }
  if (outcome.includes('updated') || outcome.includes('assigned') || outcome.includes('resolved')) {
    return { bg: 'var(--ds-color-warning-surface-default)', text: 'var(--ds-color-warning-text-default)' };
  }
  return { bg: 'var(--ds-color-info-surface-default)', text: 'var(--ds-color-info-text-default)' };
}

export function AuditTimelinePage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuthBridge();
  const [outcomeFilter, setOutcomeFilter] = useState<DecisionOutcome | 'all'>('all');
  const isMobile = useIsMobile();

  const tenantId = user?.tenantId as any;

  const { activities, isLoading, error } = useTenantActivity(tenantId, {
    limit: 50,
  });

  // Filter to decision-like actions and apply outcome filter
  const filteredEntries = useMemo(() => {
    const decisionActions = ['approved', 'rejected', 'cancelled', 'confirmed', 'resolved', 'assigned'];
    const decisions = activities.filter((a) => decisionActions.some((d) => a.action.includes(d)));

    if (outcomeFilter === 'all') return decisions;
    return decisions.filter((a) => a.action.includes(outcomeFilter));
  }, [activities, outcomeFilter]);

  const intlLocale = getIntlLocale(locale);
  const formatDateTime = (ts: number) => {
    const date = new Date(ts);
    return (
      date.toLocaleDateString(intlLocale) +
      ' ' +
      date.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('auditTimeline.title')}
        subtitle={t('auditTimeline.subtitle')}
        actions={
          <Button type="button" variant="secondary" data-size="md" className={styles.exportButton}>
            {t('auditTimeline.exportCsv')}
          </Button>
        }
      />

      {/* Filters */}
      <Card data-color="neutral" className={styles.filterCard}>
        <Stack
          direction={isMobile ? 'vertical' : 'horizontal'}
          spacing="var(--ds-size-4)"
          align={isMobile ? 'stretch' : 'end'}
        >
          <div className={styles.filterField}>
            <FormField label={t('auditTimeline.outcome')}>
              <PillDropdown
                label={t(
                  OUTCOME_OPTIONS.find((o) => o.value === outcomeFilter)?.labelKey ?? 'auditTimeline.outcomeAll',
                )}
                options={OUTCOME_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                value={outcomeFilter}
                onChange={(v) => setOutcomeFilter(v as DecisionOutcome | 'all')}
                className={styles.fullWidth}
                ariaLabel={t('auditTimeline.filterByOutcome')}
              />
            </FormField>
          </div>
        </Stack>
      </Card>

      {/* Timeline */}
      <Card data-color="neutral" className={styles.timelineCard}>
        {error ? (
          <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
        ) : isLoading ? (
          <Stack direction="horizontal" justify="center" className={styles.loadingWrapper}>
            <Spinner aria-label={t('auditTimeline.loading')} data-size="lg" />
          </Stack>
        ) : filteredEntries.length === 0 ? (
          <div className={styles.emptyWrapper}>
            <Paragraph className={styles.emptyText}>{t('auditTimeline.emptyState')}</Paragraph>
          </div>
        ) : (
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            {filteredEntries.map((entry, index) => {
              const color = getOutcomeColor(entry.action);
              return (
                <Stack
                  key={entry.id}
                  direction="horizontal"
                  spacing="var(--ds-size-4)"
                  className={styles.timelineEntry}
                >
                  {/* Timeline line */}
                  <Stack direction="vertical" align="center" className={styles.timelineColumn}>
                    <div
                      className={styles.timelineDot}
                      style={{
                        backgroundColor: color.bg,
                        border: `2px solid ${color.text}`,
                      }}
                    />
                    {index < filteredEntries.length - 1 && <div className={styles.timelineLine} />}
                  </Stack>

                  {/* Content */}
                  <div className={styles.contentCard}>
                    <Stack direction="horizontal" justify="between" align="start" wrap spacing="var(--ds-size-2)">
                      <div>
                        <Paragraph data-size="sm" className={styles.contentTitle}>
                          {entry.entityType} —{' '}
                          {entry.entityId.length > 16 ? `${entry.entityId.slice(0, 16)}…` : entry.entityId}
                        </Paragraph>
                        <Paragraph data-size="xs" className={styles.contentUser}>
                          {entry.userName || entry.userEmail || '–'}
                        </Paragraph>
                      </div>
                      <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                        <Badge style={{ backgroundColor: color.bg, color: color.text }}>{entry.action}</Badge>
                        <Paragraph data-size="xs" className={styles.contentTimestamp}>
                          {formatDateTime(entry.timestamp)}
                        </Paragraph>
                      </Stack>
                    </Stack>
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
