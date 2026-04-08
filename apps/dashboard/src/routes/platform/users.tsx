/**
 * Users Page — SaaS Platform Admin
 *
 * Platform-level user management. Same layout as tenants page:
 * live search with dropdown, filters, list/table toggle, action menu.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paragraph,
  Tag,
  Card,
  DataTable,
  HeaderSearch,
  Stack,
  EmptyState,
  StatusTag,
  ActionMenu,
  PillTabs,
  PillDropdown,
  Textfield,
  Drawer,
  DrawerSection,
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  UsersIcon,
  ListIcon,
  TableIcon,
  ShieldCheckIcon,
  CalendarIcon,
  Spinner,
  FilterToolbar,
  DashboardPageHeader,
  PageContentLayout,
  CrudStatGrid,
  useIsMobile,
  useDialog,
  useToast,
} from '@digilist-saas/ds';
import type { DataTableColumn, Action } from '@digilist-saas/ds';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';

// =============================================================================
// Types & Constants
// =============================================================================

type UserStatus = 'active' | 'inactive' | 'suspended';
type ViewMode = 'list' | 'table';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant: string;
  status: UserStatus;
  lastActive: string;
}

const STATUS_MAP: Record<UserStatus, { color: 'success' | 'neutral' | 'danger'; label: string }> = {
  active: { color: 'success', label: 'Aktiv' },
  inactive: { color: 'neutral', label: 'Inaktiv' },
  suspended: { color: 'danger', label: 'Suspendert' },
};

const ROLE_COLOR: Record<string, string> = {
  SuperAdmin: 'danger',
  Eier: 'accent',
  Admin: 'accent',
  Saksbehandler: 'neutral',
};

// =============================================================================
// Component
// =============================================================================

export function UsersPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { confirm } = useDialog();
  const { showToast } = useToast();
  const updateUser = useMutation(api.domain.platformAdmin.updateUser);
  const deleteUserMut = useMutation(api.domain.platformAdmin.deleteUser);
  const inviteUserMut = useMutation(api.domain.platformAdmin.inviteUser);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Live data
  const rawUsers = useQuery(api.domain.platformAdmin.listAllUsers, {});
  const isLoading = rawUsers === undefined;

  const users: UserRow[] = useMemo(() => (rawUsers ?? []).map((u: any) => ({
    id: u.id,
    name: u.name || u.email || 'Ukjent',
    email: u.email || '',
    role: u.role === 'super_admin' ? 'SuperAdmin' : u.role === 'owner' ? 'Eier' : u.role === 'admin' ? 'Admin' : u.role === 'saksbehandler' ? 'Saksbehandler' : 'Bruker',
    tenant: u.tenantName || 'Plattform',
    status: (u.status || 'active') as UserStatus,
    lastActive: u.lastActive || '–',
  })), [rawUsers]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...users];
    if (statusFilter) result = result.filter((u) => u.status === statusFilter);
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.tenant.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const cmp = sortField === 'name' ? a.name.localeCompare(b.name) : a.lastActive.localeCompare(b.lastActive);
      return sortOrder === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [users, searchQuery, statusFilter, roleFilter, sortField, sortOrder]);

  // Search results dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        label: u.name,
        description: u.email,
        meta: `${u.role} · ${u.tenant}`,
      }));
  }, [searchQuery, users]);

  // Filter options
  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.status] = (counts[u.status] || 0) + 1; });
    return [
      { value: '', label: 'Alle', count: users.length },
      { value: 'active', label: 'Aktiv', count: counts['active'] || 0 },
      { value: 'inactive', label: 'Inaktiv', count: counts['inactive'] || 0 },
      { value: 'suspended', label: 'Suspendert', count: counts['suspended'] || 0 },
    ];
  }, [users]);

  const roleOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] || 0) + 1; });
    return [
      { value: '', label: 'Alle roller', count: users.length },
      ...Object.entries(counts).map(([role, count]) => ({ value: role, label: role, count })),
    ];
  }, [users]);

  const activeFilters = useMemo(() => {
    const f: { key: string; label: string }[] = [];
    if (statusFilter) f.push({ key: 'status', label: `Status: ${STATUS_MAP[statusFilter as UserStatus]?.label || statusFilter}` });
    if (roleFilter) f.push({ key: 'role', label: `Rolle: ${roleFilter}` });
    return f;
  }, [statusFilter, roleFilter]);

  // Actions
  const getUserActions = useCallback((user: UserRow): Action[] => {
    const actions: Action[] = [
      { label: 'Vis detaljer', icon: <EyeIcon size={16} />, onClick: () => navigate(`/platform/users/${user.id}`) },
      { label: 'Rediger', icon: <EditIcon size={16} />, onClick: () => navigate(`/platform/users/${user.id}/edit`) },
    ];
    if (user.status === 'active') {
      actions.push({ label: 'Suspender', icon: <ShieldCheckIcon size={16} />, onClick: async () => {
        const ok = await confirm({ title: 'Suspender bruker', description: `Suspender "${user.name}"?`, confirmText: 'Suspender', variant: 'danger' });
        if (ok) {
          try { await updateUser({ userId: user.id as any, status: 'suspended' }); showToast({ title: `${user.name} suspendert`, variant: 'warning' }); }
          catch { showToast({ title: 'Kunne ikke suspendere', variant: 'error' }); }
        }
      }, variant: 'danger' });
    }
    actions.push({ label: 'Slett', icon: <TrashIcon size={16} />, onClick: async () => {
      const ok = await confirm({ title: 'Slett bruker', description: `Slett "${user.name}" permanent?`, confirmText: 'Slett', variant: 'danger' });
      if (ok) {
        try { await deleteUserMut({ userId: user.id as any }); showToast({ title: `${user.name} slettet`, variant: 'success' }); }
        catch { showToast({ title: 'Kunne ikke slette', variant: 'error' }); }
      }
    }, variant: 'danger' });
    return actions;
  }, [navigate, confirm, showToast, updateUser, deleteUserMut]);

  // Table columns
  const columns: DataTableColumn<UserRow>[] = useMemo(() => [
    {
      id: 'name', header: 'Bruker', sortable: true,
      render: (row) => (
        <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ds-color-accent-surface-default)', color: 'var(--ds-color-accent-base-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
            {row.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <Stack direction="vertical" spacing="0">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>{row.name}</Paragraph>
            <Paragraph data-size="xs" data-color="subtle" style={{ margin: 0 }}>{row.email}</Paragraph>
          </Stack>
        </Stack>
      ),
    },
    {
      id: 'role', header: 'Rolle', width: '130px',
      render: (row) => <Tag data-size="sm" data-color={(ROLE_COLOR[row.role] ?? 'neutral') as any}>{row.role}</Tag>,
    },
    {
      id: 'tenant', header: 'Utleier', width: '160px',
      render: (row) => <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>{row.tenant}</Paragraph>,
    },
    {
      id: 'status', header: 'Status', width: '100px',
      render: (row) => { const s = STATUS_MAP[row.status] ?? { color: 'neutral' as const, label: row.status || 'Ukjent' }; return <StatusTag color={s.color} size="sm">{s.label}</StatusTag>; },
    },
    {
      id: 'lastActive', header: 'Sist aktiv', width: '120px', sortable: true, hideOnMobile: true,
      render: (row) => <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>{row.lastActive}</Paragraph>,
    },
    {
      id: 'actions', header: '', width: '220px',
      render: (row) => (
        <Stack direction="horizontal" spacing="var(--ds-size-1)" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="secondary" data-size="sm" onClick={() => navigate(`/platform/users/${row.id}`)}>Vis</Button>
          <Button type="button" variant="secondary" data-size="sm" onClick={() => navigate(`/platform/users/${row.id}/edit`)}>Rediger</Button>
          <Button type="button" variant="secondary" data-size="sm" data-color="danger" onClick={async () => {
            const ok = await confirm({ title: 'Slett bruker', description: `Slett "${row.name}" permanent?`, confirmText: 'Slett', variant: 'danger' });
            if (ok) {
              try { await deleteUserMut({ userId: row.id as any }); showToast({ title: `${row.name} slettet`, variant: 'success' }); }
              catch { showToast({ title: 'Kunne ikke slette', variant: 'error' }); }
            }
          }}>Slett</Button>
        </Stack>
      ),
    },
  ], [getUserActions]);

  // Stats
  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === 'active').length;
    const owners = users.filter((u) => u.role === 'Eier' || u.role === 'SuperAdmin').length;
    return [
      { icon: <UsersIcon />, label: 'Totalt', value: users.length, variant: 'accent' as const },
      { icon: <UsersIcon />, label: 'Aktive', value: active, variant: 'success' as const },
      { icon: <ShieldCheckIcon />, label: 'Eiere / Admins', value: owners, variant: 'neutral' as const },
    ];
  }, [users]);

  return (
    <PageContentLayout>
      <DashboardPageHeader
        count={filtered.length}
        sticky
      >
        <FilterToolbar variant="flat" aria-label="Brukerfilter">
          <FilterToolbar.Start>
            <HeaderSearch
              placeholder="Sok etter bruker, e-post eller utleier..."
              value={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={setSearchQuery}
              results={searchResults}
              onResultSelect={(r) => navigate(`/platform/users/${r.id}`)}
              noResultsText="Ingen brukere funnet"
              width={isMobile ? '100%' : '400px'}
            />
          </FilterToolbar.Start>
          <FilterToolbar.Center>
            <PillDropdown
              label="Sorter"
              options={[
                { value: 'name:asc', label: 'Navn A-A' },
                { value: 'name:desc', label: 'Navn A-A' },
                { value: 'lastActive:desc', label: 'Sist aktiv' },
              ]}
              value={`${sortField}:${sortOrder}`}
              onChange={(v) => { const [f, o] = v.split(':'); setSortField(f); setSortOrder(o as 'asc' | 'desc'); }}
              size="md"
            />
            <PillDropdown label="Status" options={statusOptions} value={statusFilter} onChange={setStatusFilter} size="md" />
            <PillDropdown label="Rolle" options={roleOptions} value={roleFilter} onChange={setRoleFilter} size="md" />
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
            <Button type="button" variant="primary" data-size="lg" onClick={() => setInviteOpen(true)}>
              <PlusIcon size={18} /> Inviter bruker
            </Button>
          </FilterToolbar.End>
        </FilterToolbar>
      </DashboardPageHeader>

      <CrudStatGrid stats={stats} />

      {isLoading ? (
        <Stack direction="horizontal" justify="center" style={{ padding: 'var(--ds-size-10)' }}>
          <Spinner aria-label="Laster brukere..." />
        </Stack>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ingen brukere funnet"
          description={searchQuery || statusFilter || roleFilter ? 'Prov a endre sok eller filtre.' : 'Ingen brukere registrert enna.'}
          action={(searchQuery || statusFilter || roleFilter) ? (
            <Button type="button" variant="secondary" onClick={() => { setStatusFilter(''); setRoleFilter(''); setSearchQuery(''); }}>Fjern alle filtre</Button>
          ) : undefined}
        />
      ) : viewMode === 'list' ? (
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          {filtered.map((user) => {
            const badge = STATUS_MAP[user.status] ?? { color: 'neutral' as const, label: user.status || 'Ukjent' };
            return (
              <Card
                key={user.id}
                style={{ cursor: 'pointer', border: '1px solid var(--ds-color-neutral-border-default)', overflow: 'visible' }}
                onClick={() => navigate(`/platform/users/${user.id}`)}
              >
                <Stack direction="horizontal" spacing="var(--ds-size-4)" align="start">
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ds-color-accent-surface-default)', color: 'var(--ds-color-accent-base-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1rem', flexShrink: 0 }}>
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Content */}
                  <Stack direction="vertical" spacing="var(--ds-size-2)" style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: name + badges + actions */}
                    <Stack direction="horizontal" justify="between" align="center">
                      <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center" style={{ flexWrap: 'wrap' }}>
                        <Paragraph data-size="md" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>{user.name}</Paragraph>
                        <StatusTag color={badge.color} size="sm">{badge.label}</StatusTag>
                        <Tag data-size="sm" data-color={(ROLE_COLOR[user.role] ?? 'neutral') as any}>{user.role}</Tag>
                      </Stack>
                      <Stack direction="horizontal" spacing="var(--ds-size-2)" onClick={(e) => e.stopPropagation()}>
                        <Button type="button" variant="secondary" data-size="sm" onClick={() => navigate(`/platform/users/${user.id}`)}>Vis</Button>
                        <Button type="button" variant="secondary" data-size="sm" onClick={() => navigate(`/platform/users/${user.id}/edit`)}>Rediger</Button>
                        {user.status === 'active' && (
                          <Button type="button" variant="secondary" data-size="sm" data-color="danger" onClick={async () => {
                            const ok = await confirm({ title: 'Suspender bruker', description: `Suspender "${user.name}"?`, confirmText: 'Suspender', variant: 'danger' });
                            if (ok) {
                              try { await updateUser({ userId: user.id as any, status: 'suspended' }); showToast({ title: `${user.name} suspendert`, variant: 'warning' }); }
                              catch { showToast({ title: 'Kunne ikke suspendere', variant: 'error' }); }
                            }
                          }}>Suspender</Button>
                        )}
                        {(user.status === 'suspended' || user.status === 'inactive') && (
                          <Button type="button" variant="secondary" data-size="sm" onClick={async () => {
                            try { await updateUser({ userId: user.id as any, status: 'active' }); showToast({ title: `${user.name} aktivert`, variant: 'success' }); }
                            catch { showToast({ title: 'Kunne ikke aktivere', variant: 'error' }); }
                          }}>Aktiver</Button>
                        )}
                        <Button type="button" variant="secondary" data-size="sm" data-color="danger" onClick={async () => {
                          const ok = await confirm({ title: 'Slett bruker', description: `Slett "${user.name}" permanent?`, confirmText: 'Slett', variant: 'danger' });
                          if (ok) {
                            try { await deleteUserMut({ userId: user.id as any }); showToast({ title: `${user.name} slettet`, variant: 'success' }); }
                            catch { showToast({ title: 'Kunne ikke slette', variant: 'error' }); }
                          }
                        }}>Slett</Button>
                      </Stack>
                    </Stack>

                    {/* Row 2: email + tenant */}
                    <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>
                      {user.email}{user.tenant !== 'Plattform' ? ` · ${user.tenant}` : ''}
                    </Paragraph>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <DataTable<UserRow>
          columns={columns}
          data={filtered}
          getRowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/platform/users/${row.id}`)}
          size="sm"
        />
      )}
      {/* Invite user drawer */}
      <Drawer
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteForm({ name: '', email: '', phone: '', role: 'user' }); }}
        position="right"
        size="lg"
        title="Inviter bruker"
        icon={<PlusIcon size={20} />}
        overlay
        footer={
          <Stack direction="horizontal" spacing="var(--ds-size-3)">
            <Button type="button" variant="secondary" style={{ flex: 1 }} onClick={() => setInviteOpen(false)} disabled={inviting}>
              Avbryt
            </Button>
            <Button
              type="button"
              variant="primary"
              style={{ flex: 1 }}
              disabled={!inviteForm.email.includes('@') || inviting}
              onClick={async () => {
                setInviting(true);
                try {
                  await inviteUserMut({
                    name: inviteForm.name.trim() || undefined,
                    email: inviteForm.email.trim(),
                    phone: inviteForm.phone?.trim() || undefined,
                    role: inviteForm.role,
                  });
                  showToast({ title: `Invitasjon sendt til ${inviteForm.email}`, variant: 'success' });
                  setInviteOpen(false);
                  setInviteForm({ name: '', email: '', phone: '', role: 'user' });
                } catch {
                  showToast({ title: 'Kunne ikke sende invitasjon', variant: 'error' });
                } finally { setInviting(false); }
              }}
            >
              {inviting ? 'Sender...' : 'Send invitasjon'}
            </Button>
          </Stack>
        }
      >
        <DrawerSection title="Ny bruker" description="Brukeren mottar en invitasjon per e-post med lenke for a opprette konto.">
          <Stack spacing="var(--ds-size-4)">
            <Textfield label="Navn" value={inviteForm.name} onChange={(e) => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Ola Nordmann" data-size="sm" />
            <Textfield label="E-post" type="email" value={inviteForm.email} onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="ola@eksempel.no" required data-size="sm" />
            <Textfield label="Telefon (valgfritt)" type="tel" value={inviteForm.phone ?? ''} onChange={(e) => setInviteForm(p => ({ ...p, phone: e.target.value }))} placeholder="+47 123 45 678" data-size="sm" />
            <Stack direction="vertical" spacing="var(--ds-size-2)">
              <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)', margin: 0 }}>Rolle</Paragraph>
              <PillDropdown
                label={{ user: 'Bruker', owner: 'Eier (utleier)', admin: 'Admin', super_admin: 'Plattformadmin' }[inviteForm.role] || 'Velg rolle'}
                value={inviteForm.role}
                onChange={(val) => setInviteForm(p => ({ ...p, role: val }))}
                options={[
                  { value: 'user', label: 'Bruker' },
                  { value: 'owner', label: 'Eier (utleier)' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'super_admin', label: 'Plattformadmin' },
                ]}
                ariaLabel="Rolle"
                size="md"
              />
            </Stack>
          </Stack>
        </DrawerSection>
      </Drawer>

    </PageContentLayout>
  );
}
