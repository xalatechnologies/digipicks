import React from 'react';
import {
  Card,
  Heading,
  Paragraph,
  StatCard,
  CheckCircleIcon,
  UsersIcon,
  DashboardPageHeader,
  PageContentLayout,
  Stack,
  Grid,
  useIsMobile,
  ActivityItem,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useCapabilities, useSetPageTitle } from '@digilist-saas/app-shell';
import { useNavigate } from 'react-router-dom';

export function DashboardPage(): React.ReactElement {
  const { hasCapability } = useCapabilities();
  const navigate = useNavigate();
  const t = useT();
  const isMobile = useIsMobile();

  useSetPageTitle(t('dashboard.title', 'Dashboard'));

  const recentActivity = [
    {
      title: 'New user signup',
      description: 'John Doe registered',
      time: '10 min ago',
      status: 'approved' as const,
      onClick: () => navigate('/users'),
    },
    {
      title: 'Payment successful',
      description: 'Subscription upgraded to Pro',
      time: '1 hour ago',
      status: 'approved' as const,
      onClick: () => {},
    },
    {
      title: 'Tenant settings updated',
      description: 'System configuration changed',
      time: '2 hours ago',
      status: 'pending' as const,
      onClick: () => {},
    },
  ];

  return (
    <PageContentLayout data-gap="sm">
      <DashboardPageHeader />

      {/* Stats cards — all-time totals */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
        <StatCard
          title="Active Users"
          value={1240}
          description="Users currently online"
          color="var(--ds-color-success-text-default)"
          icon={<UsersIcon />}
        />
        <StatCard
          title="Total Revenue"
          value="$12,450"
          description="MRR for this month"
          color="var(--ds-color-success-text-default)"
          icon={<CheckCircleIcon />}
        />
        <StatCard
          title="System Uptime"
          value="99.9%"
          description="All systems operational"
          icon={<CheckCircleIcon />}
        />
      </Grid>

      {/* Two column layout — stacks on mobile */}
      <Grid columns={isMobile ? '1fr' : '2fr 1fr'}>
        {/* Recent activity */}
        <Card data-color="neutral">
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Stack direction="horizontal" justify="between" align="center">
              <Heading level={2} data-size="sm">
                Recent Activity
              </Heading>
            </Stack>
            <Stack direction="vertical" spacing="var(--ds-size-3)">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} {...activity} />
              ))}
            </Stack>
          </Stack>
        </Card>

        {/* Quick actions */}
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Card data-color="neutral">
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={2} data-size="sm">
                Quick Actions
              </Heading>
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                {hasCapability('CAP_USER_ADMIN') && (
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary ds-btn--lg"
                    onClick={() => navigate('/users')}
                  >
                    <UsersIcon />
                    Manage Users
                  </button>
                )}
                 <button
                    type="button"
                    className="ds-btn ds-btn--secondary ds-btn--lg"
                    onClick={() => navigate('/settings')}
                  >
                    System Settings
                  </button>
              </Stack>
            </Stack>
          </Card>

          {/* System status card */}
          <Card data-color="neutral">
            <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
              <Paragraph data-size="sm">
                System Status: Operational
              </Paragraph>
            </Stack>
            <Paragraph data-size="xs" data-color="subtle">
              Last updated just now
            </Paragraph>
          </Card>
        </Stack>
      </Grid>
    </PageContentLayout>
  );
}
