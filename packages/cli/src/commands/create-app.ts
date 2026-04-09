/**
 * Command: xala create:app <appName>
 *
 * Scaffolds a new DigilistSaaS app with the standard structure:
 * package.json, index.html, vite.config.ts, tsconfig.json, main.tsx, App.tsx.
 */

import { Command } from 'commander';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers.js';
import { toKebab, toPascal } from '../lib/naming.js';
import { ROOT_DIR } from '../lib/constants.js';

export function createAppCommand(): Command {
  return new Command('create:app')
    .description('Scaffold a new DigilistSaaS app')
    .argument('<appName>', 'App name in kebab-case (e.g., "my-app")')
    .option('--port <port>', 'Dev server port', '5176')
    .option('--title <title>', 'HTML page title', '')
    .option('--layout <layout>', 'Layout type (platform, dashboard)', 'platform')
    .option('--dry-run', 'Preview without writing files', false)
    .action(async (appName: string, opts) => {
      await run(appName, opts);
    });
}

interface RunOpts {
  port: string;
  title: string;
  layout: string;
  dryRun: boolean;
}

async function run(rawAppName: string, opts: RunOpts): Promise<void> {
  printHeader('Create App');

  const appName = toKebab(rawAppName);
  const pascal = toPascal(appName);
  const port = parseInt(opts.port, 10);
  const title = opts.title || `${pascal} - DigilistSaaS`;
  const layout = opts.layout || 'platform';
  const appDir = path.join(ROOT_DIR, 'apps', appName);

  if (fs.existsSync(appDir)) {
    console.error(`App directory already exists: apps/${appName}/`);
    process.exit(1);
  }

  const dryRun = opts.dryRun === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  // package.json
  writer.create(
    `apps/${appName}/package.json`,
    JSON.stringify(
      {
        name: `@digipicks/${appName}`,
        version: '0.0.0',
        private: true,
        type: 'module',
        scripts: {
          dev: `vite --port ${port}`,
          build: 'vite build',
          lint: 'eslint .',
          preview: 'vite preview',
          typecheck: 'tsc --noEmit',
        },
        dependencies: {
          '@digipicks/ds': 'workspace:*',
          '@digipicks/app-shell': 'workspace:*',
          '@digipicks/i18n': 'workspace:*',
          '@digipicks/sdk': 'workspace:*',
          '@digipicks/shared': 'workspace:*',
          convex: '^1.31.7',
          react: '^18.3.1',
          'react-dom': '^18.3.1',
          'react-router-dom': '^6.22.0',
        },
        devDependencies: {
          '@types/react': '^18.3.18',
          '@types/react-dom': '^18.3.5',
          '@vitejs/plugin-react': '^4.3.3',
          typescript: '~5.6.0',
          vite: '^5.4.21',
        },
      },
      null,
      2,
    ) + '\n',
  );

  // index.html
  writer.create(
    `apps/${appName}/index.html`,
    `<!doctype html>
<html lang="no">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  );

  // vite.config.ts
  writer.create(
    `apps/${appName}/vite.config.ts`,
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: ${port},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@digipicks/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@digipicks/sdk'],
  },
});
`,
  );

  // tsconfig.json
  writer.create(
    `apps/${appName}/tsconfig.json`,
    JSON.stringify(
      {
        compilerOptions: {
          incremental: true,
          tsBuildInfoFile: './node_modules/.tmp/tsconfig.app.tsbuildinfo',
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2021', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          moduleDetection: 'force',
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
          baseUrl: '.',
          paths: {
            '@/*': ['./src/*'],
            '@digipicks/sdk': ['../../packages/sdk/src'],
            '@digipicks/sdk/*': ['../../packages/sdk/src/*'],
          },
        },
        include: ['src'],
        exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
      },
      null,
      2,
    ) + '\n',
  );

  // main.tsx
  writer.create(
    `apps/${appName}/src/main.tsx`,
    `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { XalaConvexProvider } from '@digipicks/sdk';

import '@digipicks/ds/styles';
import '@digipicks/ds/platform-base';
import { App } from '@/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <XalaConvexProvider>
      <App />
    </XalaConvexProvider>
  </StrictMode>,
);
`,
  );

  // App.tsx
  const layoutImports =
    layout === 'platform'
      ? `  PlatformLayout,
  PlatformSidebar,
  PlatformHeader,`
      : `  DashboardLayout,`;

  writer.create(
    `apps/${appName}/src/App.tsx`,
    `import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DesignsystemetProvider, DialogProvider, ErrorBoundary, ToastProvider, Heading } from '@digipicks/ds';
import { DEFAULT_THEME, type ThemeId } from '@digipicks/ds';
import { I18nProvider } from '@digipicks/i18n';
import { useTenantConfig, useTenantBranding } from '@digipicks/sdk';

import {
  AuthProvider,
${layoutImports}
  ProtectedRoute,
  ThemeProvider,
  useTheme,
  useBundledTheme,
  env,
} from '@digipicks/app-shell';

export function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}

const VALID_THEMES: ThemeId[] = ['digdir', 'altinn', 'uutilsynet', 'portal', 'digilist'];

function resolveThemeId(themeName: string | undefined): ThemeId {
  if (!themeName) return DEFAULT_THEME;
  if (VALID_THEMES.includes(themeName as ThemeId)) return themeName as ThemeId;
  return DEFAULT_THEME;
}

function AppWithTheme() {
  const { colorScheme } = useTheme();
  const tenantId = env.tenantId;

  const { config } = useTenantConfig(tenantId || undefined);
  const tenantTheme = (config?.settings as { theme?: string } | null)?.theme;
  const themeId = resolveThemeId(tenantTheme);

  useTenantBranding(tenantId || undefined);
  useBundledTheme(themeId);

  return (
    <I18nProvider>
      <DesignsystemetProvider theme={themeId} colorScheme={colorScheme} size="md" skipThemeLoading>
        <DialogProvider>
          <ErrorBoundary>
            <ToastProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <AuthProvider appId="${appName}">
                  <Routes>
                    {/* TODO: Add routes here */}
                    <Route path="/" element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                      <Route index element={<Heading data-size="lg">${pascal}</Heading>} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </ErrorBoundary>
        </DialogProvider>
      </DesignsystemetProvider>
    </I18nProvider>
  );
}
`,
  );

  // Empty routes directory
  const routesDir = path.join(appDir, 'src', 'routes');
  if (!dryRun && !fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }

  await writer.execute();
  writer.printSummary();

  // Manual steps
  printManualStep('Add AppId type:', `Update packages/shared/src/types/common.ts AppId union to include '${appName}'`);

  printManualStep(
    'Add dev script to root package.json:',
    `"dev:${appName}": "pnpm --filter @digipicks/${appName} dev"`,
  );

  printManualStep('Install dependencies:', 'pnpm install');

  printManualStep(
    'Add navigation config (if needed):',
    `Add ${pascal.toUpperCase()}_NAV_SECTIONS to packages/shared/src/navigation.ts`,
  );

  printSuccess(`App "${appName}" scaffolded at apps/${appName}/.\n` + `  Port: ${port}\n` + `  Layout: ${layout}`);
}
