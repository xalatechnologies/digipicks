/**
 * Router scanner — parses App.tsx to extract existing routes, imports, and guards.
 */

import * as fs from 'node:fs';
import { PATHS } from '../lib/constants.js';

export interface RouteInfo {
  path: string;
  componentName: string;
  requiredRole: string | null;
  featureModule: string | null;
}

export interface ImportInfo {
  names: string[];
  source: string;
}

export interface RouterScanResult {
  routes: RouteInfo[];
  imports: ImportInfo[];
  routePaths: Set<string>;
  componentNames: Set<string>;
}

/**
 * Scan App.tsx for the given app to extract route information.
 */
export function scanRouter(app: string): RouterScanResult {
  const appTsxPath = PATHS.appTsx(app);

  if (!fs.existsSync(appTsxPath)) {
    return { routes: [], imports: [], routePaths: new Set(), componentNames: new Set() };
  }

  const content = fs.readFileSync(appTsxPath, 'utf-8');

  const routes = extractRoutes(content);
  const imports = extractImports(content);

  const routePaths = new Set(routes.map((r) => r.path));
  const componentNames = new Set(routes.map((r) => r.componentName).filter(Boolean));

  return { routes, imports, routePaths, componentNames };
}

function extractRoutes(content: string): RouteInfo[] {
  const routes: RouteInfo[] = [];

  // Match both single-line and multi-line Route patterns
  // Pattern: <Route path="..." element={...} />  or  <Route path="..." element={...}>
  const routeRegex = /path="([^"]+)"[^>]*element=\{([^}]+(?:\{[^}]*\})*[^}]*)\}/g;

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const routePath = match[1];
    const elementStr = match[2];

    // Extract requiredRole
    const roleMatch = elementStr.match(/requiredRole="([^"]+)"/);
    const requiredRole = roleMatch ? roleMatch[1] : null;

    // Extract featureModule
    const featureMatch = elementStr.match(/module="([^"]+)"/);
    const featureModule = featureMatch ? featureMatch[1] : null;

    // Extract component name (e.g., <ListingsPage />)
    const componentMatch = elementStr.match(/<(\w+Page)\s*\/?>/);
    const componentName = componentMatch ? componentMatch[1] : '';

    routes.push({ path: routePath, componentName, requiredRole, featureModule });
  }

  return routes;
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const names = match[1].split(',').map((n) => n.trim()).filter(Boolean);
    imports.push({ names, source: match[2] });
  }

  return imports;
}
