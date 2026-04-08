import { cspPlugin } from './middleware.ts';

import type { StorybookConfig } from '@storybook/react-vite';

const getAbsolutePath = (packageName: string): string => {
  // For Storybook 10 ES modules, use a simpler approach
  return packageName;
};

const config: StorybookConfig = {
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {
      strictMode: false,
    },
  },
  stories: [
    // Standalone package: stories in src/stories
    '../src/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  // Static directories for standalone package
  staticDirs: [
    { from: './public/vendor', to: '/vendor' },
    { from: './public', to: '/' },
    { from: '../src/themes', to: '/themes' },
  ],
  addons: [
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-coverage'),
    getAbsolutePath('./addons/xala-theme-addon/preset.cjs'),
    getAbsolutePath('@storybook/addon-docs'),
  ],
  docs: {},
  previewHead: (head) => `
    ${head}
    <link rel="stylesheet" href="/vendor/designsystemet.css" />
    <!-- Theme CSS is injected dynamically by DesignsystemetProvider -->
  `,
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
  viteFinal: async (config) => {
    // Resolve src path for @ alias
    const srcPath = new URL('../src', import.meta.url).pathname;

    return {
      ...config,
      plugins: [...(config.plugins || []), cspPlugin()],
      resolve: {
        ...config.resolve,
        alias: [
          // Spread existing aliases
          ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : []),

          // Backward compat: specific paths MUST come before generic @ (order matters)
          { find: '@/primitives', replacement: `${srcPath}/_core/primitives` },
          { find: '@/composed', replacement: `${srcPath}/_core/composed` },
          { find: '@/shells', replacement: `${srcPath}/_core/shells` },
          { find: '@/core', replacement: `${srcPath}/_core` },
          { find: '@/patterns', replacement: `${srcPath}/_patterns` },
          { find: '@/blocks', replacement: `${srcPath}/listings` },
          { find: '@/components', replacement: srcPath },

          // Feature paths
          { find: '@/auth', replacement: `${srcPath}/auth` },
          { find: '@/bookings', replacement: `${srcPath}/bookings` },
          { find: '@/calendar', replacement: `${srcPath}/calendar` },
          { find: '@/compliance', replacement: `${srcPath}/compliance` },
          { find: '@/dashboard', replacement: `${srcPath}/dashboard` },
          { find: '@/analytics', replacement: `${srcPath}/analytics` },
          { find: '@/listings', replacement: `${srcPath}/listings` },
          { find: '@/messaging', replacement: `${srcPath}/messaging` },
          { find: '@/notifications', replacement: `${srcPath}/notifications` },
          { find: '@/organizations', replacement: `${srcPath}/organizations` },
          { find: '@/pricing', replacement: `${srcPath}/pricing` },
          { find: '@/rbac', replacement: `${srcPath}/rbac` },
          { find: '@/reviews', replacement: `${srcPath}/reviews` },
          { find: '@/user-prefs', replacement: `${srcPath}/user-prefs` },
          { find: '@/cms', replacement: `${srcPath}/cms` },
          { find: '@/integrations', replacement: `${srcPath}/integrations` },

          // Package aliases
          { find: '@digilist-saas/design-system', replacement: srcPath },
          { find: '@xala-technologies/ui', replacement: srcPath },
          { find: '@digilist-saas/i18n', replacement: new URL('../../../packages/i18n/src', import.meta.url).pathname },

          // Generic @ alias LAST (catches @/stories, @/themes, @/utils, etc.)
          { find: /^@\//, replacement: `${srcPath}/` },
          { find: '/src', replacement: srcPath },
        ],
        extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      },
      define: {
        ...config.define,
        // Fix for Chromatic: prevent Node.js APIs from being called in browser
        'process.env': {},
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include || []),
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          '@digdir/designsystemet-react',
          'lucide-react',
          'react-router-dom',
        ],
        esbuildOptions: {
          ...config.optimizeDeps?.esbuildOptions,
          define: {
            global: 'globalThis',
          },
        },
      },
      build: {
        ...config.build,
        // Increase chunk size warning limit since Storybook naturally has larger chunks
        chunkSizeWarningLimit: 1500,
      },
    };
  },
};

export default config;
