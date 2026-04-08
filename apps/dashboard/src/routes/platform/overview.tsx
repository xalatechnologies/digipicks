/**
 * Overview / Dashboard Page — SaaS Admin
 *
 * Platform-wide stats, recent activity, quick actions, system status.
 * Follows backoffice dashboard pattern with PageContentLayout + DashboardPageHeader.
 */

import {
  Card,
  Heading,
  Paragraph,
  Button,
  StatCard,
  ActivityItem,
  StatusDot,
  Grid,
  Stack,
  DashboardPageHeader,
  PageContentLayout,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
  useIsMobile,
  type ActivityStatus,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

export function OverviewPage() {
  const t = useT();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Live platform stats from Convex
  const platformStats = useQuery(api.domain.platformAdmin.platformStats);
  const recentEvents = useQuery(api.domain.platformAdmin.recentActivity, { limit: 5 });

  const stats = {
    tenants: platformStats?.tenants.total ?? 0,
    users: platformStats?.users.total ?? 0,
    activeModules: 0, // TODO: wire to module count query
    monthlyRevenue: '–',
    systemUptime: '99.9%',
  };

  const recentActivity = (recentEvents ?? []).map((e: any) => ({
    title: e.entityType || 'System',
    description: `${e.action} on ${e.entityType} ${e.entityId?.slice(-6) || ''}`,
    time: e.timestamp ? new Date(e.timestamp).toLocaleString('nb-NO') : '–',
    status: 'approved' as ActivityStatus,
  }));

  return (
    <PageContentLayout data-gap="sm">
      <DashboardPageHeader
        subtitle={t('saasAdmin.overview.subtitle')}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/platform/tenants')}
          >
            {t('saasAdmin.overview.manageTenants')}
            <ArrowRightIcon />
          </Button>
        }
      />

      {/* Stats grid — 4 columns desktop, 2 on mobile */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'} gap="var(--ds-size-3)">
        <StatCard
          title={t('saasAdmin.overview.totalTenants')}
          value={stats.tenants}
          description={t('saasAdmin.overview.activeTenants')}
          color="var(--ds-color-accent-text-default)"
          icon={<UsersIcon />}
          onClick={() => navigate('/platform/tenants')}
        />
        <StatCard
          title={t('saasAdmin.overview.totalUsers')}
          value={stats.users}
          description={t('saasAdmin.overview.acrossAllTenants')}
          icon={<UsersIcon />}
          onClick={() => navigate('/platform/users')}
        />
        <StatCard
          title={t('saasAdmin.overview.activeModules')}
          value={stats.activeModules}
          description={t('saasAdmin.overview.componentsActive')}
          color="var(--ds-color-success-text-default)"
          icon={<CheckCircleIcon />}
          onClick={() => navigate('/platform/modules')}
        />
        <StatCard
          title={t('saasAdmin.overview.monthlyRevenue')}
          value={stats.monthlyRevenue}
          description={t('saasAdmin.overview.currentMonth')}
          icon={<CalendarIcon />}
          onClick={() => navigate('/platform/billing')}
        />
      </Grid>

      {/* Two column layout — stacks on mobile */}
      <Grid columns={isMobile ? '1fr' : '2fr 1fr'}>
        {/* Recent activity */}
        <Card data-color="neutral">
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Stack direction="horizontal" justify="between" align="center">
              <Heading level={2} data-size="sm">
                {t('saasAdmin.overview.recentActivity')}
              </Heading>
              <Button type="button" variant="tertiary" data-size="sm" onClick={() => navigate('/platform/audit')}>
                {t('common.seeAll')}
              </Button>
            </Stack>
            <Stack direction="vertical" spacing="var(--ds-size-3)">
              {recentActivity.map((activity: { title: string; description: string; time: string; status: ActivityStatus }, index: number) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </Stack>
          </Stack>
        </Card>

        {/* Quick actions + System status */}
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Card data-color="neutral">
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={2} data-size="sm">
                {t('saasAdmin.overview.quickActions')}
              </Heading>
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/platform/tenants')}
                >
                  <UsersIcon />
                  {t('saasAdmin.overview.actionManageTenants')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/platform/modules')}
                >
                  <CheckCircleIcon />
                  {t('saasAdmin.overview.actionConfigModules')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/platform/audit')}
                >
                  <ClockIcon />
                  {t('saasAdmin.overview.actionViewAudit')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/platform/billing')}
                >
                  <CalendarIcon />
                  {t('saasAdmin.overview.actionBilling')}
                </Button>
              </Stack>
            </Stack>
          </Card>

          {/* System status card */}
          <Card data-color="neutral">
            <Stack direction="vertical" spacing="var(--ds-size-3)">
              <Heading level={2} data-size="sm">
                {t('saasAdmin.overview.systemStatus')}
              </Heading>
              <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                <StatusDot variant="success" />
                <Paragraph data-size="sm">
                  {t('saasAdmin.overview.allSystemsOperational')}
                </Paragraph>
              </Stack>
              <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                <StatusDot variant="success" />
                <Paragraph data-size="sm">
                  {t('saasAdmin.overview.uptime', { value: stats.systemUptime })}
                </Paragraph>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </Grid>
    </PageContentLayout>
  );
}
