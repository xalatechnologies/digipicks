/**
 * OrganizationDashboardPage
 *
 * Organization overview dashboard for Minside app
 * - KPI cards (total bookings, members, pending invoices)
 * - Upcoming bookings list
 * - Recent activity feed
 * - Quick action buttons
 */

import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  Badge,
  Stack,
  Grid,
  StatCard,
  DashboardPageHeader,
  PageContentLayout,
  UsersIcon,
  CalendarIcon,
  FileTextIcon,
  useIsMobile,
} from '@digipicks/ds';
import { useOrganization, useOrganizationMembers, useOrgBillingSummary } from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useT, useLocale } from '@digipicks/i18n';
import { getIntlLocale } from '@digipicks/shared/constants';
import { useAccountContext } from '@digipicks/app-shell';
import { NavLink } from 'react-router-dom';
import s from './Dashboard.module.css';

export function OrganizationDashboardPage() {
  const t = useT();
  const { locale } = useLocale();
  const isMobile = useIsMobile();
  const accountCtx = useAccountContext();
  const orgId = accountCtx?.selectedOrganization?.id as Id<'organizations'> | undefined;

  // Fetch org data
  const { data: orgData, isLoading: orgLoading } = useOrganization(orgId);
  const { data: membersData } = useOrganizationMembers(orgId);
  const { data: billingData } = useOrgBillingSummary(orgId);

  const org = orgData?.data;
  const members = membersData?.data ?? [];
  const billing = billingData?.data;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(getIntlLocale(locale)) + ' kr';
  };

  if (orgLoading) {
    return (
      <Stack direction="horizontal" justify="center" align="center" className={s.loadingCenter}>
        <Spinner aria-label={t('common.loading')} data-size="lg" />
      </Stack>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={org?.name || t('org.dashboard')}
        subtitle={t('org.dashboardDesc')}
        actions={
          <NavLink to="/org/settings">
            <Button type="button" variant="secondary" data-size="md">
              {t('org.settings')}
            </Button>
          </NavLink>
        }
      />

      {/* KPI Cards */}
      <Grid columns={isMobile ? '1fr' : 'repeat(3, 1fr)'} gap="var(--ds-size-4)">
        <StatCard
          title={t('org.members')}
          value={members.length}
          color="var(--ds-color-info-text-default)"
          icon={<UsersIcon />}
        />
        <StatCard
          title={t('org.activeBookings')}
          value={0}
          color="var(--ds-color-success-text-default)"
          icon={<CalendarIcon />}
        />
        <StatCard
          title={t('org.outstanding')}
          value={formatCurrency(billing?.overdueAmount ?? 0)}
          color={(billing?.overdueAmount ?? 0) > 0 ? 'var(--ds-color-warning-text-default)' : undefined}
          icon={<FileTextIcon />}
        />
      </Grid>

      {/* Quick Actions */}
      <Card className={s.quickActionsCard}>
        <Heading level={2} data-size="sm" className={s.quickActionsTitle}>
          {t('org.quickActions')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
          <NavLink to="/org/events" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.events')}
            </Button>
          </NavLink>
          <NavLink to="/org/sales" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.sales')}
            </Button>
          </NavLink>
          <NavLink to="/org/bookings" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.viewBookings')}
            </Button>
          </NavLink>
          <NavLink to="/org/invoices" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.viewInvoices')}
            </Button>
          </NavLink>
          <NavLink to="/org/season-rental" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.seasonRental')}
            </Button>
          </NavLink>
          <NavLink to="/org/members" className={s.quickActionLink}>
            <Button type="button" variant="secondary" data-size="md" className={s.quickActionButton}>
              {t('org.manageMembers')}
            </Button>
          </NavLink>
        </Grid>
      </Card>

      {/* Members Preview */}
      <Card className={s.membersCard}>
        <Stack direction="horizontal" justify="between" align="center" className={s.membersHeader}>
          <Heading level={2} data-size="sm" className={s.membersTitle}>
            {t('org.members')}
          </Heading>
          <NavLink to="/org/members">
            <Button type="button" variant="tertiary" data-size="sm">
              {t('common.viewAll')}
            </Button>
          </NavLink>
        </Stack>
        <div className={s.membersBody}>
          {members.length === 0 ? (
            <Paragraph className={s.emptyMembers}>{t('org.noMembers')}</Paragraph>
          ) : (
            <Stack direction="vertical" spacing="var(--ds-size-3)">
              {members.slice(0, 5).map((member: any) => (
                <Stack key={member.id} direction="horizontal" align="center" justify="between" className={s.memberRow}>
                  <Stack direction="horizontal" align="center" spacing="var(--ds-size-3)">
                    <div className={s.memberAvatar}>{member.name?.charAt(0) || '?'}</div>
                    <div>
                      <Paragraph data-size="sm" className={s.memberName}>
                        {member.name || member.email}
                      </Paragraph>
                      <Paragraph data-size="xs" className={s.memberEmail}>
                        {member.email}
                      </Paragraph>
                    </div>
                  </Stack>
                  <Badge>{member.role || 'member'}</Badge>
                </Stack>
              ))}
            </Stack>
          )}
        </div>
      </Card>
    </PageContentLayout>
  );
}
