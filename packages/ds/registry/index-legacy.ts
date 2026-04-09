/**
 * Legacy exports for backward compatibility
 */

export type RegistryExample = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export const examples: RegistryExample[] = [
  {
    id: 'button-basic',
    title: 'Button - basic',
    description: 'Basic primary action button using Designsystemet Button.',
    code: `import { Button } from '@digipicks/ds';

export function Example() {
  return <Button>Save</Button>;
}`,
  },
  {
    id: 'button-aschild-link',
    title: 'Button - asChild with link',
    description: 'Use asChild to render a Button as an <a> while keeping DS behavior.',
    code: `import { Button } from '@digipicks/ds';

export function Example() {
  return (
    <Button asChild>
      <a href="/dashboard">Go to dashboard</a>
    </Button>
  );
}`,
  },
];

export const rules = {
  imports: [
    "Apps must import UI only from '@digipicks/ds'.",
    "Apps must not import '@digdir/*' packages directly.",
    "Apps must import '@digipicks/ds/styles' exactly once at startup.",
    'Use @digipicks/ds/platform-base for theme base. Color theme from tenant config.',
  ],
  styling: [
    'No custom UI components in apps. Compose Designsystemet components.',
    'Use .module.css for styles (ESLint: require-css-modules).',
    'No hardcoded colors - use design tokens (ESLint: no-hardcoded-colors).',
    'Avoid custom CSS. If needed, create a DS-approved wrapper in @digipicks/ds.',
  ],
  sharedInfrastructure: [
    'Auth, realtime, RBAC, feature flags from @digipicks/app-shell only.',
    'No app-local useAuth, AuthProvider, or RealtimeProvider.',
    'See docs/SHARED_INFRASTRUCTURE.md.',
  ],
};
