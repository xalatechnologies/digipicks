/**
 * Tenant Detail / Form Page — SaaS Platform Admin
 *
 * Single scrollable page with section cards. No wizard tabs.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Textfield,
  Textarea,
  PillDropdown,
  Card,
  Grid,
  Heading,
  Paragraph,
  Stack,
  StatusTag,
  Tag,
  Button,
  Spinner,
  CheckIcon,
  UsersIcon,
  ListIcon,
  CalendarIcon,
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

type TenantStatus = 'active' | 'suspended' | 'pending' | 'deleted';

const PLAN_OPTIONS = [
  {
    value: 'basis',
    label: 'Basis',
    commission: '5%',
    description: 'Grunnleggende profil og booking',
    features: ['Profilside', 'Bookingkalender', 'E-postvarsler'],
  },
  {
    value: 'pluss',
    label: 'Pluss',
    commission: '10%',
    description: 'Prioritert synlighet og prisverktøy',
    features: ['Alt i Basis', 'Prioritert i søk', 'Prisgrupper', 'Rabattkoder', 'Rapporter'],
    recommended: true,
  },
  {
    value: 'premium',
    label: 'Premium',
    commission: '15%',
    description: 'Forsideplass, rådgiver og API',
    features: ['Alt i Pluss', 'Forsideplass', 'Dedikert rådgiver', 'API-tilgang', 'Billettløsning'],
  },
];

const STATUS_OPTIONS: { value: TenantStatus; label: string; color: 'success' | 'warning' | 'danger' | 'neutral' }[] = [
  { value: 'active', label: 'Aktiv', color: 'success' },
  { value: 'pending', label: 'Venter', color: 'warning' },
  { value: 'suspended', label: 'Suspendert', color: 'danger' },
  { value: 'deleted', label: 'Slettet', color: 'neutral' },
];

// =============================================================================
// Component
// =============================================================================

export function TenantFormPage() {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const isEditMode = Boolean(routeSlug);
  const isMobile = useIsMobile();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    orgNumber: '',
    plan: 'basis',
    status: 'pending' as TenantStatus,
    contactEmail: '',
    contactPhone: '',
    maxUsers: '50',
    commission: '5',
  });
  const [formInitialized, setFormInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const rawTenants = useQuery(api.domain.tenantOnboarding.listAllTenants, isEditMode ? {} : 'skip');
  const updateTenant = useMutation(api.domain.platformAdmin.updateTenant);
  const deleteTenantMut = useMutation(api.domain.platformAdmin.deleteTenant);
  const tenant = isEditMode && routeSlug && rawTenants ? rawTenants.find((t: any) => t.slug === routeSlug) : null;
  const tenantId = tenant?.id;

  useEffect(() => {
    if (!tenant || formInitialized) return;
    const p = PLAN_OPTIONS.find((p) => p.value === (tenant.plan || '').toLowerCase());
    setForm({
      name: tenant.name || '',
      slug: tenant.slug || '',
      description: (tenant as any).description || '',
      orgNumber: (tenant as any).orgNumber || '',
      plan: p?.value || 'basis',
      status: (tenant.status || 'active') as TenantStatus,
      contactEmail: (tenant as any).contactEmail || tenant.ownerEmail || '',
      contactPhone: (tenant as any).contactPhone || '',
      maxUsers: '50',
      commission: p?.commission?.replace('%', '') || '5',
    });
    setFormInitialized(true);
  }, [tenant, formInitialized]);

  const update = useCallback(
    <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'name')
          next.slug = (value as string)
            .toLowerCase()
            .replace(/[æ]/g, 'ae')
            .replace(/[ø]/g, 'o')
            .replace(/[å]/g, 'a')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        if (key === 'plan') {
          const p = PLAN_OPTIONS.find((p) => p.value === value);
          if (p) next.commission = p.commission.replace('%', '');
        }
        return next;
      });
    },
    [isEditMode],
  );

  const emailValid = form.contactEmail.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail);
  const phoneValid = form.contactPhone.length === 0 || /^[+]?[\d\s()-]{7,}$/.test(form.contactPhone);
  const canSave =
    form.name.trim().length >= 2 &&
    form.slug.trim().length >= 2 &&
    emailValid &&
    form.contactEmail.length > 0 &&
    phoneValid;
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === form.status) ?? {
    value: form.status as TenantStatus,
    label: form.status,
    color: 'neutral' as const,
  };
  const planOpt = PLAN_OPTIONS.find((o) => o.value === form.plan) ?? {
    value: form.plan,
    label: form.plan,
    commission: '0%',
    description: '',
    features: [] as string[],
  };

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      if (isEditMode && tenantId) {
        await updateTenant({
          tenantId: tenantId as any,
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || undefined,
          plan: form.plan,
          status: form.status as any,
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim() || undefined,
          orgNumber: form.orgNumber.trim() || undefined,
        });
        showToast({ title: 'Endringer lagret', variant: 'success' });
        // If slug changed, redirect to new slug URL
        if (form.slug.trim() !== routeSlug) {
          navigate(`/platform/tenants/${form.slug.trim()}`);
          return;
        }
      } else {
        // Create mode — placeholder until createTenant mutation exists
        showToast({ title: 'Opprett utleier er ikke implementert ennå', variant: 'warning' });
      }
      navigate('/platform/tenants');
    } catch (err) {
      showToast({
        title: 'Kunne ikke lagre: ' + (err instanceof Error ? err.message : 'ukjent feil'),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }, [canSave, isEditMode, tenantId, form, updateTenant, showToast, navigate]);

  if (isEditMode && rawTenants !== undefined && !tenant) {
    return (
      <PageContentLayout>
        <Paragraph data-size="md" style={{ padding: 'var(--ds-size-10)', textAlign: 'center' }}>
          Utleier ikke funnet
        </Paragraph>
      </PageContentLayout>
    );
  }
  if (isEditMode && !formInitialized) {
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
      <DashboardPageHeader title={isEditMode ? undefined : 'Ny utleier'}>
        {isEditMode && form.name && (
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
              {form.name.charAt(0).toUpperCase()}
            </div>
            <Stack direction="vertical" spacing="var(--ds-size-1)">
              <Heading level={2} data-size="md" style={{ margin: 0 }}>
                {form.name}
              </Heading>
              <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
                {import.meta.env.VITE_PLATFORM_DOMAIN || 'app.example.com'}/{form.slug}
              </Paragraph>
            </Stack>
          </Stack>
        )}
      </DashboardPageHeader>

      <Stack direction="vertical" spacing="var(--ds-size-5)">
        {/* Status summary (edit mode) */}
        {isEditMode && (
          <Grid columns={isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
            {[
              {
                label: 'Status',
                content: (
                  <StatusTag color={statusOpt?.color ?? 'neutral'} size="sm">
                    {statusOpt?.label ?? form.status}
                  </StatusTag>
                ),
              },
              {
                label: 'Plan',
                content: (
                  <Tag data-size="sm" data-color="accent">
                    {planOpt?.label} · {planOpt?.commission}
                  </Tag>
                ),
              },
              {
                label: 'Lokaler',
                content: (
                  <Paragraph data-size="md" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
                    {tenant?.listingCount ?? 0}
                  </Paragraph>
                ),
              },
            ].map((stat) => (
              <Card key={stat.label} style={{ background: 'var(--ds-color-neutral-surface-default)' }}>
                <Stack direction="vertical" spacing="var(--ds-size-2)" align="center">
                  <Paragraph
                    data-size="xs"
                    data-color="subtle"
                    style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    {stat.label}
                  </Paragraph>
                  {stat.content}
                </Stack>
              </Card>
            ))}
          </Grid>
        )}

        {/* General info */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Grunnleggende informasjon
            </Paragraph>
            <div>
              <Textfield
                label="Navn"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                data-size="sm"
                placeholder="Venue Name"
              />
              {form.name.length > 0 && form.name.trim().length < 2 && (
                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                  Minimum 2 tegn
                </Paragraph>
              )}
            </div>
            <div>
              <Textfield
                label="Nettadresse"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                prefix={`${import.meta.env.VITE_PLATFORM_DOMAIN || 'app.example.com'}/`}
                required
                data-size="sm"
              />
              {form.slug.length > 0 && form.slug.trim().length < 2 && (
                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                  Minimum 2 tegn
                </Paragraph>
              )}
              {isEditMode && form.slug.length >= 2 && (
                <Paragraph data-size="xs" data-color="subtle" style={{ margin: '4px 0 0' }}>
                  Endring av slug påvirker URL
                </Paragraph>
              )}
            </div>
            <div>
              <Textfield
                label="Organisasjonsnummer"
                value={form.orgNumber}
                onChange={(e) => update('orgNumber', e.target.value)}
                data-size="sm"
                placeholder="123 456 789"
              />
              {form.orgNumber.length > 0 && !/^\d{3}\s?\d{3}\s?\d{3}$/.test(form.orgNumber.trim()) && (
                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                  Må være 9 siffer (f.eks. 123 456 789)
                </Paragraph>
              )}
            </div>
            <Textarea
              aria-label="Beskrivelse"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Beskriv utleieren, hva de tilbyr og hva som gjør dem unike..."
              rows={3}
            />
          </Stack>
        </Card>

        {/* Contact */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Kontaktinformasjon
            </Paragraph>
            <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
              <div>
                <Textfield
                  label="E-post"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                  required
                  data-size="sm"
                />
                {form.contactEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail) && (
                  <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                    Ugyldig e-postadresse
                  </Paragraph>
                )}
              </div>
              <div>
                <Textfield
                  label="Telefon"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                  data-size="sm"
                />
                {form.contactPhone.length > 0 && !phoneValid && (
                  <Paragraph data-size="xs" style={{ color: 'var(--ds-color-danger-text-default)', margin: '4px 0 0' }}>
                    Ugyldig telefonnummer
                  </Paragraph>
                )}
              </div>
            </Grid>
          </Stack>
        </Card>

        {/* Plan cards */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Partnernivå
            </Paragraph>
            <Grid columns={isMobile ? '1fr' : 'repeat(3, 1fr)'} gap="var(--ds-size-3)">
              {PLAN_OPTIONS.map((plan) => {
                const isSelected = form.plan === plan.value;
                return (
                  <Card
                    key={plan.value}
                    onClick={() => update('plan', plan.value)}
                    role="button"
                    tabIndex={0}
                    style={{
                      border: isSelected
                        ? '2px solid var(--ds-color-accent-border-default)'
                        : '1px solid var(--ds-color-neutral-border-default)',
                      background: isSelected ? 'var(--ds-color-accent-surface-default)' : undefined,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <Stack direction="vertical" spacing="var(--ds-size-3)">
                      <Stack direction="horizontal" justify="between" align="center">
                        <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                          <Paragraph
                            data-size="sm"
                            style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}
                          >
                            {plan.label}
                          </Paragraph>
                          {plan.recommended && (
                            <Tag data-size="sm" data-color="success">
                              Anbefalt
                            </Tag>
                          )}
                        </Stack>
                        <Paragraph
                          data-size="md"
                          style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}
                        >
                          {plan.commission}
                        </Paragraph>
                      </Stack>
                      <Paragraph data-size="xs" data-color="subtle">
                        {plan.description}
                      </Paragraph>
                      <Stack direction="vertical" spacing="var(--ds-size-1)">
                        {plan.features.map((f, i) => (
                          <Stack key={i} direction="horizontal" spacing="var(--ds-size-2)" align="center">
                            <CheckIcon
                              size={13}
                              style={{ color: 'var(--ds-color-success-base-default)', flexShrink: 0 }}
                            />
                            <Paragraph data-size="xs">{f}</Paragraph>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </Grid>
          </Stack>
        </Card>

        {/* Status + Limits */}
        <Card>
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>
              Status og begrensninger
            </Paragraph>
            <Grid columns={isMobile ? '1fr' : '1fr 1fr 1fr'} gap="var(--ds-size-4)">
              <Stack direction="vertical" spacing="var(--ds-size-2)">
                <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>
                  Status
                </Paragraph>
                <PillDropdown
                  label={statusOpt?.label ?? 'Status'}
                  value={form.status}
                  onChange={(val) => update('status', val as TenantStatus)}
                  options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  ariaLabel="Status"
                  size="md"
                />
              </Stack>
              <Textfield
                label="Provisjon (%)"
                type="number"
                value={form.commission}
                onChange={(e) => update('commission', e.target.value)}
                data-size="md"
              />
            </Grid>
          </Stack>
        </Card>

        {tenant?.createdAt && (
          <Paragraph data-size="xs" data-color="subtle">
            Opprettet{' '}
            {new Date(tenant.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Paragraph>
        )}
      </Stack>

      {/* Footer */}
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
        {isEditMode ? (
          <Stack direction="horizontal" spacing="var(--ds-size-3)">
            {form.status === 'active' && (
              <Button
                type="button"
                variant="secondary"
                data-size="md"
                data-color="danger"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Suspender utleier',
                    description: `Suspender "${form.name}"?`,
                    confirmText: 'Suspender',
                    variant: 'danger',
                  });
                  if (ok && tenantId) {
                    await updateTenant({ tenantId: tenantId as any, status: 'suspended' });
                    update('status', 'suspended');
                    showToast({ title: `${form.name} suspendert`, variant: 'warning' });
                  }
                }}
              >
                Suspender
              </Button>
            )}
            {form.status === 'suspended' && (
              <Button
                type="button"
                variant="secondary"
                data-size="md"
                onClick={async () => {
                  if (tenantId) {
                    await updateTenant({ tenantId: tenantId as any, status: 'active' });
                    update('status', 'active');
                    showToast({ title: `${form.name} aktivert`, variant: 'success' });
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
                  title: 'Deaktiver utleier',
                  description: `Deaktiver "${form.name}"? Utleieren mister tilgang, lokaler skjules. Data beholdes og kan reaktiveres senere.`,
                  confirmText: 'Deaktiver',
                  variant: 'danger',
                });
                if (ok && tenantId) {
                  await updateTenant({ tenantId: tenantId as any, status: 'suspended' });
                  update('status', 'suspended');
                  showToast({ title: `${form.name} deaktivert`, variant: 'warning' });
                  navigate('/platform/tenants');
                }
              }}
            >
              Deaktiver
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              data-color="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Slett utleier',
                  description: `Slett "${form.name}" permanent?`,
                  confirmText: 'Slett permanent',
                  variant: 'danger',
                });
                if (ok && tenantId) {
                  await deleteTenantMut({ tenantId: tenantId as any });
                  showToast({ title: `${form.name} slettet`, variant: 'error' });
                  navigate('/platform/tenants');
                }
              }}
            >
              <TrashIcon size={14} /> Slett
            </Button>
          </Stack>
        ) : (
          <div />
        )}
        <Stack direction="horizontal" spacing="var(--ds-size-3)">
          <Button type="button" variant="secondary" data-size="lg" onClick={() => navigate('/platform/tenants')}>
            Avbryt
          </Button>
          <Button type="button" variant="primary" data-size="lg" disabled={!canSave || isSaving} onClick={handleSave}>
            {isSaving ? 'Lagrer...' : isEditMode ? 'Lagre endringer' : 'Opprett utleier'}
          </Button>
        </Stack>
      </Stack>
    </PageContentLayout>
  );
}
