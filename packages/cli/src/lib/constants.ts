/**
 * Shared constants.
 */

import * as path from 'node:path';

export const APPS = ['web', 'dashboard'] as const;
export type AppName = (typeof APPS)[number];

export const DS_LEVELS = ['primitives', 'composed', 'blocks'] as const;
export type DSLevel = (typeof DS_LEVELS)[number];

export const ROUTE_TYPES = ['list', 'detail', 'form'] as const;
export type RouteType = (typeof ROUTE_TYPES)[number];

export const ROLES = ['admin', 'case_handler', 'arranger', 'user'] as const;
export type RoleName = (typeof ROLES)[number];

export const VIEW_MODES = ['grid', 'list', 'table'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const ROOT_DIR = process.cwd();

export const PATHS = {
  apps: (app: string) => path.join(ROOT_DIR, 'apps', app),
  appTsx: (app: string) => path.join(ROOT_DIR, 'apps', app, 'src', 'App.tsx'),
  routes: (app: string) => path.join(ROOT_DIR, 'apps', app, 'src', 'routes'),
  ds: path.join(ROOT_DIR, 'packages', 'ds', 'src'),
  sdkHooks: path.join(ROOT_DIR, 'packages', 'sdk', 'src', 'hooks'),
  i18nLocales: path.join(ROOT_DIR, 'packages', 'i18n', 'locales'),
  nbJson: path.join(ROOT_DIR, 'packages', 'i18n', 'locales', 'nb.json'),
  enJson: path.join(ROOT_DIR, 'packages', 'i18n', 'locales', 'en.json'),
} as const;
