/**
 * Tenants Page — SaaS Platform Admin
 *
 * Enhanced CRUD list with real data: user count, listing count, plan tiers,
 * owner info. Uses DS CRUD blocks for consistent UX.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Heading,
  Paragraph,
  Tag,
  Card,
  DataTable,
  HeaderSearch,
  Stack,
  Grid,
  EmptyState,
  StatusTag,
  ActionMenu,
  PillTabs,
  PillDropdown,
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  UsersIcon,
  ListIcon,
  TableIcon,
  CalendarIcon,
  CheckIcon,
  FilterToolbar,
  DashboardPageHeader,
  PageContentLayout,
  CrudListItem,
  CrudStatGrid,
  Spinner,
  useIsMobile,
  useDialog,
  useToast,
} from '@digipicks/ds';
import type { DataTableColumn, Action } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

// =============================================================================
// Types & Constants
// =============================================================================

type TenantStatus = 'active' | 'suspended' | 'pending' | 'deleted';
type ViewMode = 'list' | 'table';
type SortField = 'name' | 'createdAt' | 'userCount' | 'listingCount';
type SortOrder = 'asc' | 'desc';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: string;
  userCount: number;
  listingCount: number;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  createdAtRaw: number;
}

const STATUS_MAP: Record<string, { color: 'success' | 'danger' | 'warning' | 'neutral'; label: string }> = {
  active: { color: 'success', label: 'Aktiv' },
  suspended: { color: 'danger', label: 'Suspendert' },
  pending: { color: 'warning', label: 'Venter' },
  deleted: { color: 'neutral', label: 'Slettet' },
};

const STATUS_FALLBACK = { color: 'neutral' as const, label: 'Ukjent' };
const PLAN_FALLBACK = { label: 'Ukjent', commission: '', color: 'neutral' as const };

const PLAN_MAP: Record<string, { label: string; commission: string; color: 'neutral' | 'accent' | 'success' }> = {
  basis: { label: 'Basis', commission: '5%', color: 'neutral' },
  pluss: { label: 'Pluss', commission: '10%', color: 'accent' },
  premium: { label: 'Premium', commission: '15%', color: 'success' },
};

// =============================================================================
// Component
// =============================================================================

export function TenantsPage() {
  const t = useT();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const updateTenant = useMutation(api.domain.platformAdmin.updateTenant);
  const deleteTenantMut = useMutation(api.domain.platformAdmin.deleteTenant);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');

  // Live data
  const rawTenants = useQuery(api.domain.tenantOnboarding.listAllTenants, {});
  const isLoading = rawTenants === undefined;

  const tenants: TenantRow[] = useMemo(
    () =>
      (rawTenants ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: (t.status || 'active') as TenantStatus,
        plan: (t.plan || 'basis').toLowerCase(),
        userCount: t.userCount ?? 0,
        listingCount: t.listingCount ?? 0,
        ownerName: t.ownerName || '',
        ownerEmail: t.ownerEmail || '',
        createdAt: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
          : '–',
        createdAtRaw: t.createdAt || 0,
      })),
    [rawTenants],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...tenants];
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (planFilter) result = result.filter((r) => r.plan === planFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'createdAt') cmp = a.createdAtRaw - b.createdAtRaw;
      else if (sortField === 'userCount') cmp = a.userCount - b.userCount;
      else if (sortField === 'listingCount') cmp = a.listingCount - b.listingCount;
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [tenants, searchQuery, statusFilter, planFilter, sortField, sortOrder]);

  const handleSearchChange = useCallback((value: string) => setSearchQuery(value), []);

  // Search results for dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return tenants
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.ownerEmail.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((r) => {
        const plan = PLAN_MAP[r.plan] ?? PLAN_FALLBACK;
        const status = STATUS_MAP[r.status] ?? STATUS_FALLBACK;
        return {
          id: r.id,
          label: r.name,
          description: `${r.ownerName || r.ownerEmail || r.slug} · ${r.userCount} brukere · ${r.listingCount} lokaler`,
          meta: `${status.label} · ${plan.label} ${plan.commission}`,
        };
      });
  }, [searchQuery, tenants]);
  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split(':') as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
  }, []);

  // Filter options
  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tenants.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return [
      { value: '', label: 'Alle', count: tenants.length },
      { value: 'active', label: 'Aktiv', count: counts['active'] || 0 },
      { value: 'pending', label: 'Venter', count: counts['pending'] || 0 },
      { value: 'suspended', label: 'Suspendert', count: counts['suspended'] || 0 },
      { value: 'deleted', label: 'Slettet', count: counts['deleted'] || 0 },
    ];
  }, [tenants]);

  const planOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    tenants.forEach((r) => {
      counts[r.plan] = (counts[r.plan] || 0) + 1;
    });
    return [
      { value: '', label: 'Alle planer', count: tenants.length },
      ...Object.entries(PLAN_MAP).map(([key, val]) => ({
        value: key,
        label: `${val.label} (${val.commission})`,
        count: counts[key] || 0,
      })),
    ];
  }, [tenants]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string }[] = [];
    if (statusFilter)
      f.push({ key: 'status', label: `Status: ${(STATUS_MAP[statusFilter] ?? STATUS_FALLBACK).label}` });
    if (planFilter) f.push({ key: 'plan', label: `Plan: ${(PLAN_MAP[planFilter] ?? PLAN_FALLBACK).label}` });
    return f;
  }, [statusFilter, planFilter]);

  const handleRemoveFilter = useCallback((key: string) => {
    if (key === 'status') setStatusFilter('');
    if (key === 'plan') setPlanFilter('');
    if (key === 'search') setSearchQuery('');
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setStatusFilter('');
    setPlanFilter('');
    setSearchQuery('');
  }, []);

  // Row actions
  const getTenantActions = useCallback(
    (tenant: TenantRow): Action[] => {
      const actions: Action[] = [
        {
          label: 'Vis detaljer',
          icon: <EyeIcon size={16} />,
          onClick: () => navigate(`/platform/tenants/${tenant.slug}`),
        },
        {
          label: 'Rediger',
          icon: <EditIcon size={16} />,
          onClick: () => navigate(`/platform/tenants/${tenant.slug}/edit`),
        },
      ];
      if (tenant.status === 'active') {
        actions.push({
          label: 'Suspender',
          icon: <TrashIcon size={16} />,
          onClick: async () => {
            const ok = await confirm({
              title: 'Suspender utleier',
              description: `Suspender "${tenant.name}"?`,
              confirmText: 'Suspender',
              variant: 'danger',
            });
            if (ok) {
              await updateTenant({ tenantId: tenant.id as any, status: 'suspended' });
              showToast({ title: `${tenant.name} suspendert`, variant: 'warning' });
            }
          },
          variant: 'danger',
        });
      }
      if (tenant.status === 'suspended') {
        actions.push({
          label: 'Aktiver',
          icon: <CheckIcon size={16} />,
          onClick: async () => {
            await updateTenant({ tenantId: tenant.id as any, status: 'active' });
            showToast({ title: `${tenant.name} aktivert`, variant: 'success' });
          },
        });
      }
      actions.push({
        label: 'Slett',
        icon: <TrashIcon size={16} />,
        onClick: async () => {
          const ok = await confirm({
            title: 'Slett utleier',
            description: `Slett "${tenant.name}" permanent? Alle data fjernes.`,
            confirmText: 'Slett',
            variant: 'danger',
          });
          if (ok) {
            await deleteTenantMut({ tenantId: tenant.id as any });
            showToast({ title: `${tenant.name} slettet`, variant: 'error' });
          }
        },
        variant: 'danger',
      });
      return actions;
    },
    [navigate, confirm, showToast, updateTenant, deleteTenantMut],
  );

  // Table columns
  const columns: DataTableColumn<TenantRow>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Utleier',
        sortable: true,
        render: (row) => (
          <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--ds-color-accent-surface-default)',
                color: 'var(--ds-color-accent-base-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.75rem',
                flexShrink: 0,
              }}
            >
              {row.name.charAt(0).toUpperCase()}
            </div>
            <Stack direction="vertical" spacing="0">
              <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>
                {row.name}
              </Paragraph>
              <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0 }}>
                {import.meta.env.VITE_PLATFORM_DOMAIN || 'app.example.com'}/{row.slug}
              </Paragraph>
            </Stack>
          </Stack>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: '100px',
        render: (row) => {
          const s = STATUS_MAP[row.status] ?? STATUS_FALLBACK;
          return (
            <StatusTag color={s.color} size="sm">
              {s.label}
            </StatusTag>
          );
        },
      },
      {
        id: 'plan',
        header: 'Plan',
        width: '130px',
        render: (row) => {
          const plan = PLAN_MAP[row.plan];
          return plan ? (
            <Tag data-size="sm" data-color={plan.color}>
              {plan.label} · {plan.commission}
            </Tag>
          ) : (
            <Tag data-size="sm" data-color="neutral">
              {row.plan}
            </Tag>
          );
        },
      },
      {
        id: 'listingCount',
        header: 'Lokaler',
        width: '80px',
        sortable: true,
        render: (row) => (
          <Paragraph data-size="sm" style={{ margin: 0, fontWeight: 'var(--ds-font-weight-medium, 500)' }}>
            {row.listingCount}
          </Paragraph>
        ),
      },
      {
        id: 'owner',
        header: 'Eier',
        hideOnMobile: true,
        width: '160px',
        render: (row) => (
          <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
            {row.ownerName || row.ownerEmail || '–'}
          </Paragraph>
        ),
      },
      {
        id: 'createdAt',
        header: 'Opprettet',
        width: '120px',
        sortable: true,
        hideOnMobile: true,
        render: (row) => (
          <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
            {row.createdAt}
          </Paragraph>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: '220px',
        render: (row) => (
          <Stack direction="horizontal" spacing="var(--ds-size-1)" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="secondary"
              data-size="sm"
              onClick={() => navigate(`/platform/tenants/${row.slug}`)}
            >
              Vis
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-size="sm"
              onClick={() => navigate(`/platform/tenants/${row.slug}/edit`)}
            >
              Rediger
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-size="sm"
              data-color="danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Slett utleier',
                  description: `Slett "${row.name}" permanent?`,
                  confirmText: 'Slett',
                  variant: 'danger',
                });
                if (ok) {
                  try {
                    await deleteTenantMut({ tenantId: row.id as any });
                    showToast({ title: `${row.name} slettet`, variant: 'success' });
                  } catch {
                    showToast({ title: 'Kunne ikke slette', variant: 'error' });
                  }
                }
              }}
            >
              Slett
            </Button>
          </Stack>
        ),
      },
    ],
    [getTenantActions],
  );

  // Stats
  const stats = useMemo(() => {
    const active = tenants.filter((r) => r.status === 'active').length;
    const totalUsers = tenants.reduce((s, r) => s + r.userCount, 0);
    const totalListings = tenants.reduce((s, r) => s + r.listingCount, 0);
    return [
      { icon: <UsersIcon />, label: 'Utleiere', value: tenants.length, variant: 'accent' as const },
      { icon: <CheckIcon />, label: 'Aktive', value: active, variant: 'success' as const },
      { icon: <ListIcon />, label: 'Utleieobjekter', value: totalListings, variant: 'neutral' as const },
    ];
  }, [tenants]);

  return (
    <PageContentLayout>
      <DashboardPageHeader count={filtered.length} sticky>
        <FilterToolbar variant="flat" aria-label="Utleierfilter">
          <FilterToolbar.Start>
            <HeaderSearch
              placeholder="Søk etter utleier, slug eller eier..."
              value={searchQuery}
              onSearchChange={handleSearchChange}
              onSearch={handleSearchChange}
              results={searchResults}
              onResultSelect={(result) => navigate(`/platform/tenants/${result.id}`)}
              noResultsText="Ingen utleiere funnet"
              width={isMobile ? '100%' : '400px'}
            />
          </FilterToolbar.Start>
          <FilterToolbar.Center>
            <PillDropdown
              label="Sorter"
              options={[
                { value: 'createdAt:desc', label: 'Nyeste først' },
                { value: 'createdAt:asc', label: 'Eldste først' },
                { value: 'name:asc', label: 'Navn A-Å' },
                { value: 'name:desc', label: 'Navn Å-A' },
                { value: 'listingCount:desc', label: 'Flest lokaler' },
                { value: 'userCount:desc', label: 'Flest brukere' },
              ]}
              value={`${sortField}:${sortOrder}`}
              onChange={handleSortChange}
              size="md"
            />
            <PillDropdown
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              size="md"
            />
            <PillDropdown label="Plan" options={planOptions} value={planFilter} onChange={setPlanFilter} size="md" />
          </FilterToolbar.Center>
          <FilterToolbar.End>
            <PillTabs
              tabs={[
                { id: 'list', label: '', icon: <ListIcon size={18} /> },
                { id: 'table', label: '', icon: <TableIcon size={18} /> },
              ]}
              activeTab={viewMode}
              onTabChange={(id) => setViewMode(id as ViewMode)}
              size="md"
              fullWidth={false}
            />
            <Button type="button" variant="primary" data-size="lg" onClick={() => navigate('/platform/tenants/new')}>
              <PlusIcon size={18} /> Ny utleier
            </Button>
          </FilterToolbar.End>
        </FilterToolbar>
      </DashboardPageHeader>

      <CrudStatGrid stats={stats} />

      {isLoading ? (
        <Stack direction="horizontal" justify="center" style={{ padding: 'var(--ds-size-10)' }}>
          <Spinner aria-label="Laster utleiere..." />
        </Stack>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ingen utleiere funnet"
          description={
            searchQuery || statusFilter || planFilter
              ? 'Prøv å endre søk eller filtre.'
              : 'Opprett din første utleier for å komme i gang.'
          }
          action={
            searchQuery || statusFilter || planFilter ? (
              <Button type="button" variant="secondary" onClick={handleClearAllFilters}>
                Fjern alle filtre
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => navigate('/platform/tenants/new')}>
                Opprett utleier
              </Button>
            )
          }
        />
      ) : viewMode === 'list' ? (
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          {filtered.map((tenant) => {
            const badge = STATUS_MAP[tenant.status] ?? STATUS_FALLBACK;
            const plan = PLAN_MAP[tenant.plan];
            return (
              <Card
                key={tenant.id}
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--ds-color-neutral-border-default)',
                  overflow: 'visible',
                }}
                onClick={() => navigate(`/platform/tenants/${tenant.slug}`)}
              >
                <Stack direction="horizontal" spacing="var(--ds-size-4)" align="start">
                  {/* Avatar */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--ds-color-accent-surface-default)',
                      color: 'var(--ds-color-accent-base-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <Stack direction="vertical" spacing="var(--ds-size-2)" style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: name + badges */}
                    <Stack direction="horizontal" justify="between" align="center">
                      <Stack
                        direction="horizontal"
                        spacing="var(--ds-size-2)"
                        align="center"
                        style={{ flexWrap: 'wrap' }}
                      >
                        <Paragraph
                          data-size="md"
                          style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}
                        >
                          {tenant.name}
                        </Paragraph>
                        <StatusTag color={badge.color} size="sm">
                          {badge.label}
                        </StatusTag>
                        {plan && (
                          <Tag data-size="sm" data-color={plan.color}>
                            {plan.label} · {plan.commission}
                          </Tag>
                        )}
                      </Stack>
                      <Stack direction="horizontal" spacing="var(--ds-size-2)" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="secondary"
                          data-size="sm"
                          onClick={() => navigate(`/platform/tenants/${tenant.slug}`)}
                        >
                          Vis
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          data-size="sm"
                          onClick={() => navigate(`/platform/tenants/${tenant.slug}/edit`)}
                        >
                          Rediger
                        </Button>
                        {tenant.status === 'active' && (
                          <Button
                            type="button"
                            variant="secondary"
                            data-size="sm"
                            data-color="danger"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Suspender utleier',
                                description: `Suspender "${tenant.name}"?`,
                                confirmText: 'Suspender',
                                variant: 'danger',
                              });
                              if (ok) {
                                try {
                                  await updateTenant({ tenantId: tenant.id as any, status: 'suspended' });
                                  showToast({ title: `${tenant.name} suspendert`, variant: 'warning' });
                                } catch {
                                  showToast({ title: 'Kunne ikke suspendere', variant: 'error' });
                                }
                              }
                            }}
                          >
                            Suspender
                          </Button>
                        )}
                        {tenant.status === 'suspended' && (
                          <Button
                            type="button"
                            variant="secondary"
                            data-size="sm"
                            onClick={async () => {
                              try {
                                await updateTenant({ tenantId: tenant.id as any, status: 'active' });
                                showToast({ title: `${tenant.name} aktivert`, variant: 'success' });
                              } catch {
                                showToast({ title: 'Kunne ikke aktivere', variant: 'error' });
                              }
                            }}
                          >
                            Aktiver
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          data-size="sm"
                          data-color="danger"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Slett utleier',
                              description: `Slett "${tenant.name}" permanent?`,
                              confirmText: 'Slett',
                              variant: 'danger',
                            });
                            if (ok) {
                              try {
                                await deleteTenantMut({ tenantId: tenant.id as any });
                                showToast({ title: `${tenant.name} slettet`, variant: 'success' });
                              } catch {
                                showToast({ title: 'Kunne ikke slette', variant: 'error' });
                              }
                            }
                          }}
                        >
                          Slett
                        </Button>
                      </Stack>
                    </Stack>

                    {/* Row 2: slug + owner */}
                    <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
                      {import.meta.env.VITE_PLATFORM_DOMAIN || 'app.example.com'}/{tenant.slug}
                      {tenant.ownerName
                        ? ` · Eier: ${tenant.ownerName}`
                        : tenant.ownerEmail
                          ? ` · ${tenant.ownerEmail}`
                          : ''}
                    </Paragraph>

                    {/* Row 3: stats */}
                    <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
                      <Stack direction="horizontal" spacing="var(--ds-size-1)" align="center">
                        <ListIcon size={14} style={{ color: 'var(--ds-color-neutral-text-subtle)' }} />
                        <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0 }}>
                          {tenant.listingCount} lokaler
                        </Paragraph>
                      </Stack>
                      {!isMobile && (
                        <Stack direction="horizontal" spacing="var(--ds-size-1)" align="center">
                          <CalendarIcon size={14} style={{ color: 'var(--ds-color-neutral-text-subtle)' }} />
                          <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0 }}>
                            {tenant.createdAt}
                          </Paragraph>
                        </Stack>
                      )}
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <DataTable<TenantRow>
          columns={columns}
          data={filtered}
          getRowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/platform/tenants/${row.slug}`)}
          size="sm"
        />
      )}
    </PageContentLayout>
  );
}
