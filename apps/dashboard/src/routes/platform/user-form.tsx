/**
 * User Form Page — SaaS Platform Admin
 *
 * Edit user details: name, email, role, status, tenant assignment.
 * Same layout pattern as tenant detail — single page with cards.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Textfield,
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
  TrashIcon,
  PageContentLayout,
  DashboardPageHeader,
  useIsMobile,
  useDialog,
  useToast,
} from '@digipicks/ds';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

// =============================================================================
// Constants
// =============================================================================

const ROLE_OPTIONS = [
  { value: 'user', label: 'Bruker' },
  { value: 'owner', label: 'Eier (utleier)' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Plattformadmin' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktiv' },
  { value: 'inactive', label: 'Inaktiv' },
  { value: 'suspended', label: 'Suspendert' },
];

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'danger',
  owner: 'accent',
  admin: 'accent',
  saksbehandler: 'neutral',
  user: 'neutral',
};

const STATUS_COLOR: Record<string, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
};

// =============================================================================
// Component
// =============================================================================

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'user', status: 'active' });
  const [formInitialized, setFormInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rawUsers = useQuery(api.domain.platformAdmin.listAllUsers, {});
  const user = id && rawUsers ? rawUsers.find((u: any) => u.id === id) : null;
  const updateUser = useMutation(api.domain.platformAdmin.updateUser);
  const deleteUserMut = useMutation(api.domain.platformAdmin.deleteUser);

  useEffect(() => {
    if (!user || formInitialized) return;
    setForm({
      name: (user as any).name || '',
      email: (user as any).email || '',
      phone: (user as any).phone || '',
      role: (user as any).role || 'user',
      status: (user as any).status || 'active',
    });
    setFormInitialized(true);
  }, [user, formInitialized]);

  const update = useCallback(<K extends keyof typeof form>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const emailValid = form.email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const phoneValid = form.phone.length === 0 || /^[+]?[\d\s()-]{7,}$/.test(form.phone);
  const canSave = form.name.trim().length >= 1 && form.email.length > 0 && emailValid && phoneValid;

  const userId = user?.id;

  const handleSave = useCallback(async () => {
    if (!canSave || !userId) return;
    setIsSaving(true);
    try {
      await updateUser({
        userId: userId as any,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        status: form.status as any,
      });
      showToast({ title: 'Bruker oppdatert', variant: 'success' });
      navigate('/platform/users');
    } catch (err) {
      showToast({
        title: 'Kunne ikke lagre: ' + (err instanceof Error ? err.message : 'ukjent feil'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [canSave, userId, form, updateUser, showToast, navigate]);

  const roleOpt = ROLE_OPTIONS.find((o) => o.value === form.role);
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === form.status);

  if (rawUsers !== undefined && !user) {
    return (
      <PageContentLayout>
        <Paragraph data-size="md" style={{ padding: 'var(--ds-size-10)', textAlign: 'center' }}>
          Bruker ikke funnet
        </Paragraph>
      </PageContentLayout>
    );
  }
  if (!formInitialized) {
    return (
      <PageContentLayout>
        <Stack direction="horizontal" justify="center" style={{ padding: 'var(--ds-size-10)' }}>
          <Spinner aria-label="Laster..." />
        </Stack>
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      {/* Header with avatar */}
      <DashboardPageHeader>
        <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--ds-color-accent-surface-default)',
              color: 'var(--ds-color-accent-base-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '1.25rem',
              flexShrink: 0,
            }}
          >
            {form.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || '?'}
          </div>
          <Stack direction="vertical" spacing="var(--ds-size-1)">
            <Heading level={2} data-size="md" style={{ margin: 0 }}>
              {form.name || 'Rediger bruker'}
            </Heading>
            <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
              {form.email}
            </Paragraph>
          </Stack>
        </Stack>
      </DashboardPageHeader>

      <Stack direction="vertical" spacing="var(--ds-size-5)">
        {/* Status cards */}
        <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph
                data-size="xs"
                data-color="subtle"
                style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                Status
              </Paragraph>
              <StatusTag color={STATUS_COLOR[form.status] ?? 'neutral'} size="sm">
                {statusOpt?.label ?? form.status}
              </StatusTag>
            </Stack>
          </Card>
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph
                data-size="xs"
                data-color="subtle"
                style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                Rolle
              </Paragraph>
              <Tag data-size="sm" data-color={(ROLE_COLOR[form.role] ?? 'neutral') as any}>
                {roleOpt?.label ?? form.role}
              </Tag>
            </Stack>
          </Card>
          <Card style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
            <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
              <Paragraph
                data-size="xs"
                data-color="subtle"
                style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                Utleier
              </Paragraph>
              <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>
                {(user as any)?.tenantName || 'Plattform'}
              </Paragraph>
            </Stack>
          </Card>
        </Grid>

        {/* User info form */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Brukerinformasjon
            </Paragraph>
            <div>
              <Textfield
                label="Navn"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                data-size="sm"
              />
              {form.name.length > 0 && form.name.trim().length === 0 && (
                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                  Navn kan ikke være tomt
                </Paragraph>
              )}
            </div>
            <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
              <div>
                <Textfield
                  label="E-post"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                  data-size="sm"
                />
                {form.email.length > 0 && !emailValid && (
                  <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                    Ugyldig e-postadresse
                  </Paragraph>
                )}
              </div>
              <div>
                <Textfield
                  label="Telefon"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  data-size="sm"
                />
                {form.phone.length > 0 && !/^[+]?[\d\s()-]{7,}$/.test(form.phone) && (
                  <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                    Ugyldig telefonnummer
                  </Paragraph>
                )}
              </div>
            </Grid>
          </Stack>
        </Card>

        {/* Role + Status */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Rolle og status
            </Paragraph>
            <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>
                  Rolle
                </Paragraph>
                <PillDropdown
                  label={roleOpt?.label ?? 'Velg rolle'}
                  value={form.role}
                  onChange={(val) => update('role', val)}
                  options={ROLE_OPTIONS}
                  ariaLabel="Rolle"
                  size="md"
                />
              </Stack>
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>
                  Status
                </Paragraph>
                <PillDropdown
                  label={statusOpt?.label ?? 'Velg status'}
                  value={form.status}
                  onChange={(val) => update('status', val)}
                  options={STATUS_OPTIONS}
                  ariaLabel="Status"
                  size="md"
                />
              </Stack>
            </Grid>
          </Stack>
        </Card>
      </Stack>

      {/* Footer: danger left, save/cancel right */}
      <Stack
        direction="horizontal"
        justify="between"
        align="center"
        style={{
          paddingTop: 'var(--ds-size-6)',
          borderTop: '1px solid var(--ds-color-neutral-border-subtle)',
          marginTop: 'var(--ds-size-6)',
          paddingBottom: 'var(--ds-size-8)',
          flexWrap: 'wrap',
          gap: 'var(--ds-size-3)',
        }}
      >
        <Stack direction="horizontal" spacing="var(--ds-size-3)">
          {form.status === 'active' && (
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              data-color="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Suspender bruker',
                  description: `Suspender "${form.name}"?`,
                  confirmText: 'Suspender',
                  variant: 'danger',
                });
                if (ok && userId) {
                  await updateUser({ userId: userId as any, status: 'suspended' });
                  update('status', 'suspended');
                  showToast({ title: 'Bruker suspendert', variant: 'warning' });
                }
              }}
            >
              Suspender
            </Button>
          )}
          {(form.status === 'suspended' || form.status === 'inactive') && (
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              onClick={async () => {
                if (userId) {
                  await updateUser({ userId: userId as any, status: 'active' });
                  update('status', 'active');
                  showToast({ title: 'Bruker aktivert', variant: 'success' });
                }
              }}
            >
              Aktiver
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            data-size="md"
            data-color="danger"
            onClick={async () => {
              const ok = await confirm({
                title: 'Slett bruker',
                description: `Slett "${form.name}" permanent?`,
                confirmText: 'Slett permanent',
                variant: 'danger',
              });
              if (ok && userId) {
                await deleteUserMut({ userId: userId as any });
                showToast({ title: 'Bruker slettet', variant: 'error' });
                navigate('/platform/users');
              }
            }}
          >
            <TrashIcon size={14} /> Slett
          </Button>
        </Stack>
        <Stack direction="horizontal" spacing="var(--ds-size-3)">
          <Button type="button" variant="secondary" data-size="lg" onClick={() => navigate('/platform/users')}>
            Avbryt
          </Button>
          <Button type="button" variant="primary" data-size="lg" disabled={!canSave || isSaving} onClick={handleSave}>
            {isSaving ? 'Lagrer...' : 'Lagre endringer'}
          </Button>
        </Stack>
      </Stack>
    </PageContentLayout>
  );
}
