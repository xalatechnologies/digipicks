/**
 * Generator: xala new app <name>
 *
 * Scaffolds a complete new thin app with provider chain, routing, and layout.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, choose } from '../lib/prompts';
import { toPascal, toKebab, toTitle } from '../lib/naming';
import { ROOT_DIR } from '../lib/constants';

export async function newApp(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New App');

  const name = toKebab(args[0] || (await ask('App name (kebab-case, e.g. "kiosk")')));
  const port = await ask('Dev server port', '5185');
  const variant = await choose('Layout variant?', ['backoffice', 'minside', 'web']);

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);
  const pascal = toPascal(name);
  const title = toTitle(name);
  const base = `apps/${name}`;

  // 1. package.json
  writer.create(`${base}/package.json`, JSON.stringify({
    name: `@digilist-saas/${name}`,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: `vite --port ${port}`,
      build: 'vite build',
      preview: 'vite preview',
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
    },
    dependencies: {
      '@digilist-saas/ds': 'workspace:*',
      '@digilist-saas/app-shell': 'workspace:*',
      '@digilist-saas/i18n': 'workspace:*',
      '@digilist-saas/sdk': 'workspace:*',
      '@digilist-saas/shared': 'workspace:*',
      convex: '^1.31.7',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.22.0',
    },
    devDependencies: {
      '@types/react': '^18.3.12',
      '@types/react-dom': '^18.3.1',
      '@vitejs/plugin-react': '^4.3.4',
      typescript: '~5.6.3',
      vite: '^6.0.0',
    },
  }, null, 2) + '\n');

  // 2. index.html
  writer.create(`${base}/index.html`, `<!doctype html>
<html lang="no">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

  // 3. tsconfig.json
  writer.create(`${base}/tsconfig.json`, JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      paths: {
        '@/*': ['./src/*'],
        '@digilist-saas/sdk': ['../../packages/sdk/src'],
        '@digilist-saas/sdk/*': ['../../packages/sdk/src/*'],
      },
    },
    include: ['src'],
  }, null, 2) + '\n');

  // 4. vite.config.ts
  writer.create(`${base}/vite.config.ts`, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@digilist-saas/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@digilist-saas/sdk'],
  },
  server: {
    port: ${port},
  },
});
`);

  // 5. src/vite-env.d.ts
  writer.create(`${base}/src/vite-env.d.ts`, `/// <reference types="vite/client" />
`);

  // 6. src/main.tsx
  writer.create(`${base}/src/main.tsx`, `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { XalaConvexProvider } from '@digilist-saas/sdk';

import '@digilist-saas/ds/styles';
import '@digilist-saas/ds/platform-base';
import { App } from '@/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <XalaConvexProvider>
      <App />
    </XalaConvexProvider>
  </StrictMode>,
);
`);

  // 7. src/App.tsx — variant-specific
  writer.create(`${base}/src/App.tsx`, generateAppTsx(name, variant, pascal));

  // 8. Dashboard page
  writer.create(`${base}/src/routes/dashboard.tsx`, `import {
  Heading,
  Paragraph,
  PageContentLayout,
  DashboardPageHeader,
} from '@digilist-saas/ds';
import { useSetPageTitle } from '@digilist-saas/app-shell';
import { useT } from '@digilist-saas/i18n';

export function DashboardPage() {
  const t = useT();
  useSetPageTitle(t('dashboard.title', 'Dashboard'));

  return (
    <PageContentLayout data-gap="sm">
      <DashboardPageHeader />
      <Heading level={1} data-size="lg">
        {t('dashboard.title', 'Dashboard')}
      </Heading>
      <Paragraph>
        {t('dashboard.welcomeBack', 'Welcome to ${title}.')}
      </Paragraph>
    </PageContentLayout>
  );
}
`);

  // 9. Login page
  writer.create(`${base}/src/routes/login.tsx`, `import { Heading, Paragraph, Button, Stack, Card, PageContentLayout } from '@digilist-saas/ds';
import { useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();

  return (
    <PageContentLayout>
      <Stack direction="vertical" align="center" spacing="var(--ds-size-6)">
        <Card data-color="neutral">
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Heading level={1} data-size="lg">{t('auth.signIn', 'Logg inn')}</Heading>
            <Paragraph>{t('auth.signInDescription', 'Logg inn for å fortsette.')}</Paragraph>
            {/* TODO: Add auth login options */}
          </Stack>
        </Card>
      </Stack>
    </PageContentLayout>
  );
}
`);

  await writer.execute();
  writer.printSummary();

  printManualStep('Add workspace to root pnpm-workspace.yaml if not already included.', `apps/${name}`);
  printManualStep('Install dependencies:', 'pnpm install');
  printManualStep('Start the app:', `cd apps/${name} && pnpm dev`);

  printSuccess(`App "${name}" scaffolded at apps/${name}/. Port: ${port}`);
}

function generateAppTsx(name: string, variant: string, pascal: string): string {
  if (variant === 'backoffice') {
    return `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DesignsystemetProvider, DialogProvider, ErrorBoundary, ToastProvider } from '@digilist-saas/ds';
import { DEFAULT_THEME } from '@digilist-saas/ds';
import { I18nProvider } from '@digilist-saas/i18n';
import {
  AuthBridge,
  BackofficeRoleProvider,
  ConvexRealtimeProvider,
  NotificationCenterProvider,
  NotificationCenterPanel,
  useBackofficeAuth,
  useBackofficeRole,
  ThemeProvider,
  useTheme,
  env,
} from '@digilist-saas/app-shell';
import { BackofficeProtectedRouteConnected } from '@digilist-saas/app-shell';
import { DashboardLayout } from '@digilist-saas/app-shell';
import { DashboardPage } from '@/routes/dashboard';
import { LoginPage } from '@/routes/login';

function LayoutBridge() {
  const { user, logout } = useBackofficeAuth();
  const { effectiveRole } = useBackofficeRole();
  return (
    <>
      <DashboardLayout variant="backoffice" user={user} onLogout={logout} effectiveRole={effectiveRole} />
      <NotificationCenterPanel />
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DesignsystemetProvider theme={DEFAULT_THEME} colorScheme="light" size="md">
          <DialogProvider>
            <ErrorBoundary>
              <ToastProvider>
                <BrowserRouter>
                  <AuthBridge>
                    <BackofficeRoleProvider>
                      <ConvexRealtimeProvider>
                        <NotificationCenterProvider>
                          <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/" element={<BackofficeProtectedRouteConnected><LayoutBridge /></BackofficeProtectedRouteConnected>}>
                              <Route index element={<DashboardPage />} />
                              {/* Add routes here */}
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </NotificationCenterProvider>
                      </ConvexRealtimeProvider>
                    </BackofficeRoleProvider>
                  </AuthBridge>
                </BrowserRouter>
              </ToastProvider>
            </ErrorBoundary>
          </DialogProvider>
        </DesignsystemetProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
`;
  }

  if (variant === 'minside') {
    return `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DesignsystemetProvider, DialogProvider, ErrorBoundary, ToastProvider } from '@digilist-saas/ds';
import { DEFAULT_THEME } from '@digilist-saas/ds';
import { I18nProvider } from '@digilist-saas/i18n';
import {
  AuthProvider,
  useAuth,
  ConvexRealtimeProvider,
  NotificationCenterProvider,
  ThemeProvider,
  env,
} from '@digilist-saas/app-shell';
import { DashboardLayout } from '@digilist-saas/app-shell';
import { ProtectedRoute } from '@digilist-saas/app-shell';
import { DashboardPage } from '@/routes/dashboard';
import { LoginPage } from '@/routes/login';

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DesignsystemetProvider theme={DEFAULT_THEME} colorScheme="light" size="md">
          <DialogProvider>
            <ErrorBoundary>
              <ToastProvider>
                <BrowserRouter>
                  <AuthProvider appId="${name}">
                    <ConvexRealtimeProvider>
                      <NotificationCenterProvider>
                        <Routes>
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/" element={<ProtectedRoute><DashboardLayout variant="minside" /></ProtectedRoute>}>
                            <Route index element={<DashboardPage />} />
                            {/* Add routes here */}
                          </Route>
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </NotificationCenterProvider>
                    </ConvexRealtimeProvider>
                  </AuthProvider>
                </BrowserRouter>
              </ToastProvider>
            </ErrorBoundary>
          </DialogProvider>
        </DesignsystemetProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
`;
  }

  // web variant (public, no sidebar)
  return `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DesignsystemetProvider, DialogProvider, ErrorBoundary, ToastProvider } from '@digilist-saas/ds';
import { DEFAULT_THEME } from '@digilist-saas/ds';
import { I18nProvider } from '@digilist-saas/i18n';
import { ThemeProvider } from '@digilist-saas/app-shell';
import { DashboardPage } from '@/routes/dashboard';

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DesignsystemetProvider theme={DEFAULT_THEME} colorScheme="light" size="md">
          <DialogProvider>
            <ErrorBoundary>
              <ToastProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    {/* Add routes here */}
                  </Routes>
                </BrowserRouter>
              </ToastProvider>
            </ErrorBoundary>
          </DialogProvider>
        </DesignsystemetProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
`;
}
