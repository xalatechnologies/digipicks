/**
 * Command: xala create:datatable-page <app> <entityName>
 *
 * Generates a full listings-style page with FilterToolbar, DataTable,
 * view modes, bulk actions, and all DS compliance.
 */

import { Command } from 'commander';
import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers.js';
import { toPascal, toKebab, toTitle, pluralize, singularize } from '../lib/naming.js';
import { APPS, ROLES, VIEW_MODES, ROOT_DIR, type ViewMode } from '../lib/constants.js';
import { scanRouter } from '../scanner/router.js';
import { hasNamespaceConflict } from '../scanner/i18n.js';
import { generateDatatablePage, generateDatatableCSS } from '../templates/datatable-page.js';

export function createDatatablePageCommand(): Command {
  return new Command('create:datatable-page')
    .description('Create a listings-style page with filters, DataTable, and view modes')
    .argument('<app>', `Target app (${APPS.join(', ')})`)
    .argument('<entityName>', 'Entity name in singular kebab-case (e.g., "gift-card")')
    .option('--route <path>', 'Route path override (default: pluralized entity)')
    .option('--viewModes <modes>', 'Comma-separated view modes (grid,list,table)', 'table')
    .option('--role <requiredRole>', `RBAC role (${ROLES.join(', ')})`, 'admin')
    .option('--feature <module>', 'FeatureGate module name')
    .option('--columns <cols>', 'Comma-separated column names', 'name,status')
    .option('--filters <filters>', 'Comma-separated filter types (search,status,sort)', 'search,sort')
    .option('--bulk-actions', 'Enable bulk selection and actions', false)
    .option('--dry-run', 'Preview without writing files', false)
    .action(async (app: string, entityName: string, opts) => {
      await run(app, entityName, opts);
    });
}

interface RunOpts {
  route?: string;
  viewModes?: string;
  role?: string;
  feature?: string;
  columns?: string;
  filters?: string;
  bulkActions?: boolean;
  dryRun?: boolean;
}

async function run(app: string, rawEntityName: string, opts: RunOpts): Promise<void> {
  printHeader('Create DataTable Page');

  // Validate app
  if (!APPS.includes(app as any)) {
    console.error(`Invalid app: "${app}". Must be one of: ${APPS.join(', ')}`);
    process.exit(1);
  }

  // Parse entity name
  const entityKebab = toKebab(rawEntityName);
  const entityName = singularize(entityKebab);
  const pascal = toPascal(entityName);
  const pascalPlural = toPascal(pluralize(entityName));

  // Parse route path
  const routePath = opts.route || toKebab(pluralize(entityName));

  // Parse view modes
  const viewModes = (opts.viewModes || 'table')
    .split(',')
    .map((m) => m.trim())
    .filter((m): m is ViewMode => VIEW_MODES.includes(m as ViewMode));

  if (viewModes.length === 0) {
    console.error(`Invalid view modes. Must include at least one of: ${VIEW_MODES.join(', ')}`);
    process.exit(1);
  }

  // Validate role
  const requiredRole = opts.role || 'admin';
  if (!ROLES.includes(requiredRole as any)) {
    console.error(`Invalid role: "${requiredRole}". Must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }

  // Parse columns
  const columns = (opts.columns || 'name,status')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  // Ensure actions column
  if (!columns.includes('actions')) {
    columns.push('actions');
  }

  // Parse filters
  const filterTypes = (opts.filters || 'search,sort')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  const featureModule = opts.feature || '';
  const namespace = `${app}${pascalPlural}`;
  const cssFileName = toKebab(pluralize(entityName));

  // Scan for conflicts
  const scan = scanRouter(app);
  if (scan.routePaths.has(routePath)) {
    console.error(`Route conflict: "${routePath}" already exists in ${app}/App.tsx`);
    process.exit(1);
  }

  if (hasNamespaceConflict(namespace)) {
    console.warn(`Warning: i18n namespace "${namespace}" already exists in nb.json`);
  }

  const dryRun = opts.dryRun === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  // Generate page
  const pageVars = {
    pascal,
    pascalPlural,
    namespace,
    routePath,
    cssFileName,
    app,
    columns,
    viewModes,
    hasStatusFilter: filterTypes.includes('status'),
    hasSortFilter: filterTypes.includes('sort'),
    hasSearch: filterTypes.includes('search'),
    hasBulkActions: opts.bulkActions === true,
  };

  const routeFile = `apps/${app}/src/routes/${cssFileName}.tsx`;
  const cssFile = `apps/${app}/src/routes/${cssFileName}.module.css`;

  writer.create(routeFile, generateDatatablePage(pageVars));
  writer.create(cssFile, generateDatatableCSS(pageVars));

  await writer.execute();
  writer.printSummary();

  // Print manual steps
  const componentName = `${pascalPlural}Page`;
  const importPath = `@/routes/${cssFileName}`;

  printManualStep(
    `Add import to apps/${app}/src/App.tsx:`,
    `import { ${componentName} } from '${importPath}';`,
  );

  let routeElement = `<${componentName} />`;
  if (app === 'dashboard' && requiredRole) {
    routeElement = `<BackofficeProtectedRouteConnected requiredRole="${requiredRole}">${routeElement}</BackofficeProtectedRouteConnected>`;
  }
  if (featureModule) {
    routeElement = `<FeatureGate module="${featureModule}" fallback={<Navigate to="/" replace />} appId="${app}">${routeElement}</FeatureGate>`;
  }

  printManualStep(
    `Add route to apps/${app}/src/App.tsx:`,
    `<Route path="${routePath}" element={${routeElement}} />`,
  );

  printManualStep(
    `Add i18n keys to packages/i18n/locales/nb.json:`,
    generateDatatableI18nKeys(namespace, columns, filterTypes, pageVars.hasBulkActions, entityName),
  );

  printSuccess(
    `DataTable page "${pascalPlural}" created at ${routeFile}.\n` +
    `  View modes: ${viewModes.join(', ')}\n` +
    `  Columns: ${columns.join(', ')}\n` +
    `  Filters: ${filterTypes.join(', ')}${pageVars.hasBulkActions ? '\n  Bulk actions: enabled' : ''}`,
  );
}

function generateDatatableI18nKeys(
  namespace: string,
  columns: string[],
  filters: string[],
  hasBulk: boolean,
  entityName: string,
): string {
  const entityPlural = pluralize(entityName);
  const lines = [`"${namespace}": {`];
  lines.push(`  "title": "${toTitle(entityPlural)}",`);

  if (filters.includes('search')) {
    lines.push(`  "searchPlaceholder": "Sok...",`);
  }
  lines.push(`  "filterToolbar": "Filtrer ${entityPlural}",`);
  lines.push(`  "emptyTitle": "Ingen ${entityPlural}",`);
  lines.push(`  "emptyDesc": "Kom i gang ved aa opprette en.",`);

  if (filters.includes('status')) {
    lines.push(`  "statusAll": "Alle",`);
    lines.push(`  "statusActive": "Aktive",`);
    lines.push(`  "statusInactive": "Inaktive",`);
    lines.push(`  "statusFilterLabel": "Filtrer etter status",`);
  }

  if (filters.includes('sort')) {
    lines.push(`  "sortNewest": "Nyeste forst",`);
    lines.push(`  "sortOldest": "Eldste forst",`);
    lines.push(`  "sortNameAZ": "Navn A-AA",`);
    lines.push(`  "sortNameZA": "Navn AA-A",`);
    lines.push(`  "sortLabel": "Sortering",`);
  }

  if (hasBulk) {
    lines.push(`  "bulkSelected": "{{count}} valgt",`);
  }

  for (const col of columns) {
    if (col === 'actions') continue;
    lines.push(`  "column${col.charAt(0).toUpperCase() + col.slice(1)}": "${toTitle(col)}",`);
  }

  lines.push('}');
  return lines.join('\n');
}
