/**
 * Command: xala create:route <app> <routeName>
 *
 * Creates a new route page in an app with proper DS compliance, auth guards, and i18n.
 */

import { Command } from 'commander';
import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers.js';
import { toPascal, toCamel, toKebab, toTitle, pluralize, singularize } from '../lib/naming.js';
import { APPS, ROLES, ROUTE_TYPES, ROOT_DIR, type RouteType } from '../lib/constants.js';
import { scanRouter } from '../scanner/router.js';
import { hasNamespaceConflict } from '../scanner/i18n.js';
import { generateListPage, generateDetailPage, generateFormPage, generateListCSS, generateDetailCSS, generateFormCSS } from '../templates/route-page.js';

export function createRouteCommand(): Command {
  return new Command('create:route')
    .description('Create a new route page in an app')
    .argument('<app>', `Target app (${APPS.join(', ')})`)
    .argument('<routeName>', 'Route path in kebab-case (e.g., "invoices" or "bookings/detail")')
    .option('--role <requiredRole>', `RBAC role (${ROLES.join(', ')})`)
    .option('--feature <module>', 'FeatureGate module name')
    .option('--type <pageType>', `Page type (${ROUTE_TYPES.join(', ')})`, 'list')
    .option('--dry-run', 'Preview without writing files', false)
    .action(async (app: string, routeName: string, opts) => {
      await run(app, routeName, opts);
    });
}

async function run(
  app: string,
  routeName: string,
  opts: { role?: string; feature?: string; type?: string; dryRun?: boolean },
): Promise<void> {
  printHeader('Create Route');

  // Validate app
  if (!APPS.includes(app as any)) {
    console.error(`Invalid app: "${app}". Must be one of: ${APPS.join(', ')}`);
    process.exit(1);
  }

  // Validate page type
  const routeType = (opts.type || 'list') as RouteType;
  if (!ROUTE_TYPES.includes(routeType)) {
    console.error(`Invalid page type: "${opts.type}". Must be one of: ${ROUTE_TYPES.join(', ')}`);
    process.exit(1);
  }

  // Validate role
  const requiredRole = opts.role || '';
  if (requiredRole && !ROLES.includes(requiredRole as any)) {
    console.error(`Invalid role: "${requiredRole}". Must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }

  const featureModule = opts.feature || '';
  const routePath = toKebab(routeName);
  const segments = routePath.split('/');
  const lastSegment = segments[segments.length - 1];
  const entityName = singularize(lastSegment);
  const namespace = `${app}${toPascal(pluralize(entityName))}`;

  // Scan for conflicts
  const scan = scanRouter(app);
  if (scan.routePaths.has(routePath)) {
    console.error(`Route conflict: "${routePath}" already exists in ${app}/App.tsx`);
    process.exit(1);
  }

  if (hasNamespaceConflict(namespace)) {
    console.warn(`Warning: i18n namespace "${namespace}" already exists in nb.json (may cause key collision)`);
  }

  const pascal = toPascal(entityName);
  const pascalPlural = toPascal(pluralize(entityName));
  const fileName = toKebab(lastSegment);

  const relativeDir = `apps/${app}/src/routes`;
  const routeFile = segments.length > 1
    ? `${relativeDir}/${segments.slice(0, -1).join('/')}/${fileName}.tsx`
    : `${relativeDir}/${fileName}.tsx`;
  const cssFile = routeFile.replace('.tsx', '.module.css');

  const dryRun = opts.dryRun === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  // Generate page content
  let pageContent: string;
  let cssContent: string;

  switch (routeType) {
    case 'list':
      pageContent = generateListPage({ pascal, pascalPlural, namespace, routePath, cssFileName: fileName, app });
      cssContent = generateListCSS();
      break;
    case 'detail':
      pageContent = generateDetailPage(pascal, namespace, fileName);
      cssContent = generateDetailCSS();
      break;
    case 'form':
      pageContent = generateFormPage(pascal, namespace, fileName);
      cssContent = generateFormCSS();
      break;
  }

  writer.create(routeFile, pageContent);
  writer.create(cssFile, cssContent);

  await writer.execute();
  writer.printSummary();

  // Print manual steps
  const componentName = routeType === 'detail'
    ? `${pascal}DetailPage`
    : routeType === 'form'
      ? `${pascal}FormPage`
      : `${pascalPlural}Page`;

  const importPath = segments.length > 1
    ? `@/routes/${segments.slice(0, -1).join('/')}/${fileName}`
    : `@/routes/${fileName}`;

  printManualStep(
    `Add import to apps/${app}/src/App.tsx:`,
    `import { ${componentName} } from '${importPath}';`,
  );

  let routeElement = `<${componentName} />`;
  if (app === 'dashboard' && requiredRole) {
    routeElement = `<ProtectedRoute requiredRole="${requiredRole}">${routeElement}</ProtectedRoute>`;
  }
  if (featureModule) {
    routeElement = `<FeatureGate module="${featureModule}" fallback={<Navigate to="/" replace />} appId="${app}">${routeElement}</FeatureGate>`;
  }

  const urlPath = routeType === 'detail' ? `${routePath}/:id` : routePath;
  printManualStep(
    `Add route to apps/${app}/src/App.tsx:`,
    `<Route path="${urlPath}" element={${routeElement}} />`,
  );

  printManualStep(
    `Add i18n keys to packages/i18n/locales/nb.json:`,
    generateI18nKeys(namespace, routeType, entityName),
  );

  printSuccess(`Route "${routePath}" created in ${app} app.`);
}

function generateI18nKeys(namespace: string, routeType: RouteType, entityName: string): string {
  const lines = [`"${namespace}": {`];
  lines.push(`  "title": "${toTitle(pluralize(entityName))}",`);

  if (routeType === 'list') {
    lines.push(`  "searchPlaceholder": "Sok...",`);
    lines.push(`  "filterToolbar": "Filtrer ${pluralize(entityName)}",`);
    lines.push(`  "emptyTitle": "Ingen ${pluralize(entityName)}",`);
    lines.push(`  "emptyDesc": "Kom i gang ved aa opprette en.",`);
    lines.push(`  "columnName": "Navn",`);
    lines.push(`  "columnStatus": "Status",`);
  }
  if (routeType === 'detail') {
    lines.push(`  "detailTitle": "${toTitle(entityName)}",`);
  }
  if (routeType === 'form') {
    lines.push(`  "formTitle": "${toTitle(entityName)}",`);
    lines.push(`  "saveSuccess": "Lagret!",`);
  }

  lines.push('}');
  return lines.join('\n');
}
