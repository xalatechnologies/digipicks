/**
 * Command: xala create:crud-page <app> <entityName>
 *
 * Generates a full CRUD page set (list + wizard form) using DS CRUD blocks:
 * CrudStatGrid, CrudListItem, CrudWizard (multi-step form), PillTabs,
 * PillDropdown, ActionMenu, FilterToolbar, DashboardPageHeader, DataTable.
 *
 * Pattern identical to dashboard listings page.
 *
 * Usage:
 *   pnpm xala create:crud-page dashboard subscription
 *   pnpm xala create:crud-page dashboard gift-card --role admin --stats
 */

import { Command } from 'commander';
import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers.js';
import { toPascal, toKebab, toTitle, pluralize, singularize } from '../lib/naming.js';
import { APPS, ROLES, ROOT_DIR } from '../lib/constants.js';
import { scanRouter } from '../scanner/router.js';
import { hasNamespaceConflict } from '../scanner/i18n.js';
import {
  generateCrudListPage,
  generateCrudFormPage,
  generateCrudListCSS,
  generateCrudFormCSS,
  generateCrudI18nKeys,
} from '../templates/crud-page.js';

export function createCrudPageCommand(): Command {
  return new Command('create:crud-page')
    .description('Create a full CRUD page set (list + form) with DS CRUD blocks')
    .argument('<app>', `Target app (${APPS.join(', ')})`)
    .argument('<entityName>', 'Entity name in singular kebab-case (e.g., "subscription")')
    .option('--route <path>', 'Route path override (default: pluralized entity)')
    .option('--role <requiredRole>', `RBAC role (${ROLES.join(', ')})`)
    .option('--feature <module>', 'FeatureGate module name')
    .option('--stats', 'Include CrudStatGrid stat cards row', false)
    .option('--list-only', 'Generate list page only (no form page)', false)
    .option('--dry-run', 'Preview without writing files', false)
    .action(async (app: string, entityName: string, opts) => {
      await run(app, entityName, opts);
    });
}

interface RunOpts {
  route?: string;
  role?: string;
  feature?: string;
  stats?: boolean;
  listOnly?: boolean;
  dryRun?: boolean;
}

async function run(app: string, rawEntityName: string, opts: RunOpts): Promise<void> {
  printHeader('Create CRUD Page');

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
  const cssFileName = toKebab(pluralize(entityName));

  // Validate role
  const requiredRole = opts.role || '';
  if (requiredRole && !ROLES.includes(requiredRole as any)) {
    console.error(`Invalid role: "${requiredRole}". Must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }

  const featureModule = opts.feature || '';
  const namespace = `${app}${pascalPlural}`;

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

  const pageVars = {
    pascal,
    pascalPlural,
    namespace,
    routePath,
    cssFileName,
    app,
    columns: ['name', 'status', 'createdAt', 'actions'],
    hasStatusFilter: true,
    hasSortFilter: true,
    hasSearch: true,
    hasStats: opts.stats === true,
  };

  // Generate list page
  const listFile = `apps/${app}/src/routes/${cssFileName}.tsx`;
  const listCssFile = `apps/${app}/src/routes/${cssFileName}.module.css`;
  writer.create(listFile, generateCrudListPage(pageVars));
  writer.create(listCssFile, generateCrudListCSS());

  // Generate form page (unless --list-only)
  const formFileName = `${toKebab(entityName)}-form`;
  const formFile = `apps/${app}/src/routes/${formFileName}.tsx`;
  const formCssFile = `apps/${app}/src/routes/${formFileName}.module.css`;
  if (!opts.listOnly) {
    writer.create(formFile, generateCrudFormPage(pageVars));
    writer.create(formCssFile, generateCrudFormCSS());
  }

  await writer.execute();
  writer.printSummary();

  // Print manual steps — list page
  const listComponentName = `${pascalPlural}Page`;
  const listImportPath = `@/routes/${cssFileName}`;

  printManualStep(
    `Add imports to apps/${app}/src/App.tsx:`,
    `import { ${listComponentName} } from '${listImportPath}';` +
    (!opts.listOnly ? `\nimport { ${pascal}FormPage } from '@/routes/${formFileName}';` : ''),
  );

  let listRouteElement = `<${listComponentName} />`;
  let formRouteElement = `<${pascal}FormPage />`;

  if (app === 'dashboard' && requiredRole) {
    listRouteElement = `<ProtectedRoute requiredRole="${requiredRole}">${listRouteElement}</ProtectedRoute>`;
    formRouteElement = `<ProtectedRoute requiredRole="${requiredRole}">${formRouteElement}</ProtectedRoute>`;
  }
  if (featureModule) {
    const gate = (el: string) =>
      `<FeatureGate module="${featureModule}" fallback={<Navigate to="/" replace />} appId="${app}">${el}</FeatureGate>`;
    listRouteElement = gate(listRouteElement);
    formRouteElement = gate(formRouteElement);
  }

  const routes = [`<Route path="${routePath}" element={${listRouteElement}} />`];
  if (!opts.listOnly) {
    routes.push(`<Route path="${routePath}/new" element={${formRouteElement}} />`);
    routes.push(`<Route path="${routePath}/:id/edit" element={${formRouteElement}} />`);
  }

  printManualStep(`Add routes to apps/${app}/src/App.tsx:`, routes.join('\n'));

  printManualStep(
    `Add i18n keys to packages/i18n/locales/nb.json:`,
    generateCrudI18nKeys(namespace, entityName),
  );

  const generatedFiles = [listFile, listCssFile];
  if (!opts.listOnly) generatedFiles.push(formFile, formCssFile);

  printSuccess(
    `CRUD pages for "${pascalPlural}" created:\n` +
    generatedFiles.map((f) => `  ${f}`).join('\n') + '\n' +
    `\n  DS blocks used: CrudListItem, CrudStatGrid, CrudWizard` +
    `\n  Features: PillTabs (list/table + wizard stepper), PillDropdown (sort/filter), ActionMenu, StatusTag` +
    `\n  Pattern: identical to dashboard listings`,
  );
}
