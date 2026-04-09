import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digipicks/i18n';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
  Grid,
  DataTable,
  DashboardPageHeader,
  PageContentLayout,
  PillDropdown,
  FilterToolbar,
  HeaderSearch,
  PlusIcon,
  EditIcon,
  CopyIcon,
  TrashIcon,
  CheckCircleIcon,
  ChartIcon,
  CalendarIcon,
  Dropdown,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusTag,
  IconBox,
  formatTimeAgo,
  useToast,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import {
  useFormDefinitions as useFormDefinitionsQuery,
  useCreateFormDefinition,
  useDeleteFormDefinition,
} from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './form-builder.module.css';

// ─────────────────────────── Constants ───────────────────────────

type BadgeColor = 'info' | 'warning' | 'success' | 'neutral';

// ─────────────────────────── Types ───────────────────────────

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  validation?: { min?: number; max?: number; pattern?: string };
}

interface FormDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: FormField[];
  isPublished: boolean;
  submissionCount: number;
  lastModified: string; // ISO string for formatTimeAgo
  createdAt: string;
  successMessage?: string;
}

type ActiveView = 'all' | 'booking' | 'application' | 'feedback' | 'registration' | 'survey';

// ─────────────────────────── Component ───────────────────────────

export function FormBuilderPage() {
  const t = useT();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const FORM_CATEGORIES = useMemo(
    () =>
      [
        { id: 'all', label: t('formBuilder.allForms') },
        { id: 'booking', label: t('formBuilder.categoryBooking') },
        { id: 'application', label: t('formBuilder.categoryApplication') },
        { id: 'feedback', label: t('formBuilder.categoryFeedback') },
        { id: 'registration', label: t('formBuilder.categoryRegistration') },
        { id: 'survey', label: t('formBuilder.categorySurvey') },
      ] as const,
    [t],
  );

  const categoryMeta: Record<string, { label: string; statusColor: BadgeColor }> = useMemo(
    () => ({
      booking: { label: t('formBuilder.categoryBooking'), statusColor: 'info' },
      application: { label: t('formBuilder.categoryApplication'), statusColor: 'warning' },
      feedback: { label: t('formBuilder.categoryFeedback'), statusColor: 'success' },
      registration: { label: t('formBuilder.categoryRegistration'), statusColor: 'neutral' },
      survey: { label: t('formBuilder.categorySurvey'), statusColor: 'info' },
    }),
    [t],
  );
  const { user } = useAuthBridge();

  // View state
  const [activeView, setActiveView] = useState<ActiveView>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSort, setSelectedSort] = useState<string>('date-desc');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch from Convex via SDK hook (tenantId resolved from session)
  const { forms: rawForms, isLoading, error } = useFormDefinitionsQuery();
  const forms: FormDefinition[] = useMemo(
    () =>
      rawForms.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description ?? '',
        category: f.category,
        fields: f.fields,
        isPublished: f.isPublished,
        submissionCount: f.submissionCount ?? 0,
        lastModified: f.lastModified ? new Date(f.lastModified).toISOString() : f.createdAt,
        createdAt: f.createdAt,
        successMessage: f.successMessage,
      })),
    [rawForms],
  );

  // ─── Dropdown options ───
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: forms.length };
    for (const f of forms) counts[f.category] = (counts[f.category] ?? 0) + 1;
    return counts;
  }, [forms]);

  const categoryDropdownOptions = useMemo(
    () =>
      FORM_CATEGORIES.map((cat) => ({
        value: cat.id,
        label: `${cat.label} (${categoryCounts[cat.id] ?? 0})`,
      })),
    [FORM_CATEGORIES, categoryCounts],
  );

  const currentCategoryLabel = useMemo(() => {
    const match = FORM_CATEGORIES.find((c) => c.id === activeView);
    const count = categoryCounts[activeView] ?? 0;
    return match ? `${match.label} (${count})` : t('formBuilder.allForms');
  }, [activeView, FORM_CATEGORIES, categoryCounts, t]);

  const statusDropdownOptions = useMemo(
    () => [
      { value: 'all', label: `${t('formBuilder.statusAll')} (${forms.length})` },
      { value: 'published', label: `${t('formBuilder.published')} (${forms.filter((f) => f.isPublished).length})` },
      { value: 'draft', label: `${t('formBuilder.draft')} (${forms.filter((f) => !f.isPublished).length})` },
    ],
    [t, forms],
  );

  const currentStatusLabel = useMemo(() => {
    const match = statusDropdownOptions.find((o) => o.value === selectedStatus);
    return match?.label ?? t('formBuilder.statusAll');
  }, [selectedStatus, statusDropdownOptions, t]);

  const sortDropdownOptions = useMemo(
    () => [
      { value: 'date-desc', label: t('formBuilder.sortNewest') },
      { value: 'date-asc', label: t('formBuilder.sortOldest') },
      { value: 'name', label: t('formBuilder.sortName') },
      { value: 'submissions', label: t('formBuilder.sortSubmissions') },
    ],
    [t],
  );

  const currentSortLabel = useMemo(() => {
    const match = sortDropdownOptions.find((o) => o.value === selectedSort);
    return match?.label ?? t('formBuilder.sortNewest');
  }, [selectedSort, sortDropdownOptions, t]);

  // ─── Filtering + Sorting ───
  const filteredForms = useMemo(() => {
    let result = forms;
    if (activeView !== 'all') result = result.filter((f) => f.category === activeView);
    if (selectedStatus === 'published') result = result.filter((f) => f.isPublished);
    else if (selectedStatus === 'draft') result = result.filter((f) => !f.isPublished);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
    }
    // Sort
    result = [...result].sort((a, b) => {
      switch (selectedSort) {
        case 'date-asc':
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case 'name':
          return a.name.localeCompare(b.name, 'nb');
        case 'submissions':
          return (b.submissionCount ?? 0) - (a.submissionCount ?? 0);
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
    return result;
  }, [forms, activeView, selectedStatus, searchQuery, selectedSort]);

  // ─── Stats ───
  const stats = useMemo(
    () => ({
      total: forms.length,
      published: forms.filter((f) => f.isPublished).length,
      totalSubmissions: forms.reduce((sum, f) => sum + (f.submissionCount ?? 0), 0),
      totalFields: forms.reduce((sum, f) => sum + (f.fields?.length ?? 0), 0),
    }),
    [forms],
  );

  // ─── Handlers — navigate to wizard routes ───
  const handleNewForm = useCallback(() => {
    navigate('/form-builder/new');
  }, [navigate]);

  const handleEditForm = useCallback(
    (form: FormDefinition) => {
      navigate(`/form-builder/${form.id}`);
    },
    [navigate],
  );

  const { createFormDefinition } = useCreateFormDefinition();
  const { deleteFormDefinition } = useDeleteFormDefinition();

  const handleDuplicate = useCallback(
    async (form: FormDefinition) => {
      const tenantId = user?.tenantId;
      if (!tenantId) return;
      try {
        const result = await createFormDefinition({
          tenantId,
          name: `${form.name} ${t('formBuilder.duplicateSuffix')}`,
          description: form.description,
          category: form.category,
          fields: form.fields,
          isPublished: false,
          successMessage: form.successMessage,
        });
        navigate(`/form-builder/${result.id}`);
      } catch (err) {
        showToast({ title: t('common.duplicateError'), variant: 'error' });
      }
    },
    [user, createFormDefinition, navigate, showToast, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFormDefinition(id);
      } catch (err) {
        showToast({ title: t('common.deleteError'), variant: 'error' });
      }
    },
    [deleteFormDefinition, showToast, t],
  );

  const handleViewSubmissions = useCallback(
    (formId: string) => {
      navigate(`/form-builder/${formId}?tab=submissions`);
    },
    [navigate],
  );

  // ─── Table Columns ───
  const columns: DataTableColumn<FormDefinition>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('formBuilder.columnName'),
        render: (row) => (
          <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
            <IconBox icon={<EditIcon />} variant={row.isPublished ? 'accent' : 'neutral'} size="sm" />
            <Stack direction="vertical" spacing="0">
              <Paragraph data-size="sm" className={styles.cellTitle}>
                {row.name}
              </Paragraph>
              <Paragraph data-size="xs" className={styles.cellSubtle}>
                {row.description?.slice(0, 50)}
                {(row.description?.length ?? 0) > 50 ? '...' : ''}
              </Paragraph>
            </Stack>
          </Stack>
        ),
        align: 'left',
      },
      {
        id: 'category',
        header: t('formBuilder.columnCategory'),
        render: (row) => {
          const meta = categoryMeta[row.category];
          return meta ? (
            <StatusTag color={meta.statusColor} size="sm">
              {meta.label}
            </StatusTag>
          ) : (
            <StatusTag color="neutral" size="sm">
              {row.category}
            </StatusTag>
          );
        },
        align: 'left',
      },
      {
        id: 'fields',
        header: t('formBuilder.columnFields'),
        render: (row) => (
          <Paragraph data-size="sm" className={styles.cellTabular}>
            {row.fields?.length ?? 0}
          </Paragraph>
        ),
        align: 'right',
      },
      {
        id: 'status',
        header: t('formBuilder.columnStatus'),
        render: (row) => (
          <StatusTag color={row.isPublished ? 'success' : 'warning'} size="sm">
            {row.isPublished ? t('formBuilder.published') : t('formBuilder.draft')}
          </StatusTag>
        ),
        align: 'center',
      },
      {
        id: 'submissions',
        header: t('formBuilder.columnSubmissions'),
        render: (row) => (
          <Button variant="tertiary" data-size="sm" onClick={() => handleViewSubmissions(row.id)}>
            {(row.submissionCount ?? 0).toLocaleString('nb-NO')}
          </Button>
        ),
        align: 'right',
      },
      {
        id: 'lastModified',
        header: t('formBuilder.columnLastModified'),
        render: (row) => (
          <Paragraph data-size="xs" className={styles.cellSubtle}>
            {formatTimeAgo(row.lastModified)}
          </Paragraph>
        ),
        align: 'right',
      },
      {
        id: 'actions',
        header: '',
        width: '120px',
        render: (row) => (
          <Dropdown.TriggerContext>
            <Dropdown.Trigger
              aria-label={t('common.actions')}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              data-size="sm"
              variant="secondary"
            >
              {t('common.actions')}
            </Dropdown.Trigger>
            <Dropdown placement="bottom-end">
              <Dropdown.List>
                <Dropdown.Item>
                  <Dropdown.Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleEditForm(row);
                    }}
                  >
                    <EditIcon /> {t('formBuilder.actionEdit')}
                  </Dropdown.Button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Dropdown.Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDuplicate(row);
                    }}
                  >
                    <CopyIcon /> {t('formBuilder.actionDuplicate')}
                  </Dropdown.Button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Dropdown.Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleViewSubmissions(row.id);
                    }}
                  >
                    <ChartIcon /> {t('formBuilder.actionSubmissions')} ({row.submissionCount ?? 0})
                  </Dropdown.Button>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Dropdown.Button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDelete(row.id);
                    }}
                  >
                    <TrashIcon /> {t('formBuilder.actionDelete')}
                  </Dropdown.Button>
                </Dropdown.Item>
              </Dropdown.List>
            </Dropdown>
          </Dropdown.TriggerContext>
        ),
        align: 'right',
      },
    ],
    [t, handleEditForm, handleDuplicate, handleViewSubmissions, handleDelete],
  );

  // ─────────────────────────── Render ───────────────────────────

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('formBuilder.title')}
        subtitle={t('formBuilder.subtitle')}
        actions={
          <Button data-size="sm" onClick={handleNewForm}>
            <PlusIcon />
            {t('formBuilder.newForm')}
          </Button>
        }
      />

      {/* ─── KPI Stats ─── */}
      <Grid columns="repeat(4, 1fr)" gap="var(--ds-size-4)">
        {[
          { icon: <EditIcon />, label: t('formBuilder.totalForms'), value: stats.total, variant: 'accent' as const },
          {
            icon: <CheckCircleIcon />,
            label: t('formBuilder.publishedForms'),
            value: stats.published,
            variant: 'success' as const,
          },
          {
            icon: <ChartIcon />,
            label: t('formBuilder.totalSubmissions'),
            value: stats.totalSubmissions,
            variant: 'warning' as const,
          },
          {
            icon: <CalendarIcon />,
            label: t('formBuilder.totalFields'),
            value: stats.totalFields,
            variant: 'neutral' as const,
          },
        ].map((stat) => (
          <Card key={stat.label} data-color="neutral" className={styles.statCard}>
            <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
              <IconBox icon={stat.icon} variant={stat.variant} size="md" />
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                <Paragraph data-size="xs" className={styles.statLabel}>
                  {stat.label}
                </Paragraph>
                <Heading level={2} data-size="lg" className={styles.statValue}>
                  {stat.value.toLocaleString('nb-NO')}
                </Heading>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ─── FilterToolbar: Category + Search + Status + Sort ─── */}
      <FilterToolbar aria-label={t('formBuilder.filterToolbar')}>
        <FilterToolbar.Start>
          <PillDropdown
            label={currentCategoryLabel}
            options={categoryDropdownOptions}
            value={activeView}
            onChange={(v) => setActiveView(v as ActiveView)}
            size="md"
            ariaLabel={t('formBuilder.category')}
          />
        </FilterToolbar.Start>

        <FilterToolbar.Center>
          <HeaderSearch
            placeholder={t('formBuilder.searchPlaceholder')}
            value={searchQuery}
            onSearchChange={setSearchQuery}
            onSearch={setSearchQuery}
            width="350px"
          />
        </FilterToolbar.Center>

        <FilterToolbar.End>
          <PillDropdown
            label={currentStatusLabel}
            options={statusDropdownOptions}
            value={selectedStatus}
            onChange={setSelectedStatus}
            size="md"
            ariaLabel={t('formBuilder.statusFilterLabel')}
          />
          <PillDropdown
            label={currentSortLabel}
            options={sortDropdownOptions}
            value={selectedSort}
            onChange={setSelectedSort}
            size="md"
            ariaLabel={t('formBuilder.sortNewest')}
          />
        </FilterToolbar.End>
      </FilterToolbar>

      {/* ─── Bulk Selection Bar ─── */}
      {selectedIds.length > 0 && (
        <Stack direction="horizontal" align="center" spacing="var(--ds-size-3)" className={styles.bulkBar}>
          <Paragraph data-size="sm" className={styles.bulkBarText}>
            {t('common.nSelected', { count: selectedIds.length })}
          </Paragraph>
          <Button type="button" variant="secondary" data-size="sm" onClick={() => setSelectedIds([])}>
            {t('common.clearSelection')}
          </Button>
        </Stack>
      )}

      {/* ─── Forms Table ─── */}
      {error ? (
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      ) : isLoading ? (
        <Card data-color="neutral" className={styles.loadingCard}>
          <LoadingState message={t('formBuilder.loading')} size="lg" />
        </Card>
      ) : filteredForms.length === 0 ? (
        <Card data-color="neutral" className={styles.emptyCard}>
          <EmptyState
            icon={<EditIcon />}
            title={searchQuery ? t('common.noResults') : t('formBuilder.noForms')}
            description={searchQuery ? t('formBuilder.noResultsDesc') : t('formBuilder.noFormsDesc')}
            action={
              !searchQuery ? (
                <Button data-size="sm" onClick={handleNewForm}>
                  <PlusIcon />
                  {t('formBuilder.createFirst')}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card data-color="neutral" className={styles.tableCard}>
          <DataTable
            columns={columns}
            data={filteredForms}
            getRowKey={(row) => row.id}
            className={styles.fullWidthTable}
            emptyMessage={t('formBuilder.noForms')}
            selectable
            selectedRows={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={(row) => handleEditForm(row)}
          />
        </Card>
      )}
    </PageContentLayout>
  );
}
