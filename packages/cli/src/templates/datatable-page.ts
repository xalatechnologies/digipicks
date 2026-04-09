/**
 * Template for full listings-style datatable page with filters, view modes, and bulk actions.
 */

import type { ViewMode } from '../lib/constants.js';

export interface DatatablePageVars {
  pascal: string;
  pascalPlural: string;
  namespace: string;
  routePath: string;
  cssFileName: string;
  app: string;
  columns: string[];
  viewModes: ViewMode[];
  hasStatusFilter: boolean;
  hasSortFilter: boolean;
  hasSearch: boolean;
  hasBulkActions: boolean;
}

export function generateDatatablePage(v: DatatablePageVars): string {
  const hasMultiView = v.viewModes.length > 1;
  const hasGrid = v.viewModes.includes('grid');
  const hasList = v.viewModes.includes('list');
  const hasTable = v.viewModes.includes('table');

  const viewModeType = `'${v.viewModes.join("' | '")}'`;

  // Build imports
  const dsImports = [
    'Button',
    'Paragraph',
    'Spinner',
    'Stack',
    'EmptyState',
    'ErrorState',
    'PlusIcon',
    'FilterToolbar',
    'DashboardPageHeader',
    'PageContentLayout',
  ];
  if (hasTable) dsImports.push('DataTable');
  if (v.hasSearch) dsImports.push('HeaderSearch');
  if (v.hasStatusFilter || v.hasSortFilter) dsImports.push('PillDropdown');
  if (hasMultiView) {
    dsImports.push('PillTabs');
    if (hasGrid) dsImports.push('GridIcon');
    if (hasList) dsImports.push('ListIcon');
    if (hasTable && (hasGrid || hasList)) dsImports.push('TableIcon');
  }
  if (v.hasBulkActions) {
    dsImports.push('CloseIcon', 'DownloadIcon');
  }

  // Build column definitions
  const columnDefs = v.columns
    .map((col) => {
      if (col === 'actions') {
        return `      {
        id: 'actions',
        header: '',
        width: '120px',
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            data-size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              navigate(\`/${v.routePath}/\${row.id}\`);
            }}
          >
            {t('common.view')}
          </Button>
        ),
      },`;
      }
      return `      {
        id: '${col}',
        header: t('${v.namespace}.column${col.charAt(0).toUpperCase() + col.slice(1)}'),
        render: (row) => (
          <Paragraph data-size="sm">{String(row.${col} ?? '')}</Paragraph>
        ),
      },`;
    })
    .join('\n');

  // Build interface fields
  const interfaceFields = v.columns
    .filter((c) => c !== 'actions')
    .map((col) => `  ${col}: string;`)
    .join('\n');

  // Build view mode tabs
  const viewModeTabs = v.viewModes
    .map((mode) => {
      const iconMap: Record<string, string> = { grid: 'GridIcon', list: 'ListIcon', table: 'TableIcon' };
      const labelMap: Record<string, string> = {
        grid: 'common.viewGrid',
        list: 'common.viewList',
        table: 'common.viewTable',
      };
      return `                { id: '${mode}', label: t('${labelMap[mode]}'), icon: <${iconMap[mode]} size={18} /> },`;
    })
    .join('\n');

  return `/**
 * ${v.pascalPlural} Page
 * Admin view with search, filters, and ${hasMultiView ? 'multiple view modes' : 'data table'}.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ${dsImports.join(',\n  ')},
} from '@digipicks/ds';${
    hasTable
      ? `
import type { DataTableColumn } from '@digipicks/ds';`
      : ''
  }
import { useSetPageTitle } from '@digipicks/app-shell';
import { useSessionTenantId } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import styles from './${v.cssFileName}.module.css';

// TODO: Import SDK hook (e.g. use${v.pascalPlural} from '@digipicks/sdk')

// TODO: Define entity type (or import from SDK)
interface ${v.pascal} {
  id: string;
${interfaceFields}
}

${hasMultiView ? `type ViewMode = ${viewModeType};` : ''}
${
  v.hasStatusFilter
    ? `
const STATUS_OPTIONS = [
  { id: 'all', labelKey: '${v.namespace}.statusAll' },
  { id: 'active', labelKey: '${v.namespace}.statusActive' },
  { id: 'inactive', labelKey: '${v.namespace}.statusInactive' },
] as const;
`
    : ''
}${
    v.hasSortFilter
      ? `
const SORT_OPTIONS = [
  { id: 'date-desc', labelKey: '${v.namespace}.sortNewest', field: 'createdAt', order: 'desc' },
  { id: 'date-asc', labelKey: '${v.namespace}.sortOldest', field: 'createdAt', order: 'asc' },
  { id: 'name-asc', labelKey: '${v.namespace}.sortNameAZ', field: 'name', order: 'asc' },
  { id: 'name-desc', labelKey: '${v.namespace}.sortNameZA', field: 'name', order: 'desc' },
] as const;
`
      : ''
  }
export function ${v.pascalPlural}Page() {
  const t = useT();
  useSetPageTitle(t('${v.namespace}.title'));
  const tenantId = useSessionTenantId('${v.app}');
  const navigate = useNavigate();

  // State${
    hasMultiView
      ? `
  const [viewMode, setViewMode] = useState<ViewMode>('${v.viewModes[0]}');`
      : ''
  }${
    v.hasSearch
      ? `
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');`
      : ''
  }${
    v.hasStatusFilter
      ? `
  const [activeStatus, setActiveStatus] = useState<string>('all');`
      : ''
  }${
    v.hasSortFilter
      ? `
  const [selectedSort, setSelectedSort] = useState<string>('date-desc');`
      : ''
  }${
    v.hasBulkActions
      ? `
  const [selectedIds, setSelectedIds] = useState<string[]>([]);`
      : ''
  }

  // TODO: Wire to SDK hook
  const data: ${v.pascal}[] = [];
  const isLoading = false;
  const error = null;
${
  v.hasStatusFilter
    ? `
  const statusDropdownOptions = useMemo(() =>
    STATUS_OPTIONS.map((s) => ({ value: s.id, label: t(s.labelKey) })),
    [t],
  );
  const currentStatusLabel = useMemo(() => {
    const match = STATUS_OPTIONS.find((s) => s.id === activeStatus);
    return match ? t(match.labelKey) : t('${v.namespace}.statusAll');
  }, [activeStatus, t]);
`
    : ''
}${
    v.hasSortFilter
      ? `
  const sortDropdownOptions = useMemo(() =>
    SORT_OPTIONS.map((s) => ({ value: s.id, label: t(s.labelKey) })),
    [t],
  );
  const currentSortLabel = useMemo(() => {
    const match = SORT_OPTIONS.find((s) => s.id === selectedSort);
    return match ? t(match.labelKey) : t('${v.namespace}.sortNewest');
  }, [selectedSort, t]);
`
      : ''
  }
  // Client-side filtering
  const filtered = useMemo(() => {
    let result = data;${
      v.hasStatusFilter
        ? `
    if (activeStatus !== 'all') {
      result = result.filter((item) => item.status === activeStatus);
    }`
        : ''
    }${
      v.hasSearch
        ? `
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(q));
    }`
        : ''
    }
    return result;
  }, [data${v.hasStatusFilter ? ', activeStatus' : ''}${v.hasSearch ? ', searchQuery' : ''}]);
${
  v.hasSearch
    ? `
  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleSearch = useCallback((value: string) => setSearchQuery(value || ''), []);
`
    : ''
}${
    hasTable
      ? `
  // Column definitions
  const columns: DataTableColumn<${v.pascal}>[] = useMemo(
    () => [
${columnDefs}
    ],
    [t, navigate],
  );
`
      : ''
  }
  if (error) {
    return (
      <PageContentLayout>
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <DashboardPageHeader sticky>
        <FilterToolbar variant="flat" aria-label={t('${v.namespace}.filterToolbar')}>
${
  v.hasStatusFilter
    ? `          <FilterToolbar.Start>
            <PillDropdown
              label={currentStatusLabel}
              options={statusDropdownOptions}
              value={activeStatus}
              onChange={setActiveStatus}
              size="md"
              ariaLabel={t('${v.namespace}.statusFilterLabel')}
            />
          </FilterToolbar.Start>
`
    : ''
}          <FilterToolbar.Center>
${
  v.hasSearch
    ? `            <HeaderSearch
              placeholder={t('${v.namespace}.searchPlaceholder')}
              value={searchValue}
              onSearchChange={handleSearchChange}
              onSearch={handleSearch}
              width="350px"
            />
`
    : ''
}${
    v.hasSortFilter
      ? `            <PillDropdown
              label={currentSortLabel}
              options={sortDropdownOptions}
              value={selectedSort}
              onChange={setSelectedSort}
              size="md"
              ariaLabel={t('${v.namespace}.sortLabel')}
            />
`
      : ''
  }            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={() => navigate('/${v.routePath}/new')}
            >
              <PlusIcon />
              {t('common.create')}
            </Button>
          </FilterToolbar.Center>
${
  hasMultiView
    ? `          <FilterToolbar.End>
            <PillTabs
              tabs={[
${viewModeTabs}
              ]}
              activeTab={viewMode}
              onTabChange={(id) => setViewMode(id as ViewMode)}
              size="md"
              fullWidth={false}
              ariaLabel={t('common.viewMode')}
            />
          </FilterToolbar.End>
`
    : ''
}        </FilterToolbar>
      </DashboardPageHeader>

      <Stack direction="vertical" spacing="var(--ds-size-4)" className={styles.mainContent}>
${
  v.hasBulkActions
    ? `        {selectedIds.length > 0 && (
          <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)" className={styles.bulkBar}>
            <Paragraph data-size="sm" className={styles.bulkBarText}>
              {t('${v.namespace}.bulkSelected', { count: selectedIds.length })}
            </Paragraph>
            <Button
              type="button"
              variant="tertiary"
              data-size="sm"
              onClick={() => setSelectedIds([])}
              className={styles.bulkCancelButton}
            >
              <CloseIcon /> {t('common.deselect')}
            </Button>
          </Stack>
        )}

`
    : ''
}        <div className={styles.tableWrapper}>
          {isLoading ? (
            <Stack direction="horizontal" justify="center" align="center" className={styles.loadingWrapper}>
              <Spinner aria-label={t('common.loading')} />
            </Stack>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('${v.namespace}.emptyTitle')}
              description={${v.hasSearch ? `searchQuery ? t('common.noSearchResults') : ` : ''}t('${v.namespace}.emptyDesc')}
            />
          ) : (
${generateViewBranch(v, hasMultiView, hasTable, hasGrid, hasList)}
          )}
        </div>
      </Stack>
    </PageContentLayout>
  );
}
`;
}

function generateViewBranch(
  v: DatatablePageVars,
  hasMultiView: boolean,
  hasTable: boolean,
  hasGrid: boolean,
  hasList: boolean,
): string {
  if (!hasMultiView) {
    if (hasTable) return generateTableView(v);
    if (hasGrid) return generateGridView(v);
    return generateListView(v);
  }

  const branches: string[] = [];
  const modes = v.viewModes;

  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    const isFirst = i === 0;
    const isLast = i === modes.length - 1;
    const condition = isFirst ? `viewMode === '${mode}'` : isLast ? null : `viewMode === '${mode}'`;

    let view: string;
    if (mode === 'table') view = generateTableView(v);
    else if (mode === 'grid') view = generateGridView(v);
    else view = generateListView(v);

    if (isFirst) {
      branches.push(`            ${condition} ? (\n${view}\n            )`);
    } else if (isLast) {
      branches.push(`(\n${view}\n            )`);
    } else {
      branches.push(`${condition} ? (\n${view}\n            )`);
    }
  }

  return branches.join(' : ');
}

function generateTableView(v: DatatablePageVars): string {
  return `            <DataTable<${v.pascal}>
              columns={columns}
              data={filtered}
              getRowKey={(row) => row.id}${
                v.hasBulkActions
                  ? `
              selectable
              selectedRows={selectedIds}
              onSelectionChange={setSelectedIds}`
                  : ''
              }
              onRowClick={(row) => navigate(\`/${v.routePath}/\${row.id}\`)}
              size="sm"
            />`;
}

function generateGridView(v: DatatablePageVars): string {
  return `            <div className={styles.gridLayout}>
              {filtered.map((item) => (
                <div key={item.id} className={styles.gridCard} onClick={() => navigate(\`/${v.routePath}/\${item.id}\`)}>
                  {/* TODO: Replace with proper card component */}
                  <Paragraph data-size="sm">{item.name}</Paragraph>
                </div>
              ))}
            </div>`;
}

function generateListView(v: DatatablePageVars): string {
  return `            <Stack direction="vertical" spacing="var(--ds-size-2)">
              {filtered.map((item) => (
                <div key={item.id} className={styles.listItem} onClick={() => navigate(\`/${v.routePath}/\${item.id}\`)}>
                  {/* TODO: Replace with proper list item component */}
                  <Paragraph data-size="sm">{item.name}</Paragraph>
                </div>
              ))}
            </Stack>`;
}

export function generateDatatableCSS(v: DatatablePageVars): string {
  const hasGrid = v.viewModes.includes('grid');
  const hasList = v.viewModes.includes('list');

  return `.mainContent {
  flex: 1;
  overflow: hidden;
}

.tableWrapper {
  flex: 1;
  overflow: auto;
}

.loadingWrapper {
  padding: var(--ds-size-10);
}
${
  v.hasBulkActions
    ? `
.bulkBar {
  padding: var(--ds-size-2) var(--ds-size-3);
  background-color: var(--ds-color-neutral-surface-subtle);
  border-radius: var(--ds-border-radius-md);
  border: 1px solid var(--ds-color-neutral-border-subtle);
}

.bulkBarText {
  margin: 0;
  font-weight: var(--ds-font-weight-semibold);
}

.bulkCancelButton {
  margin-left: auto;
}
`
    : ''
}${
    hasGrid
      ? `
.gridLayout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--ds-size-4);
}

.gridCard {
  background-color: var(--ds-color-neutral-surface-default);
  border-radius: var(--ds-border-radius-md);
  border: 1px solid var(--ds-color-neutral-border-subtle);
  padding: var(--ds-size-4);
  cursor: pointer;
  transition: border-color 0.15s;
}

.gridCard:hover {
  border-color: var(--ds-color-accent-border-default);
}
`
      : ''
  }${
    hasList
      ? `
.listItem {
  padding: var(--ds-size-3) var(--ds-size-4);
  background-color: var(--ds-color-neutral-surface-default);
  border-radius: var(--ds-border-radius-md);
  border: 1px solid var(--ds-color-neutral-border-subtle);
  cursor: pointer;
  transition: border-color 0.15s;
}

.listItem:hover {
  border-color: var(--ds-color-accent-border-default);
}
`
      : ''
  }`;
}
