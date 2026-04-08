/**
 * User Detail Page
 * Full-page view for viewing and managing a single backoffice user
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Badge,
  Stack,
  Grid,
  PillTabs,
  ArrowLeftIcon,
  EditIcon,
  XCircleIcon,
  CheckCircleIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  CopyIcon,
  ShieldCheckIcon,
  ClockIcon,
  useDialog,
  useToast,
  LoadingState,
} from '@digilist-saas/ds';
import {
  useUser,
  useDeactivateUser,
  useReactivateUser,
} from '@digilist-saas/sdk';
import { useT } from '@digilist-saas/i18n';
import styles from './UserDetailPage.module.css';

const ROLE_LABEL_KEYS: Record<string, string> = {
  super_admin: 'users.detail.roleSuperAdmin',
  admin: 'users.detail.roleAdmin',
  saksbehandler: 'users.detail.roleSaksbehandler',
  manager: 'users.detail.roleManager',
  member: 'users.detail.roleMember',
  viewer: 'users.detail.roleViewer',
  guest: 'users.detail.roleGuest',
  user: 'users.user',
};

const roleColors: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  super_admin: 'success',
  admin: 'info',
  saksbehandler: 'warning',
  manager: 'info',
  member: 'neutral',
  viewer: 'neutral',
  guest: 'neutral',
  user: 'neutral',
};

const statusColors: Record<string, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  inactive: 'warning',
  invited: 'warning',
  disabled: 'danger',
  suspended: 'danger',
};

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');

  const getRoleLabel = (role: string) => t(ROLE_LABEL_KEYS[role] ?? role);
  const getAccessLevel = (role: string) => {
    if (role === 'super_admin') return t('users.detail.accessFull');
    if (role === 'admin') return t('users.detail.accessAdministrative');
    return t('users.detail.accessLimited');
  };

  // Queries
  const { data: userData, isLoading } = useUser(id!) as any;
  const user = userData?.data as any;

  // Mutations
  const deactivateUserMutation = useDeactivateUser();
  const reactivateUserMutation = useReactivateUser();

  // Handlers
  const handleEdit = () => {
    navigate(`/users/${id}/edit`);
  };

  const handleDeactivate = async () => {
    if (!user) return;
    const confirmed = await confirm({
      title: t('users.detail.deactivate', { defaultValue: 'Deaktiver bruker' }),
      description: t('users.detail.confirmDeactivate'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });
    if (confirmed) {
      await deactivateUserMutation.mutateAsync({ id: user.id } as any);
    }
  };

  const handleReactivate = async () => {
    if (user) {
      await reactivateUserMutation.mutateAsync({ id: user.id } as any);
    }
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      showToast({ title: t('common.copyError'), variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <LoadingState message={t('common.loading')} size="lg" />
    );
  }

  if (!user) {
    return (
      <Stack direction="vertical" align="center" spacing="var(--ds-size-4)" className={styles.notFoundPadding}>
        <Heading level={3} data-size="sm" className={styles.headingNoMargin}>{t('users.detail.notFound')}</Heading>
        <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)', margin: 0 }}>{t('users.detail.notFoundDesc')}</Paragraph>
        <Link to="/users">
          <Button variant="secondary" data-size="sm" type="button">
            <ArrowLeftIcon />
            {t('users.detail.backToList')}
          </Button>
        </Link>
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" spacing="var(--ds-size-5)" className={styles.pageContainer}>
      {/* Breadcrumb */}
      <div>
        <Link to="/users">
          <Button variant="tertiary" data-size="sm" className={styles.backButton} type="button">
            <ArrowLeftIcon />
            {t('users.detail.backToUsers')}
          </Button>
        </Link>

        {/* Header */}
        <Stack direction="horizontal" justify="between" align="start">
          <div>
            <Heading level={2} data-size="lg">
              {user.name}
            </Heading>
            <Stack direction="horizontal" spacing="var(--ds-size-2)" className={styles.badgeRow}>
              <Badge variant={roleColors[user.role]}>
                {getRoleLabel(user.role)}
              </Badge>
              <Badge variant={statusColors[user.status]}>
                {user.status === 'active' ? t('users.detail.statusActive') : user.status === 'inactive' ? t('users.detail.statusInactive') : t('users.detail.statusSuspended')}
              </Badge>
            </Stack>
          </div>

          <Stack direction="horizontal" spacing="var(--ds-size-2)">
            <Button variant="secondary" data-size="sm" onClick={handleEdit} type="button">
              <EditIcon />
              {t('common.edit')}
            </Button>
            {user.status === 'active' && !['admin', 'super_admin'].includes(user.role) ? (
              <Button variant="secondary" data-size="sm" onClick={handleDeactivate} type="button">
                <XCircleIcon />
                {t('users.detail.deactivate')}
              </Button>
            ) : user.status !== 'active' ? (
              <Button variant="secondary" data-size="sm" onClick={handleReactivate} type="button">
                <CheckCircleIcon />
                {t('users.detail.reactivate')}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </div>

      {/* Content */}
      <PillTabs
        tabs={[
          { id: 'info', label: t('users.detail.tabInfo'), icon: <UserIcon /> },
          { id: 'activity', label: t('users.detail.tabActivity'), icon: <ClockIcon /> },
          { id: 'security', label: t('users.detail.tabSecurity'), icon: <ShieldCheckIcon /> },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel={t('backoffice2.userDetailTabsAria')}
        className={styles.tabsMargin}
      />

      {/* Information Tab */}
      {activeTab === 'info' && (
        <Grid columns="repeat(auto-fit, minmax(400px, 1fr))" gap="var(--ds-size-4)">
          {/* Contact Information */}
          <Card>
            <Stack spacing={4}>
              <Heading level={3} data-size="sm">{t('users.detail.contactInfo')}</Heading>

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                  <MailIcon className={styles.iconSubtle} />
                  <Paragraph data-size="sm" className={styles.subtleText}>{t('common.email')}</Paragraph>
                </Stack>
                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                  <a href={`mailto:${user.email}`} className={styles.linkColor}>
                    {user.email}
                  </a>
                  <Button
                    variant="tertiary"
                    data-size="sm"
                    onClick={() => handleCopyToClipboard(user.email, 'email')}
                    aria-label={t('users.detail.copyEmail')} type="button"
                  >
                    {copiedField === 'email' ? <CheckCircleIcon /> : <CopyIcon />}
                  </Button>
                </Stack>
              </Stack>

              {user.phone && (
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                    <PhoneIcon className={styles.iconSubtle} />
                    <Paragraph data-size="sm" className={styles.subtleText}>{t('users.detail.phone')}</Paragraph>
                  </Stack>
                  <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                    <a href={`tel:${user.phone}`} className={styles.linkColor}>
                      {user.phone}
                    </a>
                    <Button
                      variant="tertiary"
                      data-size="sm"
                      onClick={() => handleCopyToClipboard(user.phone!, 'phone')}
                      aria-label={t('users.detail.copyPhone')} type="button"
                    >
                      {copiedField === 'phone' ? <CheckCircleIcon /> : <CopyIcon />}
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Role and Status */}
          <Card>
            <Stack spacing={4}>
              <Heading level={3} data-size="sm">{t('users.detail.roleAndAccess')}</Heading>

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.subtleText}>{t('common.role')}</Paragraph>
                <Badge variant={roleColors[user.role]} data-size="lg">
                  <ShieldCheckIcon />
                  {getRoleLabel(user.role)}
                </Badge>
              </Stack>

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.subtleText}>{t('common.status')}</Paragraph>
                <Badge variant={statusColors[user.status]} data-size="lg">
                  {user.status === 'active' ? (
                    <>
                      <CheckCircleIcon />
                      {t('users.detail.statusActive')}
                    </>
                  ) : user.status === 'inactive' ? (
                    t('users.detail.statusInactive')
                  ) : (
                    t('users.detail.statusSuspended')
                  )}
                </Badge>
              </Stack>

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.subtleText}>{t('users.detail.accessLevel')}</Paragraph>
                <Paragraph data-size="sm" className={styles.headingNoMargin}>
                  {t('users.detail.accessDescription', { level: getAccessLevel(user.role) })}
                </Paragraph>
              </Stack>
            </Stack>
          </Card>

          {/* Account Information */}
          <Card>
            <Stack spacing={4}>
              <Heading level={3} data-size="sm">{t('users.detail.accountInfo')}</Heading>

              {user.lastLoginAt && (
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                    <ClockIcon className={styles.iconSubtle} />
                    <Paragraph data-size="sm" className={styles.subtleText}>{t('users.detail.lastLogin')}</Paragraph>
                  </Stack>
                  <Paragraph data-size="sm" className={styles.fontMedium}>
                    {new Date(user.lastLoginAt).toLocaleString('nb-NO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Paragraph>
                </Stack>
              )}

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.subtleText}>{t('users.detail.created')}</Paragraph>
                <Paragraph data-size="sm" className={styles.fontMedium}>
                  {new Date(user.createdAt).toLocaleDateString('nb-NO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Paragraph>
              </Stack>

              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="sm" className={styles.subtleText}>{t('users.detail.userId')}</Paragraph>
                <Paragraph data-size="sm" className={styles.monoSubtle}>
                  {user.id}
                </Paragraph>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <div className={styles.emptyState}>
            <ClockIcon className={styles.emptyIcon} />
            <Heading level={4} data-size="xs" className={styles.emptyHeading}>
              {t('users.detail.noActivityYet')}
            </Heading>
            <Paragraph data-size="sm" className={styles.subtleText}>
              {t('users.detail.noActivityDescription')}
            </Paragraph>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <Stack spacing={4}>
            <Stack direction="horizontal" spacing="var(--ds-size-3)" align="start" className={styles.securityBanner}>
              <ShieldCheckIcon className={styles.securityIcon} />
              <div>
                <Heading level={4} data-size="xs" className={styles.securityHeading}>
                  {t('users.detail.accessLevel')}: {getRoleLabel(user.role)}
                </Heading>
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('users.detail.accessDescription', { level: getAccessLevel(user.role) })}
                </Paragraph>
              </div>
            </Stack>

            <div>
              <Heading level={4} data-size="xs" className={styles.backButton}>
                {t('users.detail.accessHistory')}
              </Heading>
              <Card>
                <div style={{ padding: 'var(--ds-size-4)', textAlign: 'center' }}>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('users.detail.loginHistoryDescription')}
                  </Paragraph>
                </div>
              </Card>
            </div>

            <div>
              <Heading level={4} data-size="xs" className={styles.backButton}>
                {t('users.detail.securitySettings')}
              </Heading>
              <Card>
                <div style={{ padding: 'var(--ds-size-4)', textAlign: 'center' }}>
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('users.detail.securitySettingsDescription')}
                  </Paragraph>
                </div>
              </Card>
            </div>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
