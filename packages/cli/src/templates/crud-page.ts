/**
 * Templates for CRUD page generation.
 *
 * Generates a full listings-style CRUD page using DS CRUD blocks:
 * CrudStatGrid, CrudListItem, CrudWizard (multi-step form), plus PillTabs,
 * PillDropdown, ActionMenu, FilterToolbar, DashboardPageHeader, DataTable.
 *
 * Pattern identical to dashboard listings.
 */

export interface CrudPageVars {
  pascal: string;
  pascalPlural: string;
  namespace: string;
  routePath: string;
  cssFileName: string;
  app: string;
  columns: string[];
  hasStatusFilter: boolean;
  hasSortFilter: boolean;
  hasSearch: boolean;
  hasStats: boolean;
}

export function generateCrudListPage(v: CrudPageVars): string {
  const statusFilterImports = v.hasStatusFilter ? '\n  StatusTag,' : '';
  const pillImports = [
    v.hasSortFilter ? 'PillDropdown,' : '',
    'PillTabs,',
  ].filter(Boolean).join('\n  ');

  return `/**
 * ${v.pascalPlural} Page
 *
 * CRUD list with search, sort, status filter, view mode toggle (list/table),
 * and row action menu. Uses DS CRUD blocks: CrudListItem, CrudStatGrid.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paragraph,
  Tag,
  DataTable,
  HeaderSearch,
  Stack,
  EmptyState,${statusFilterImports}
  ActionMenu,
  ${pillImports}
  PlusIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  CopyIcon,
  ListIcon,
  TableIcon,
  FilterToolbar,
  DashboardPageHeader,
  PageContentLayout,
  CrudListItem,${v.hasStats ? '\n  CrudStatGrid,' : ''}
  useIsMobile,
} from '@digilist-saas/ds';
import type { DataTableColumn, Action } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';

// =============================================================================
// Types
// =============================================================================

type ${v.pascal}Status = 'active' | 'inactive' | 'archived';
type ViewMode = 'list' | 'table';
type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface ${v.pascal}Row {
  id: string;
  name: string;
  status: ${v.pascal}Status;
  description: string;
  createdAt: string;
}

// =============================================================================
// Demo data — replace with SDK hook
// =============================================================================

const DEMO_DATA: ${v.pascal}Row[] = [
  { id: '1', name: 'Example 1', status: 'active', description: 'First item', createdAt: '2026-01-15' },
  { id: '2', name: 'Example 2', status: 'active', description: 'Second item', createdAt: '2026-02-01' },
];

const STATUS_MAP = {
  active: { color: 'success', label: 'Aktiv' },
  inactive: { color: 'neutral', label: 'Inaktiv' },
  archived: { color: 'warning', label: 'Arkivert' },
} as const;

// =============================================================================
// Component
// =============================================================================

export function ${v.pascalPlural}Page() {
  const t = useT();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // TODO: Replace with SDK hook
  const items = DEMO_DATA;
  const isLoading = false;

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...items];

    if (statusFilter) {
      result = result.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt);
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [items, searchQuery, statusFilter, sortField, sortOrder]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleSearch = useCallback((value: string) => setSearchQuery(value || ''), []);

  // Sort options
  const sortOptions = useMemo(
    () => [
      { value: 'name:asc', label: t('${v.namespace}.sortNameAsc') },
      { value: 'name:desc', label: t('${v.namespace}.sortNameDesc') },
      { value: 'createdAt:desc', label: t('${v.namespace}.sortNewest') },
      { value: 'createdAt:asc', label: t('${v.namespace}.sortOldest') },
    ],
    [t],
  );

  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split(':') as [SortField, SortOrder];
    setSortField(field);
    setSortOrder(order);
  }, []);

  // Status filter options with counts
  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => { counts[item.status] = (counts[item.status] || 0) + 1; });
    return [
      { value: '', label: t('common.all'), count: items.length },
      { value: 'active', label: t('${v.namespace}.statusActive'), count: counts['active'] || 0 },
      { value: 'inactive', label: t('${v.namespace}.statusInactive'), count: counts['inactive'] || 0 },
      { value: 'archived', label: t('${v.namespace}.statusArchived'), count: counts['archived'] || 0 },
    ];
  }, [items, t]);

  // Active filter chips
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string }[] = [];
    if (statusFilter) {
      const opt = statusOptions.find((o) => o.value === statusFilter);
      filters.push({ key: 'status', label: \`\${t('${v.namespace}.columnStatus')}: \${opt?.label || statusFilter}\` });
    }
    if (searchQuery) {
      filters.push({ key: 'search', label: \`\${t('common.search')}: "\${searchQuery}"\` });
    }
    return filters;
  }, [statusFilter, searchQuery, statusOptions, t]);

  const handleRemoveFilter = useCallback((key: string) => {
    if (key === 'status') setStatusFilter('');
    if (key === 'search') { setSearchQuery(''); setSearchValue(''); }
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setStatusFilter('');
    setSearchQuery('');
    setSearchValue('');
  }, []);

  // Row actions
  const getRowActions = useCallback(
    (row: ${v.pascal}Row): Action[] => [
      { label: t('common.view'), icon: <EyeIcon size={16} />, onClick: () => navigate(\`/${v.routePath}/\${row.id}\`) },
      { label: t('common.edit'), icon: <EditIcon size={16} />, onClick: () => navigate(\`/${v.routePath}/\${row.id}/edit\`) },
      { label: t('${v.namespace}.actionDuplicate'), icon: <CopyIcon size={16} />, onClick: () => {} },
      { label: t('common.delete'), icon: <TrashIcon size={16} />, onClick: () => {}, variant: 'danger' as const },
    ],
    [t, navigate],
  );

  // Table columns
  const columns: DataTableColumn<${v.pascal}Row>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('${v.namespace}.columnName'),
        sortable: true,
        render: (row) => (
          <Stack direction="vertical" spacing="var(--ds-size-1)">
            <Paragraph data-size="sm" style={{ fontWeight: 'var(--ds-font-weight-medium, 500)' }}>{row.name}</Paragraph>
          </Stack>
        ),
      },
      {
        id: 'status',
        header: t('${v.namespace}.columnStatus'),
        width: '130px',
        render: (row) => (
          <StatusTag color={STATUS_MAP[row.status].color} size="sm">
            {STATUS_MAP[row.status].label}
          </StatusTag>
        ),
      },
      {
        id: 'createdAt',
        header: t('${v.namespace}.columnCreated'),
        width: '130px',
        sortable: true,
        hideOnMobile: true,
        render: (row) => <Paragraph data-size="sm">{row.createdAt}</Paragraph>,
      },
      {
        id: 'actions',
        header: '',
        width: '60px',
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <ActionMenu actions={getRowActions(row)} />
          </div>
        ),
      },
    ],
    [t, getRowActions],
  );

  // View mode tabs
  const viewTabs = useMemo(
    () => [
      { id: 'list', label: t('${v.namespace}.viewList'), icon: <ListIcon size={18} /> },
      { id: 'table', label: t('${v.namespace}.viewTable'), icon: <TableIcon size={18} /> },
    ],
    [t],
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        subtitle={t('${v.namespace}.subtitle')}
        count={filtered.length}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAllFilters={handleClearAllFilters}
        sticky
      >
        <FilterToolbar variant="flat" aria-label={t('${v.namespace}.filterToolbar')}>
          <FilterToolbar.Start>
            <HeaderSearch
              placeholder={t('${v.namespace}.searchPlaceholder')}
              value={searchValue}
              onSearchChange={handleSearchChange}
              onSearch={handleSearch}
              width="300px"
            />
          </FilterToolbar.Start>
          <FilterToolbar.Center>
            <PillDropdown
              label={t('${v.namespace}.sortLabel')}
              options={sortOptions}
              value={\`\${sortField}:\${sortOrder}\`}
              onChange={handleSortChange}
              size="sm"
            />
            <PillDropdown
              label={t('common.all')}
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              size="sm"
            />
          </FilterToolbar.Center>
          <FilterToolbar.End>
            <PillTabs
              tabs={viewTabs}
              activeTab={viewMode}
              onTabChange={(id) => setViewMode(id as ViewMode)}
              size="sm"
              fullWidth={false}
            />
            <Button type="button" variant="primary" data-size="md" onClick={() => navigate('/${v.routePath}/new')}>
              <PlusIcon />
              {t('${v.namespace}.create')}
            </Button>
          </FilterToolbar.End>
        </FilterToolbar>
      </DashboardPageHeader>

      {isLoading ? (
        <Stack direction="horizontal" justify="center" align="center" style={{ padding: 'var(--ds-size-10)' }}>
          <Paragraph data-size="sm">{t('${v.namespace}.loading')}</Paragraph>
        </Stack>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('${v.namespace}.emptyTitle')}
          description={searchQuery || statusFilter ? t('common.noSearchResults') : t('${v.namespace}.emptyDesc')}
          action={
            (searchQuery || statusFilter) ? (
              <Button type="button" variant="secondary" onClick={handleClearAllFilters}>
                {t('${v.namespace}.clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          {filtered.map((row) => {
            const badge = STATUS_MAP[row.status];
            return (
              <CrudListItem
                key={row.id}
                avatar={<CrudListItem.Avatar initials={row.name.charAt(0)} />}
                title={row.name}
                status={{ color: badge.color, label: badge.label }}
                description={row.description}
                actions={getRowActions(row)}
                onClick={() => navigate(\`/${v.routePath}/\${row.id}\`)}
                footer={
                  !isMobile ? (
                    <Paragraph data-size="xs" data-color="subtle">
                      {t('${v.namespace}.createdOn', { date: row.createdAt })}
                    </Paragraph>
                  ) : undefined
                }
              />
            );
          })}
        </Stack>
      ) : (
        <DataTable<${v.pascal}Row>
          columns={columns}
          data={filtered}
          getRowKey={(row) => row.id}
          onRowClick={(row) => navigate(\`/${v.routePath}/\${row.id}\`)}
          size="sm"
        />
      )}
    </PageContentLayout>
  );
}
`;
}

export function generateCrudFormPage(v: CrudPageVars): string {
  return `/**
 * ${v.pascal} Form Page
 * Create/edit wizard using CrudWizard DS block (multi-step).
 * Steps: General → Settings → Review
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Textfield,
  Field,
  Label,
  Card,
  Heading,
  Paragraph,
  Stack,
  CrudWizard,
  useIsMobile,
} from '@digilist-saas/ds';
import type { CrudWizardStep } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';

// =============================================================================
// Types
// =============================================================================

type WizardStep = 'general' | 'settings' | 'review';

interface ${v.pascal}FormData {
  name: string;
  description: string;
  // TODO: Add entity-specific fields
}

const EMPTY_FORM: ${v.pascal}FormData = {
  name: '',
  description: '',
};

// =============================================================================
// Component
// =============================================================================

export function ${v.pascal}FormPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const isMobile = useIsMobile();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('general');

  // Form state
  const [form, setForm] = useState<${v.pascal}FormData>(EMPTY_FORM);
  const [formInitialized, setFormInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // TODO: Load existing data with SDK hook when editing
  useEffect(() => {
    if (!isEdit || formInitialized) return;
    // TODO: Pre-fill form from SDK data
    setFormInitialized(true);
  }, [isEdit, formInitialized]);

  const updateField = useCallback(<K extends keyof ${v.pascal}FormData>(key: K, value: ${v.pascal}FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canSave = useMemo(() => {
    return form.name.trim().length >= 2;
  }, [form.name]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      // TODO: Call SDK mutation (create or update)
      navigate('/${v.routePath}');
    } finally {
      setIsSaving(false);
    }
  }, [canSave, navigate]);

  // Wizard steps
  const steps: CrudWizardStep[] = useMemo(() => [
    { id: 'general', label: t('${v.namespace}.stepGeneral') },
    { id: 'settings', label: t('${v.namespace}.stepSettings') },
    { id: 'review', label: t('${v.namespace}.stepReview') },
  ], [t]);

  const title = isEdit
    ? t('${v.namespace}.editTitle')
    : t('${v.namespace}.createTitle');

  const subtitle = isEdit
    ? t('${v.namespace}.editSubtitle')
    : t('${v.namespace}.createSubtitle');

  return (
    <CrudWizard
      title={title}
      subtitle={subtitle}
      backHref="/${v.routePath}"
      backLabel={t('common.back')}
      steps={steps}
      currentStep={currentStep}
      onStepChange={(stepId) => setCurrentStep(stepId as WizardStep)}
      onSave={handleSave}
      isSaving={isSaving}
      canSave={canSave}
      saveLabel={isEdit ? t('common.save') : t('${v.namespace}.create')}
      savingLabel={t('common.saving')}
      backStepLabel={t('common.back')}
      nextLabel={t('common.next')}
      cancelLabel={t('common.cancel')}
      onCancel={() => navigate('/${v.routePath}')}
      compact={isMobile}
      maxWidth="720px"
    >
      {(step) => {
        {/* ── Step 1: General ── */}
        if (step === 'general') {
          return (
            <Card data-color="neutral">
              <Stack direction="vertical" spacing="var(--ds-size-5)">
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Heading level={2} data-size="sm">{t('${v.namespace}.stepGeneral')}</Heading>
                  <Paragraph data-size="sm" data-color="subtle">{t('${v.namespace}.stepGeneralDesc')}</Paragraph>
                </Stack>

                <Textfield
                  label={t('${v.namespace}.columnName')}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />

                <Field>
                  <Label>{t('${v.namespace}.descriptionLabel')}</Label>
                  <Textfield
                    aria-label={t('${v.namespace}.descriptionLabel')}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    multiline
                    rows={3}
                  />
                </Field>
              </Stack>
            </Card>
          );
        }

        {/* ── Step 2: Settings ── */}
        if (step === 'settings') {
          return (
            <Card data-color="neutral">
              <Stack direction="vertical" spacing="var(--ds-size-5)">
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Heading level={2} data-size="sm">{t('${v.namespace}.stepSettings')}</Heading>
                  <Paragraph data-size="sm" data-color="subtle">{t('${v.namespace}.stepSettingsDesc')}</Paragraph>
                </Stack>

                {/* TODO: Add entity-specific settings fields */}
              </Stack>
            </Card>
          );
        }

        {/* ── Step 3: Review ── */}
        if (step === 'review') {
          return (
            <Card data-color="neutral">
              <Stack direction="vertical" spacing="var(--ds-size-5)">
                <Stack direction="vertical" spacing="var(--ds-size-1)">
                  <Heading level={2} data-size="sm">{t('${v.namespace}.stepReview')}</Heading>
                  <Paragraph data-size="sm" data-color="subtle">{t('${v.namespace}.stepReviewDesc')}</Paragraph>
                </Stack>

                <Card data-color="neutral" style={{ background: 'var(--ds-color-neutral-surface-hover)' }}>
                  <Stack direction="vertical" spacing="var(--ds-size-3)">
                    <Heading level={3} data-size="2xs">{t('${v.namespace}.stepGeneral')}</Heading>
                    <ReviewRow label={t('${v.namespace}.columnName')} value={form.name || '\\u2013'} />
                    <ReviewRow label={t('${v.namespace}.descriptionLabel')} value={form.description || '\\u2013'} />
                  </Stack>
                </Card>
              </Stack>
            </Card>
          );
        }

        return null;
      }}
    </CrudWizard>
  );
}

// =============================================================================
// ReviewRow — summary helper for the review step
// =============================================================================

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Paragraph data-size="sm">
      <span style={{ fontWeight: 'var(--ds-font-weight-medium, 500)' }}>{label}:</span>{' '}
      {value}
    </Paragraph>
  );
}
`;
}

export function generateCrudListCSS(): string {
  return `/* CRUD list page — list item styles handled by CrudListItem DS block */
`;
}

export function generateCrudFormCSS(): string {
  return `/* CRUD form page — layout handled by CrudWizard DS block */
`;
}

export function generateCrudI18nKeys(
  namespace: string,
  entityName: string,
): string {
  const entityPlural = entityName + 's'; // simplified; CLI uses pluralize()
  const lines = [`"${namespace}": {`];
  lines.push(`  "title": "${entityPlural.charAt(0).toUpperCase() + entityPlural.slice(1)}",`);
  lines.push(`  "subtitle": "Administrer ${entityPlural}.",`);
  lines.push(`  "loading": "Laster...",`);
  lines.push(`  "searchPlaceholder": "Sok ${entityPlural}...",`);
  lines.push(`  "filterToolbar": "Filtrer ${entityPlural}",`);
  lines.push(`  "create": "Ny ${entityName}",`);
  lines.push(`  "emptyTitle": "Ingen ${entityPlural}",`);
  lines.push(`  "emptyDesc": "Kom i gang ved aa opprette en.",`);
  lines.push(`  "clearFilters": "Fjern filtre",`);
  lines.push(`  "columnName": "Navn",`);
  lines.push(`  "columnStatus": "Status",`);
  lines.push(`  "columnCreated": "Opprettet",`);
  lines.push(`  "sortLabel": "Sortering",`);
  lines.push(`  "sortNameAsc": "Navn A-AA",`);
  lines.push(`  "sortNameDesc": "Navn AA-A",`);
  lines.push(`  "sortNewest": "Nyeste forst",`);
  lines.push(`  "sortOldest": "Eldste forst",`);
  lines.push(`  "statusActive": "Aktiv",`);
  lines.push(`  "statusInactive": "Inaktiv",`);
  lines.push(`  "statusArchived": "Arkivert",`);
  lines.push(`  "viewList": "Liste",`);
  lines.push(`  "viewTable": "Tabell",`);
  lines.push(`  "actionDuplicate": "Dupliser",`);
  lines.push(`  "createdOn": "Opprettet {{date}}",`);
  lines.push(`  "sectionGeneral": "Generelt",`);
  lines.push(`  "descriptionLabel": "Beskrivelse",`);
  lines.push(`  "stepGeneral": "Generelt",`);
  lines.push(`  "stepGeneralDesc": "Grunnleggende informasjon.",`);
  lines.push(`  "stepSettings": "Innstillinger",`);
  lines.push(`  "stepSettingsDesc": "Tilleggsinnstillinger.",`);
  lines.push(`  "stepReview": "Oppsummering",`);
  lines.push(`  "stepReviewDesc": "Gaa gjennom og bekreft.",`);
  lines.push(`  "createTitle": "Opprett ${entityName}",`);
  lines.push(`  "createSubtitle": "Fyll ut skjemaet for aa opprette.",`);
  lines.push(`  "editTitle": "Rediger ${entityName}",`);
  lines.push(`  "editSubtitle": "Oppdater informasjonen."`);
  lines.push('}');
  return lines.join('\n');
}
