/**
 * Example implementations for Designsystemet patterns and usage.
 *
 * This file exports all example components that demonstrate proper
 * usage of Designsystemet components and patterns.
 */

// Re-export all examples
export * from './provider-usage';
export * from './asChild-pattern';
export * from './theme-switching';

/**
 * Example metadata for documentation generation
 */
export const exampleList = [
  {
    id: 'provider-usage',
    title: 'Provider Usage',
    description: 'Correct setup of DesignsystemetProvider and data attributes',
    file: 'provider-usage.tsx',
  },
  {
    id: 'asChild-pattern',
    title: 'asChild Pattern',
    description: 'Using asChild to render components as different elements',
    file: 'asChild-pattern.tsx',
  },
  {
    id: 'theme-switching',
    title: 'Theme Switching',
    description: 'Runtime theme switching with provider and programmatic control',
    file: 'theme-switching.tsx',
  },
] as const;
