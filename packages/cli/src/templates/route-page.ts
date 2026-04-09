/**
 * Templates for route page generation (list, detail, form).
 */

export interface ListPageVars {
  pascal: string;
  pascalPlural: string;
  namespace: string;
  routePath: string;
  cssFileName: string;
  app: string;
}

export function generateListPage(v: ListPageVars): string {
  return `/**
 * ${v.pascalPlural} Page
 * Admin list view with search, filters, and data table.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Paragraph,
  Spinner,
  DataTable,
  HeaderSearch,
  Stack,
  EmptyState,
  ErrorState,
  PlusIcon,
  FilterToolbar,
  DashboardPageHeader,
  PageContentLayout,
} from '@digipicks/ds';
import type { DataTableColumn } from '@digipicks/ds';
import { useSetPageTitle } from '@digipicks/app-shell';
import { useSessionTenantId } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import styles from './${v.cssFileName}.module.css';

// TODO: Import SDK hook (e.g. use${v.pascalPlural} from '@digipicks/sdk')

// TODO: Define entity type (or import from SDK)
interface ${v.pascal} {
  id: string;
  name: string;
  status: string;
}

export function ${v.pascalPlural}Page() {
  const t = useT();
  useSetPageTitle(t('${v.namespace}.title'));
  const tenantId = useSessionTenantId('${v.app}');
  const navigate = useNavigate();

  // State
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Wire to SDK hook
  const data: ${v.pascal}[] = [];
  const isLoading = false;
  const error = null;

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) => item.name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleSearch = useCallback((value: string) => setSearchQuery(value || ''), []);

  // Column definitions
  const columns: DataTableColumn<${v.pascal}>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('${v.namespace}.columnName'),
        render: (row) => (
          <Paragraph data-size="sm">{row.name}</Paragraph>
        ),
      },
      {
        id: 'status',
        header: t('${v.namespace}.columnStatus'),
        width: '120px',
        render: (row) => (
          <Paragraph data-size="sm">{row.status}</Paragraph>
        ),
      },
      {
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
      },
    ],
    [t, navigate],
  );

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
          <FilterToolbar.Center>
            <HeaderSearch
              placeholder={t('${v.namespace}.searchPlaceholder')}
              value={searchValue}
              onSearchChange={handleSearchChange}
              onSearch={handleSearch}
              width="350px"
            />
          </FilterToolbar.Center>
          <FilterToolbar.End>
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={() => navigate('/${v.routePath}/new')}
            >
              <PlusIcon />
              {t('common.create')}
            </Button>
          </FilterToolbar.End>
        </FilterToolbar>
      </DashboardPageHeader>

      <Stack direction="vertical" spacing="var(--ds-size-4)" className={styles.mainContent}>
        <div className={styles.tableWrapper}>
          {isLoading ? (
            <Stack direction="horizontal" justify="center" align="center" className={styles.loadingWrapper}>
              <Spinner aria-label={t('common.loading')} />
            </Stack>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('${v.namespace}.emptyTitle')}
              description={searchQuery ? t('common.noSearchResults') : t('${v.namespace}.emptyDesc')}
            />
          ) : (
            <DataTable<${v.pascal}>
              columns={columns}
              data={filtered}
              getRowKey={(row) => row.id}
              onRowClick={(row) => navigate(\`/${v.routePath}/\${row.id}\`)}
              size="sm"
            />
          )}
        </div>
      </Stack>
    </PageContentLayout>
  );
}
`;
}

export function generateDetailPage(pascal: string, namespace: string, cssFileName: string): string {
  return `/**
 * ${pascal} Detail Page
 */

import { useParams, useNavigate } from 'react-router-dom';
import {
  Heading,
  Paragraph,
  Spinner,
  Stack,
  Card,
  BackButton,
  PageContentLayout,
  ErrorState,
} from '@digipicks/ds';
import { useSetPageTitle } from '@digipicks/app-shell';
import { useT } from '@digipicks/i18n';
import styles from './${cssFileName}.module.css';

export function ${pascal}DetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useSetPageTitle(t('${namespace}.detailTitle'));

  // TODO: Wire to SDK hook (e.g. use${pascal}(id))
  const data = null;
  const isLoading = false;
  const error = null;

  if (error) {
    return (
      <PageContentLayout>
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      </PageContentLayout>
    );
  }

  if (isLoading) {
    return (
      <PageContentLayout>
        <Stack direction="horizontal" justify="center">
          <Spinner aria-label={t('common.loading')} />
        </Stack>
      </PageContentLayout>
    );
  }

  return (
    <PageContentLayout>
      <BackButton onClick={() => navigate(-1)}>{t('common.back')}</BackButton>

      <Card data-color="neutral">
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <Heading level={1} data-size="lg">
            {/* TODO: Display entity name */}
            {id}
          </Heading>
          <Paragraph>
            {/* TODO: Display entity details */}
          </Paragraph>
        </Stack>
      </Card>
    </PageContentLayout>
  );
}
`;
}

export function generateFormPage(pascal: string, namespace: string, cssFileName: string): string {
  return `/**
 * ${pascal} Form Page
 * Create and edit form.
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Heading,
  Spinner,
  Stack,
  Card,
  Button,
  Textfield,
  BackButton,
  PageContentLayout,
  ErrorState,
} from '@digipicks/ds';
import { useSetPageTitle } from '@digipicks/app-shell';
import { useSessionTenantId } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import styles from './${cssFileName}.module.css';

export function ${pascal}FormPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenantId = useSessionTenantId();
  const isEdit = !!id;

  useSetPageTitle(t('${namespace}.formTitle'));

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // TODO: If editing, load existing data with SDK hook

  const handleSubmit = useCallback(async () => {
    setIsSaving(true);
    try {
      // TODO: Call SDK mutation (create or update)
      navigate(-1);
    } catch {
      // Error handling
    } finally {
      setIsSaving(false);
    }
  }, [name, navigate]);

  return (
    <PageContentLayout>
      <BackButton onClick={() => navigate(-1)}>{t('common.back')}</BackButton>

      <Card data-color="neutral">
        <Stack direction="vertical" spacing="var(--ds-size-6)">
          <Heading level={1} data-size="lg">
            {isEdit ? t('common.edit') : t('common.create')}
          </Heading>

          <Textfield
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* TODO: Add more form fields */}

          <Stack direction="horizontal" spacing="var(--ds-size-3)">
            <Button type="button" variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? <Spinner aria-label={t('common.saving')} data-size="sm" /> : t('common.save')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </PageContentLayout>
  );
}
`;
}

export function generateListCSS(): string {
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
`;
}

export function generateDetailCSS(): string {
  return `/* Detail page styles */
`;
}

export function generateFormCSS(): string {
  return `/* Form page styles */
`;
}
