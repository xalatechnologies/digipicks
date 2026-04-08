/**
 * Gatekeeper Rules — Canonical decisions and prohibitions for the DigilistSaaS codebase.
 *
 * Use this as the authoritative source when:
 * - AI agents are generating or modifying code
 * - Developers are onboarding or making architectural decisions
 * - Code reviews need to validate against standards
 *
 * These rules are non-negotiable. Violations block approval.
 */

export interface GatekeeperRule {
  id: string;
  category: 'prohibition' | 'requirement' | 'preference';
  description: string;
  /** What to do instead */
  alternative?: string;
  /** Import path or package */
  source?: string;
  /** Related docs */
  docs?: string[];
}

/** Prohibitions — NEVER do these */
export const PROHIBITIONS: GatekeeperRule[] = [
  {
    id: 'no-app-local-auth',
    category: 'prohibition',
    description: 'Do not implement app-local useAuth, AuthProvider, or session handling.',
    alternative: 'Import AuthProvider, useAuth from @digilist-saas/app-shell',
    source: '@digilist-saas/app-shell',
    docs: ['docs/SHARED_INFRASTRUCTURE.md'],
  },
  {
    id: 'no-app-local-realtime',
    category: 'prohibition',
    description: 'Do not implement custom realtime or WebSocket providers.',
    alternative: 'Use RealtimeProvider or ConvexRealtimeProvider from @digilist-saas/app-shell',
    source: '@digilist-saas/app-shell',
    docs: ['docs/SHARED_INFRASTRUCTURE.md'],
  },
  {
    id: 'no-direct-digdir',
    category: 'prohibition',
    description: 'Do not import from @digdir/* packages directly in apps.',
    alternative: 'Import from @digilist-saas/ds',
    source: '@digilist-saas/ds',
    docs: ['scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md'],
  },
  {
    id: 'no-raw-html',
    category: 'prohibition',
    description: 'Do not use raw <button>, <input>, <select>, <h1>-<h6>, <p>, <table> for UI.',
    alternative: 'Use DS components: Button, Textfield, Select, Heading, Paragraph, DataTable',
    source: '@digilist-saas/ds',
    docs: ['scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md'],
  },
  {
    id: 'no-inline-svg',
    category: 'prohibition',
    description: 'Do not use inline <svg> elements.',
    alternative: 'Use Icon components from @digilist-saas/ds (SearchIcon, UserIcon, etc.)',
    source: '@digilist-saas/ds',
    docs: ['scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md'],
  },
  {
    id: 'no-plain-css',
    category: 'prohibition',
    description: 'Do not use plain .css files for component styles.',
    alternative: 'Use .module.css (ESLint: require-css-modules)',
    source: '@digilist-saas/ds',
  },
  {
    id: 'no-hardcoded-colors',
    category: 'prohibition',
    description: 'Do not use hardcoded rgb, rgba, or hex colors in styles.',
    alternative: 'Use design tokens (--ds-color-*, --brand-*)',
    source: '@digilist-saas/ds',
  },
  {
    id: 'no-hardcoded-pixels',
    category: 'prohibition',
    description: 'Do not use px for spacing in inline styles.',
    alternative: 'Use --ds-size-* tokens or CSS modules',
    source: '@digilist-saas/ds',
  },
];

/** Requirements — ALWAYS do these */
export const REQUIREMENTS: GatekeeperRule[] = [
  {
    id: 'import-ui-from-ds',
    category: 'requirement',
    description: 'Import all UI components from @digilist-saas/ds',
    source: '@digilist-saas/ds',
  },
  {
    id: 'import-styles-once',
    category: 'requirement',
    description: 'Import @digilist-saas/ds/styles exactly once in app entry (main.tsx)',
    source: '@digilist-saas/ds',
  },
  {
    id: 'use-theme-base',
    category: 'requirement',
    description: 'Import @digilist-saas/ds/platform-base for theme tokens',
    source: '@digilist-saas/ds',
  },
  {
    id: 'auth-from-app-shell',
    category: 'requirement',
    description: 'Use AuthProvider and useAuth from @digilist-saas/app-shell for authenticated apps',
    source: '@digilist-saas/app-shell',
    docs: ['docs/SHARED_INFRASTRUCTURE.md'],
  },
  {
    id: 'use-module-css',
    category: 'requirement',
    description: 'Use .module.css for all component styles',
    source: '@digilist-saas/ds',
  },
  {
    id: 'i18n-user-facing',
    category: 'requirement',
    description: 'Use t() from i18next for all user-facing strings (no hardcoded UI text)',
    source: '@digilist-saas/i18n',
  },
];

/** Decision flows — When X, do Y */
export const DECISION_FLOWS: Record<string, { when: string; then: string; source?: string }[]> = {
  'need-auth': [
    { when: 'User must log in to access', then: 'Use AuthProvider + ProtectedRoute from app-shell', source: '@digilist-saas/app-shell' },
    { when: 'Backoffice admin/case handler', then: 'Use AuthBridge + ProtectedRouteConnected', source: '@digilist-saas/app-shell' },
  ],
  'need-button': [
    { when: 'Primary action', then: 'Use <Button> from @digilist-saas/ds', source: '@digilist-saas/ds' },
    { when: 'Button as link', then: 'Use <Button asChild><a href="...">', source: '@digilist-saas/ds' },
  ],
  'need-input': [
    { when: 'Text input', then: 'Use <Textfield> or <Field><Field.Input>', source: '@digilist-saas/ds' },
    { when: 'Dropdown select', then: 'Use <Select> or <NativeSelect>', source: '@digilist-saas/ds' },
    { when: 'Checkbox', then: 'Use <Checkbox>', source: '@digilist-saas/ds' },
    { when: 'File upload', then: 'Use <FileUpload> from @digilist-saas/ds', source: '@digilist-saas/ds' },
  ],
  'need-layout': [
    { when: 'Page structure', then: 'Use ContentLayout, ContentSection, PageHeader', source: '@digilist-saas/ds' },
    { when: 'Side panel/filters', then: 'Use Drawer or FilterDrawer', source: '@digilist-saas/ds' },
    { when: 'Data grid', then: 'Use DataTable', source: '@digilist-saas/ds' },
    { when: 'Dashboard shell', then: 'Use DashboardLayout from app-shell', source: '@digilist-saas/app-shell' },
  ],
  'need-dialog': [
    { when: 'Confirmation (yes/no)', then: 'Use useDialog().confirm() + ConfirmDialog', source: '@digilist-saas/ds' },
    { when: 'Alert (ack only)', then: 'Use useDialog().alert() + AlertDialog', source: '@digilist-saas/ds' },
  ],
};
