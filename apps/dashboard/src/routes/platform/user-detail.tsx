/**
 * User Detail Page — SaaS Platform Admin
 *
 * View and manage a single user. Same layout pattern as tenant detail.
 */

import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Grid,
  Heading,
  Paragraph,
  Stack,
  StatusTag,
  Tag,
  Button,
  Spinner,
  PillDropdown,
  UsersIcon,
  TrashIcon,
  ShieldCheckIcon,
  CalendarIcon,
  PageContentLayout,
  DashboardPageHeader,
  useIsMobile,
  useDialog,
  useToast,
} from '@digilist-saas/ds';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

// =============================================================================
// Constants
// =============================================================================

const STATUS_MAP: Record<string, { color: 'success' | 'neutral' | 'danger'; label: string }> = {
  active: { color: 'success', label: 'Aktiv' },
  inactive: { color: 'neutral', label: 'Inaktiv' },
  suspended: { color: 'danger', label: 'Suspendert' },
};

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Plattformadmin', color: 'danger' },
  owner: { label: 'Eier', color: 'accent' },
  admin: { label: 'Admin', color: 'accent' },
  saksbehandler: { label: 'Saksbehandler', color: 'neutral' },
  user: { label: 'Bruker', color: 'neutral' },
};

function roleLabel(role: string) {
  if (role === 'super_admin') return 'Plattformadmin';
  if (role === 'owner') return 'Eier';
  if (role === 'admin') return 'Admin';
  if (role === 'saksbehandler') return 'Saksbehandler';
  return 'Bruker';
}

// =============================================================================
// Component
// =============================================================================

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const updateUser = useMutation(api.domain.platformAdmin.updateUser);
  const deleteUserMut = useMutation(api.domain.platformAdmin.deleteUser);

  const rawUsers = useQuery(api.domain.platformAdmin.listAllUsers, {});
  const user = id && rawUsers ? rawUsers.find((u: any) => u.id === id) : null;
  const isLoading = rawUsers === undefined;

  const status = (user as any)?.status || 'active';
  const statusOpt = STATUS_MAP[status] ?? { color: 'neutral' as const, label: status };
  const role = (user as any)?.role || 'user';
  const rl = ROLE_MAP[role] ?? { label: role, color: 'neutral' };

  if (isLoading) {
    return <PageContentLayout><Stack direction="horizontal" justify="center" style={{ padding: 'var(--ds-size-10)' }}><Spinner aria-label="Laster..." /></Stack></PageContentLayout>;
  }

  if (!user) {
    return (
      <PageContentLayout>
        <Stack direction="vertical" spacing="var(--ds-size-6)" align="center" style={{ padding: 'var(--ds-size-10)' }}>
          <Paragraph data-size="md">Bruker ikke funnet</Paragraph>
          <Button type="button" variant="secondary" onClick={() => navigate('/platform/users')}>Tilbake</Button>
        </Stack>
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      {/* Header with avatar */}
      <DashboardPageHeader>
        <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ds-color-accent-surface-default)', color: 'var(--ds-color-accent-base-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1.25rem', flexShrink: 0 }}>
            {((user as any).name || (user as any).email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <Stack direction="vertical" spacing="var(--ds-size-1)">
            <Heading level={2} data-size="md" style={{ margin: 0 }}>{(user as any).name || (user as any).email}</Heading>
            <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>{(user as any).email}</Paragraph>
          </Stack>
        </Stack>
      </DashboardPageHeader>

      <Stack direction="vertical" spacing="var(--ds-size-5)">

        {/* Status cards */}
        <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</Paragraph>
              <StatusTag color={statusOpt.color} size="sm">{statusOpt.label}</StatusTag>
            </Stack>
          </Card>
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rolle</Paragraph>
              <Tag data-size="sm" data-color={rl.color as any}>{rl.label}</Tag>
            </Stack>
          </Card>
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Utleier</Paragraph>
              <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>{(user as any).tenantName || 'Plattform'}</Paragraph>
            </Stack>
          </Card>
        </Grid>

        {/* User info */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>Brukerinformasjon</Paragraph>
            <InfoRow label="Navn" value={(user as any).name || '–'} />
            <InfoRow label="E-post" value={(user as any).email || '–'} />
            <InfoRow label="Rolle" value={roleLabel(role)} />
            <InfoRow label="Utleier" value={(user as any).tenantName || 'Plattform'} />
            <InfoRow label="Status" value={statusOpt.label} />
          </Stack>
        </Card>

      </Stack>

      {/* Footer: admin actions left, back right */}
      <Stack direction="horizontal" justify="between" align="center" style={{ paddingTop: 'var(--ds-size-6)', borderTop: '1px solid var(--ds-color-neutral-border-subtle)', marginTop: 'var(--ds-size-6)', paddingBottom: 'var(--ds-size-8)', flexWrap: 'wrap', gap: 'var(--ds-size-3)' }}>
        <Stack direction="horizontal" spacing="var(--ds-size-3)">
          {status === 'active' && (
            <Button type="button" variant="secondary" data-size="md" data-color="danger" onClick={async () => {
              const ok = await confirm({ title: 'Suspender bruker', description: `Suspender "${(user as any).name}"?`, confirmText: 'Suspender', variant: 'danger' });
              if (ok) { await updateUser({ userId: id as any, status: 'suspended' }); showToast({ title: 'Bruker suspendert', variant: 'warning' }); }
            }}>Suspender</Button>
          )}
          {(status === 'suspended' || status === 'inactive') && (
            <Button type="button" variant="secondary" data-size="md" onClick={async () => { await updateUser({ userId: id as any, status: 'active' }); showToast({ title: 'Bruker aktivert', variant: 'success' }); }}>Aktiver</Button>
          )}
          <Button type="button" variant="secondary" data-size="md" data-color="danger" onClick={async () => {
            const ok = await confirm({ title: 'Slett bruker', description: `Slett "${(user as any).name}" permanent?`, confirmText: 'Slett permanent', variant: 'danger' });
            if (ok) { await deleteUserMut({ userId: id as any }); showToast({ title: 'Bruker slettet', variant: 'error' }); navigate('/platform/users'); }
          }}><TrashIcon size={14} /> Slett</Button>
        </Stack>
        <Button type="button" variant="secondary" data-size="lg" onClick={() => navigate('/platform/users')}>Tilbake</Button>
      </Stack>

    </PageContentLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="horizontal" justify="between" align="center" style={{ borderBottom: '1px solid var(--ds-color-neutral-border-subtle)', paddingBottom: 'var(--ds-size-2)' }}>
      <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>{label}</Paragraph>
      <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>{value}</Paragraph>
    </Stack>
  );
}
