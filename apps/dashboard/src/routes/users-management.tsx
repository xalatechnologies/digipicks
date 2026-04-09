/**
 * UsersManagementPage
 *
 * Admin page for managing users and roles
 * - List all users
 * - Role assignment
 * - User status management
 * - Invite users
 */

import { useState, useMemo } from 'react';
import { useT } from '@digipicks/i18n';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  DataTable,
  Badge,
  Spinner,
  PillDropdown,
  FormField,
  useDialog,
  Input,
  DashboardPageHeader,
  PageContentLayout,
  Stack,
  Grid,
  useIsMobile,
  useToast,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import s from './users-management.module.css';
import { useUsers, useDeactivateUser, useReactivateUser, useUpdateUser } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import type { UserId, TenantId } from '@digipicks/sdk';

const ROLE_LABEL_KEYS: Record<string, string> = {
  admin: 'usersManagement.roleAdmin',
  saksbehandler: 'usersManagement.roleCaseWorker',
  viewer: 'usersManagement.roleViewer',
};
const ROLE_IDS = ['admin', 'saksbehandler', 'viewer'] as const;

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

export function UsersManagementPage() {
  const t = useT();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const { user: authUser } = useAuthBridge();
  const deactivateMutation = useDeactivateUser();
  const reactivateMutation = useReactivateUser();
  const updateUserMutation = useUpdateUser();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('saksbehandler');
  const isMobile = useIsMobile();

  const tenantId = authUser?.tenantId as TenantId | undefined;

  // Fetch real users from Convex
  const { data: usersData, isLoading } = useUsers({ tenantId });
  const users: UserRow[] = useMemo(() => {
    if (!usersData?.data) return [];
    return usersData.data.map((u) => ({
      id: u.id,
      name: u.displayName ?? u.name ?? u.email,
      email: u.email,
      role: u.role ?? 'viewer',
      status: u.status ?? 'active',
      lastLogin: u.createdAt, // createdAt as fallback; lastLogin not yet tracked
    }));
  }, [usersData]);

  const handleDeactivate = async (id: string, name: string, isActive: boolean) => {
    const confirmed = await confirm({
      title: isActive ? t('usersManagement.deactivateTitle') : t('usersManagement.activateTitle'),
      description: isActive
        ? t('usersManagement.deactivateConfirm', { name })
        : t('usersManagement.activateConfirm', { name }),
      confirmText: isActive ? t('usersManagement.deactivate') : t('usersManagement.activate'),
      cancelText: t('common.cancel'),
      variant: isActive ? 'danger' : 'info',
    });
    if (confirmed) {
      try {
        if (isActive) {
          await deactivateMutation.mutateAsync({ id: id as UserId });
          showToast({ title: t('usersManagement.deactivateSuccess'), variant: 'success' });
        } else {
          await reactivateMutation.mutateAsync({ id: id as UserId });
          showToast({ title: t('usersManagement.activateSuccess'), variant: 'success' });
        }
      } catch {
        showToast({ title: t('usersManagement.actionError'), variant: 'error' });
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId as UserId, role: newRole });
      showToast({ title: t('usersManagement.roleUpdated'), variant: 'success' });
    } catch {
      showToast({ title: t('usersManagement.actionError'), variant: 'error' });
    }
  };

  const handleInvite = () => {
    // Invite flow not yet implemented in Convex backend
    showToast({ title: t('usersManagement.inviteNotImplemented'), variant: 'info' });
    setInviteEmail('');
    setShowInvite(false);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('nb-NO');

  const userColumns: DataTableColumn<UserRow>[] = useMemo(
    () => [
      {
        id: 'user',
        header: t('usersManagement.user'),
        render: (user) => (
          <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
            <div className={s.avatar}>{user.name.charAt(0)}</div>
            <div>
              <Paragraph data-size="sm" className={s.userName}>
                {user.name}
              </Paragraph>
              <Paragraph data-size="xs" className={s.userEmail}>
                {user.email}
              </Paragraph>
            </div>
          </Stack>
        ),
      },
      {
        id: 'role',
        header: t('usersManagement.role'),
        render: (user) => (
          <PillDropdown
            label={t(ROLE_LABEL_KEYS[user.role] ?? user.role)}
            options={ROLE_IDS.map((r) => ({ value: r, label: t(ROLE_LABEL_KEYS[r]) }))}
            value={user.role}
            onChange={(v) => handleRoleChange(user.id, v)}
            className={s.pillDropdown}
            ariaLabel={t('usersManagement.role')}
          />
        ),
      },
      {
        id: 'status',
        header: t('common.status'),
        render: (user) => (
          <Badge className={user.status === 'active' ? s.statusBadgeActive : s.statusBadgeInactive}>
            {user.status === 'active' ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
      },
      {
        id: 'lastLogin',
        header: t('usersManagement.lastLogin'),
        render: (user) => formatDate(user.lastLogin),
      },
      {
        id: 'actions',
        header: t('common.actions'),
        width: '160px',
        render: (user) => (
          <Button
            type="button"
            variant="secondary"
            data-size="sm"
            onClick={() => handleDeactivate(user.id, user.name, user.status === 'active')}
          >
            {user.status === 'active' ? t('usersManagement.deactivate') : t('usersManagement.activate')}
          </Button>
        ),
      },
    ],
    [t, handleDeactivate, handleRoleChange],
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('usersManagement.title')}
        subtitle={t('usersManagement.subtitle')}
        actions={
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={() => setShowInvite(!showInvite)}
            className={s.headerButton}
          >
            {t('usersManagement.inviteUser')}
          </Button>
        }
      />

      {/* Invite Form */}
      {showInvite && (
        <Card className={s.inviteCard}>
          <Heading level={2} data-size="sm" className={s.inviteHeading}>
            {t('usersManagement.inviteNewUser')}
          </Heading>
          <Grid columns={isMobile ? '1fr' : '1fr auto auto'} gap="var(--ds-size-3)" className={s.inviteGrid}>
            <FormField label={t('usersManagement.email')}>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('usersManagement.emailPlaceholder')}
                className={s.inviteInput}
              />
            </FormField>
            <FormField label={t('usersManagement.role')}>
              <PillDropdown
                label={t(ROLE_LABEL_KEYS[inviteRole] ?? 'usersManagement.selectRole')}
                options={ROLE_IDS.map((r) => ({ value: r, label: t(ROLE_LABEL_KEYS[r]) }))}
                value={inviteRole}
                onChange={(v) => setInviteRole(v)}
                ariaLabel={t('usersManagement.selectRole')}
              />
            </FormField>
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={handleInvite}
              disabled={!inviteEmail.trim()}
              className={s.inviteButton}
            >
              {t('usersManagement.sendInvite')}
            </Button>
          </Grid>
        </Card>
      )}

      {/* Stats */}
      <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-4)">
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('common.total')}
          </Paragraph>
          <Heading level={2} data-size="xl" className={s.statValue}>
            {users.length}
          </Heading>
        </Card>
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('common.active')}
          </Paragraph>
          <Heading level={2} data-size="xl" className={s.statValueSuccess}>
            {users.filter((u) => u.status === 'active').length}
          </Heading>
        </Card>
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('usersManagement.administrators')}
          </Paragraph>
          <Heading level={2} data-size="xl" className={s.statValue}>
            {users.filter((u) => u.role === 'admin').length}
          </Heading>
        </Card>
      </Grid>

      {/* Users Table */}
      <Card className={s.tableCard}>
        {isLoading ? (
          <Stack direction="horizontal" justify="center" className={s.loadingContainer}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : (
          <DataTable<UserRow>
            columns={userColumns}
            data={users}
            getRowKey={(row) => row.id}
            size="sm"
            className={s.dataTable}
            emptyMessage={t('usersManagement.noUsers')}
          />
        )}
      </Card>
    </PageContentLayout>
  );
}
