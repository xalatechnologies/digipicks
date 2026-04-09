/**
 * Generator: xala new route <app> <path>
 *
 * Creates a new route/page in an existing app with proper DS compliance,
 * i18n, auth guards, and the established page patterns.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, choose, confirm } from '../lib/prompts';
import { toPascal, toCamel, toKebab, toTitle, pluralize, singularize } from '../lib/naming';
import { APPS, ROLES, ROUTE_TYPES, ROOT_DIR, type RouteType } from '../lib/constants';

export async function newRoute(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New Route');

  const app = (args[0] as string) || (await choose('Which app?', [...APPS]));
  if (!APPS.includes(app as any)) {
    console.error(`Invalid app: ${app}. Must be one of: ${APPS.join(', ')}`);
    process.exit(1);
  }

  const routePath = args[1] || (await ask('Route path (kebab-case, e.g. "invoices" or "bookings/detail")'));
  const routeType = (args[2] as RouteType) || ((await choose('Page type?', [...ROUTE_TYPES])) as RouteType);

  const segments = routePath.split('/');
  const lastSegment = segments[segments.length - 1];
  const entityName = await ask('Entity name (singular, e.g. "invoice")', singularize(lastSegment));
  const namespace = await ask('i18n namespace', `${app}${toPascal(pluralize(entityName))}`);

  let requiredRole = '';
  let featureModule = '';
  if (app === 'backoffice') {
    requiredRole = await choose('Required role?', ['admin', 'case_handler', 'arranger', 'user', 'none']);
    if (requiredRole === 'none') requiredRole = '';
  }
  featureModule = await ask('Feature module (for FeatureGate, or empty for none)', '');

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  const pascal = toPascal(entityName);
  const pascalPlural = toPascal(pluralize(entityName));
  const camel = toCamel(entityName);
  const fileName = toKebab(lastSegment);
  const relativeDir = `apps/${app}/src/routes`;
  const routeFile =
    segments.length > 1
      ? `${relativeDir}/${segments.slice(0, -1).join('/')}/${fileName}.tsx`
      : `${relativeDir}/${fileName}.tsx`;
  const cssFile = routeFile.replace('.tsx', '.module.css');

  // Generate page content based on type
  let pageContent: string;
  let cssContent: string;

  switch (routeType) {
    case 'list':
      pageContent = generateListPage({ pascal, pascalPlural, camel, namespace, routePath, fileName, app, entityName });
      cssContent = generateListCSS();
      break;
    case 'detail':
      pageContent = generateDetailPage({ pascal, namespace, fileName });
      cssContent = generateDetailCSS();
      break;
    case 'form':
      pageContent = generateFormPage({ pascal, namespace, fileName, entityName });
      cssContent = generateFormCSS();
      break;
    default:
      pageContent = generateListPage({ pascal, pascalPlural, camel, namespace, routePath, fileName, app, entityName });
      cssContent = generateListCSS();
  }

  writer.create(routeFile, pageContent);
  writer.create(cssFile, cssContent);

  await writer.execute();
  writer.printSummary();

  // Print manual steps
  const componentName =
    routeType === 'detail' ? `${pascal}DetailPage` : routeType === 'form' ? `${pascal}FormPage` : `${pascalPlural}Page`;
  const importPath =
    segments.length > 1 ? `@/routes/${segments.slice(0, -1).join('/')}/${fileName}` : `@/routes/${fileName}`;

  printManualStep(`Add import to apps/${app}/src/App.tsx:`, `import { ${componentName} } from '${importPath}';`);

  let routeElement = `<${componentName} />`;
  if (app === 'backoffice' && requiredRole) {
    routeElement = `<BackofficeProtectedRouteConnected requiredRole="${requiredRole}">${routeElement}</BackofficeProtectedRouteConnected>`;
  }
  if (featureModule) {
    routeElement = `<FeatureGate module="${featureModule}" fallback={<Navigate to="/" replace />} appId="${app}">${routeElement}</FeatureGate>`;
  }

  const urlPath = routeType === 'detail' ? `${routePath}/:id` : routePath;
  printManualStep(`Add route to apps/${app}/src/App.tsx:`, `<Route path="${urlPath}" element={${routeElement}} />`);

  printManualStep(
    `Add i18n keys to packages/i18n/locales/nb.json:`,
    [
      `"${namespace}": {`,
      `  "title": "${toTitle(pluralize(entityName))}",`,
      routeType === 'list' ? `  "searchPlaceholder": "Søk...",` : '',
      routeType === 'list' ? `  "filterToolbar": "Filtrer ${pluralize(entityName)}",` : '',
      routeType === 'list' ? `  "emptyTitle": "Ingen ${pluralize(entityName)}",` : '',
      routeType === 'list' ? `  "emptyDesc": "Kom i gang ved å opprette en.",` : '',
      routeType === 'list' ? `  "columnName": "Navn",` : '',
      routeType === 'list' ? `  "columnStatus": "Status",` : '',
      routeType === 'detail' ? `  "detailTitle": "${toTitle(entityName)}",` : '',
      routeType === 'form' ? `  "formTitle": "${toTitle(entityName)}",` : '',
      routeType === 'form' ? `  "saveSuccess": "Lagret!",` : '',
      `}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  printSuccess(`Route "${routePath}" created in ${app} app.`);
}

// =============================================================================
// Template generators
// =============================================================================

interface ListPageOpts {
  pascal: string;
  pascalPlural: string;
  camel: string;
  namespace: string;
  routePath: string;
  fileName: string;
  app: string;
  entityName: string;
}

function generateListPage(opts: ListPageOpts): string {
  const { pascal, pascalPlural, camel, namespace, routePath, fileName, app } = opts;
  return `/**
 * ${pascalPlural} Page
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
  PillDropdown,
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
import styles from './${fileName}.module.css';

// TODO: Import SDK hook (e.g. use${pascalPlural} from '@digipicks/sdk')

// TODO: Define entity type (or import from SDK)
interface ${pascal} {
  id: string;
  name: string;
  status: string;
}

export function ${pascalPlural}Page() {
  const t = useT();
  useSetPageTitle(t('${namespace}.title'));
  const tenantId = useSessionTenantId('${app}');
  const navigate = useNavigate();

  // State
  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // TODO: Wire to SDK hook
  const data: ${pascal}[] = [];
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
  const columns: DataTableColumn<${pascal}>[] = useMemo(
    () => [
      {
        id: 'name',
        header: t('${namespace}.columnName'),
        render: (row) => (
          <Paragraph data-size="sm">{row.name}</Paragraph>
        ),
      },
      {
        id: 'status',
        header: t('${namespace}.columnStatus'),
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
              navigate(\`/${routePath}/\${row.id}\`);
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
        <FilterToolbar variant="flat" aria-label={t('${namespace}.filterToolbar')}>
          <FilterToolbar.Center>
            <HeaderSearch
              placeholder={t('${namespace}.searchPlaceholder')}
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
              onClick={() => navigate('/${routePath}/new')}
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
              title={t('${namespace}.emptyTitle')}
              description={searchQuery ? t('common.noSearchResults') : t('${namespace}.emptyDesc')}
            />
          ) : (
            <DataTable<${pascal}>
              columns={columns}
              data={filtered}
              getRowKey={(row) => row.id}
              onRowClick={(row) => navigate(\`/${routePath}/\${row.id}\`)}
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

function generateListCSS(): string {
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

interface DetailPageOpts {
  pascal: string;
  namespace: string;
  fileName: string;
}

function generateDetailPage(opts: DetailPageOpts): string {
  const { pascal, namespace, fileName } = opts;
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
import styles from './${fileName}.module.css';

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

function generateDetailCSS(): string {
  return `/* Detail page styles */
`;
}

interface FormPageOpts {
  pascal: string;
  namespace: string;
  fileName: string;
  entityName: string;
}

function generateFormPage(opts: FormPageOpts): string {
  const { pascal, namespace, fileName } = opts;
  return `/**
 * ${pascal} Form Page
 * Create and edit form for ${pascal}.
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
import styles from './${fileName}.module.css';

export function ${pascal}FormPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenantId = useSessionTenantId();
  const isEdit = !!id;

  useSetPageTitle(t('${namespace}.formTitle'));

  // Form state
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
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? <Spinner aria-label={t('common.saving')} data-size="sm" /> : t('common.save')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
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

function generateFormCSS(): string {
  return `/* Form page styles */
`;
}
