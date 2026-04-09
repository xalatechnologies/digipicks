/**
 * OrganizationMembersPage
 *
 * Organization members management for Minside app
 * - List all members with roles (real SDK hooks)
 * - Invite new members
 * - Update member roles
 * - Remove members
 */

import { useState } from 'react';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Spinner,
  Input,
  PillDropdown,
  Label,
  Stack,
  Grid,
  useDialog,
  useToast,
  useIsMobile,
  DashboardPageHeader,
  PageContentLayout,
  EmptyState,
  UsersIcon,
} from '@digipicks/ds';
import { useOrganizationMembers, useAddOrgMember, useRemoveOrgMember, useUpdateOrgMemberRole } from '@digipicks/sdk';
import type { Id } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { useAccountContext, useTenantContext } from '@digipicks/app-shell';
import s from './Members.module.css';

const ROLES = ['admin', 'member', 'viewer'] as const;
type Role = (typeof ROLES)[number];

export function OrganizationMembersPage() {
  const t = useT();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const isMobile = useIsMobile();
  const accountCtx = useAccountContext();
  const orgId = accountCtx?.selectedOrganization?.id as Id<'organizations'> | undefined;
  const { tenantId } = useTenantContext();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { members, isLoading } = useOrganizationMembers(orgId);
  const addMember = useAddOrgMember();
  const removeMember = useRemoveOrgMember();
  const updateMember = useUpdateOrgMemberRole();

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !tenantId || !orgId) return;

    try {
      await addMember.mutateAsync({
        tenantId: tenantId as any,
        organizationId: orgId,
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      showToast({ title: t('org.memberInvited'), variant: 'success' });
    } catch {
      showToast({ title: t('org.inviteFailed', 'Kunne ikke invitere medlem.'), variant: 'error' });
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    const confirmed = await confirm({
      title: t('org.removeMember'),
      description: t('org.confirmRemoveMember', { name: memberName }),
      confirmText: t('common.remove'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await removeMember.mutateAsync({ userId: memberId as Id<'users'> });
        showToast({ title: t('org.memberRemoved'), variant: 'success' });
      } catch {
        showToast({ title: t('org.removeFailed', 'Kunne ikke fjerne medlem.'), variant: 'error' });
      }
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    try {
      await updateMember.mutateAsync({
        userId: memberId as Id<'users'>,
        role: newRole,
      });
      showToast({ title: t('org.roleUpdated'), variant: 'success' });
    } catch {
      showToast({ title: t('org.roleUpdateFailed', 'Kunne ikke endre rolle.'), variant: 'error' });
    }
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('org.members')}
        subtitle={t('org.membersDesc')}
        backHref="/org"
        backLabel={t('org.backToDashboard')}
        actions={
          <Button type="button" variant="primary" data-size="md" onClick={() => setShowInviteForm(!showInviteForm)}>
            {t('org.inviteMember')}
          </Button>
        }
      />

      {/* Invite Form */}
      {showInviteForm && (
        <Card className={s.inviteCard}>
          <Heading level={2} data-size="sm" className={s.inviteTitle}>
            {t('org.inviteNewMember')}
          </Heading>
          <Grid columns={isMobile ? '1fr' : '1fr auto auto'} gap="var(--ds-size-3)" className={s.inviteGrid}>
            <Stack direction="vertical" spacing="var(--ds-size-2)">
              <Label className={s.fieldLabel}>{t('common.email')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('org.memberEmailPlaceholder')}
                className={s.fullWidth}
              />
            </Stack>
            <Stack direction="vertical" spacing="var(--ds-size-2)">
              <Label className={s.fieldLabel}>{t('common.role')}</Label>
              <PillDropdown
                label={inviteRole}
                options={ROLES.map((role) => ({ value: role, label: role }))}
                value={inviteRole}
                onChange={(v) => setInviteRole(v as Role)}
                ariaLabel={t('common.role')}
              />
            </Stack>
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={handleInvite}
              disabled={addMember.isLoading || !inviteEmail.trim()}
              className={s.submitButton}
            >
              {addMember.isLoading ? t('common.sending') : t('common.invite')}
            </Button>
          </Grid>
        </Card>
      )}

      {/* Stats */}
      <Grid columns={isMobile ? '1fr' : 'repeat(3, 1fr)'} gap="var(--ds-size-4)">
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('org.totalMembers')}
          </Paragraph>
          <Heading level={2} data-size="lg" className={s.statValue}>
            {members.length}
          </Heading>
        </Card>
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('org.admins')}
          </Paragraph>
          <Heading level={2} data-size="lg" className={s.statValue}>
            {members.filter((m: any) => m.role === 'admin').length}
          </Heading>
        </Card>
        <Card className={s.statCard}>
          <Paragraph data-size="sm" className={s.statLabel}>
            {t('org.regularMembers')}
          </Paragraph>
          <Heading level={2} data-size="lg" className={s.statValue}>
            {members.filter((m: any) => m.role !== 'admin').length}
          </Heading>
        </Card>
      </Grid>

      {/* Members List */}
      <Card className={s.membersListCard}>
        <Stack className={s.membersListHeader}>
          <Heading level={2} data-size="sm" className={s.membersListTitle}>
            {t('org.allMembers')}
          </Heading>
        </Stack>

        {isLoading ? (
          <Stack direction="horizontal" justify="center" className={s.loadingCenter}>
            <Spinner aria-label={t('common.loading')} data-size="lg" />
          </Stack>
        ) : members.length === 0 ? (
          <EmptyState icon={<UsersIcon />} title={t('org.noMembers')} />
        ) : (
          <Stack direction="vertical">
            {members.map((member: any) => (
              <Stack
                key={member.id}
                direction={isMobile ? 'vertical' : 'horizontal'}
                align={isMobile ? 'start' : 'center'}
                justify="between"
                spacing="var(--ds-size-3)"
                className={s.memberRow}
              >
                <Stack direction="horizontal" align="center" spacing="var(--ds-size-3)">
                  <div className={s.memberAvatar}>{member.name?.charAt(0) || member.email?.charAt(0) || '?'}</div>
                  <div>
                    <Paragraph data-size="sm" className={s.memberName}>
                      {member.name || member.email}
                    </Paragraph>
                    <Paragraph data-size="xs" className={s.memberEmail}>
                      {member.email}
                    </Paragraph>
                  </div>
                </Stack>

                <Stack
                  direction="horizontal"
                  align="center"
                  spacing="var(--ds-size-3)"
                  className={isMobile ? s.memberActionsFull : s.memberActionsAuto}
                >
                  <PillDropdown
                    label={member.role || 'member'}
                    options={ROLES.map((role) => ({ value: role, label: role }))}
                    value={member.role || 'member'}
                    onChange={(v) => handleRoleChange(member.id, v as Role)}
                    className={s.roleDropdown}
                    ariaLabel={t('common.role')}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    data-size="sm"
                    onClick={() => handleRemove(member.id, member.name || member.email)}
                    disabled={removeMember.isLoading}
                    className={s.removeButton}
                  >
                    {t('common.remove')}
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Card>
    </PageContentLayout>
  );
}
