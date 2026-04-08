/**
 * Designsystemet Component Registry
 *
 * This registry provides comprehensive documentation, examples, and guidelines
 * for all Designsystemet components available through @digilist-saas/ds.
 *
 * Two access methods are available:
 * 1. TypeScript-based registry (complex, fully typed)
 * 2. JSON-based registry (simple, lightweight)
 *
 * @example
 * ```typescript
 * // Simple JSON registry (recommended)
 * import { components, patterns, examples } from '@digilist-saas/ds/registry';
 *
 * // Get component info
 * const buttonInfo = components.button;
 *
 * // Get all examples for a component
 * const buttonExamples = Object.values(examples).filter(e => e.component === 'button');
 * ```
 */

// Export the simple JSON-based registry (recommended)
export * from './registry';

// Export the complex TypeScript registry (legacy) with namespace to avoid conflicts
export * as tsRegistry from './components';
export * as tsPatterns from './patterns';
export * as tsExamples from './examples';
export * as tsGuidelines from './guidelines';
export * as providers from './providers';

// Gazetteer and gatekeeper — for AI agents and tooling
export {
  GAZETTEER_INDEX,
  resolveNeed,
  PROHIBITIONS,
  REQUIREMENTS,
  DECISION_FLOWS,
} from './gazetteer';

// Legacy exports for backward compatibility
export type { CodeExample as RegistryExample } from './examples';
export { examples as legacyExamples, rules } from './index-legacy';
