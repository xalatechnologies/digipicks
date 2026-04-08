/**
 * Shared constants for CLI generators.
 */

import * as path from 'node:path';

export const APPS = ['web', 'backoffice', 'minside'] as const;
export type AppName = (typeof APPS)[number];

export const DS_LEVELS = ['primitives', 'composed', 'blocks'] as const;
export type DSLevel = (typeof DS_LEVELS)[number];

export const ROUTE_TYPES = ['list', 'detail', 'form'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const COMPONENT_CATEGORIES = ['domain', 'infrastructure', 'platform'] as const;

export const ROLES = ['admin', 'case_handler', 'arranger', 'user'] as const;

export const ROOT_DIR = process.cwd();

export const PATHS = {
  apps: (app: string) => path.join(ROOT_DIR, 'apps', app),
  routes: (app: string) => path.join(ROOT_DIR, 'apps', app, 'src', 'routes'),
  ds: path.join(ROOT_DIR, 'packages', 'ds', 'src'),
  convexComponents: path.join(ROOT_DIR, 'convex', 'components'),
  convexDomain: path.join(ROOT_DIR, 'convex', 'domain'),
  sdkHooks: path.join(ROOT_DIR, 'packages', 'sdk', 'src', 'hooks'),
  sdkTransforms: path.join(ROOT_DIR, 'packages', 'sdk', 'src', 'transforms'),
  sharedNav: path.join(ROOT_DIR, 'packages', 'shared', 'src', 'navigation.ts'),
  i18nLocales: path.join(ROOT_DIR, 'packages', 'i18n', 'locales'),
} as const;
