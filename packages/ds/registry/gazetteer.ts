/**
 * Gazetteer — Structured index of the DigilistSaaS design system and platform standards.
 *
 * A gazetteer is an geographical index; here it indexes our "geography" of components,
 * patterns, standards, and conventions. Use this for:
 * - AI agents: programmatic lookup before generating code
 * - Developers: guided tour and quick reference
 * - Tooling: validation and code generation
 */

import { components } from './registry';
import { patterns } from './registry';
import { guidelines } from './registry';
import { providers } from './providers';
import { PROHIBITIONS, REQUIREMENTS, DECISION_FLOWS } from './gatekeeper';

export interface GazetteerSection {
  id: string;
  title: string;
  description: string;
  /** Path to detailed content */
  path: string;
  /** Entry count */
  count: number;
}

/** High-level index of all registry sections */
export const GAZETTEER_INDEX: GazetteerSection[] = [
  {
    id: 'components',
    title: 'Component Dictionary',
    description: 'UI components — Digdir primitives + custom @digilist-saas/ds composed/block components',
    path: '@digilist-saas/ds/registry',
    count: Object.keys(components).length,
  },
  {
    id: 'patterns',
    title: 'Pattern Dictionary',
    description: 'UI patterns — form validation, theme switching, asChild, etc.',
    path: '@digilist-saas/ds/registry',
    count: Object.keys(patterns).length,
  },
  {
    id: 'guidelines',
    title: 'Standards Guide',
    description: 'Guidelines — imports, styling, accessibility, shared infrastructure, CSS modules',
    path: '@digilist-saas/ds/registry',
    count: Object.keys(guidelines).length,
  },
  {
    id: 'providers',
    title: 'Provider Stack',
    description: 'Canonical provider composition — Convex, Theme, Auth, Realtime, etc.',
    path: '@digilist-saas/ds/registry (providers)',
    count: Object.keys(providers).length,
  },
  {
    id: 'gatekeeper',
    title: 'Gatekeeper Rules',
    description: 'Prohibitions, requirements, decision flows — non-negotiable standards',
    path: '@digilist-saas/ds/registry (gatekeeper)',
    count: PROHIBITIONS.length + REQUIREMENTS.length,
  },
];

/** Resolve "I need X" to canonical component/pattern */
export function resolveNeed(need: string): { component?: string; pattern?: string; source: string } | null {
  const lower = need.toLowerCase();
  // Simple keyword mapping — can be extended
  const map: Record<string, { component?: string; pattern?: string; source: string }> = {
    'button': { component: 'button', source: '@digilist-saas/ds' },
    'auth': { component: 'authProvider', source: '@digilist-saas/app-shell' },
    'form': { pattern: 'formValidation', source: '@digilist-saas/ds' },
    'table': { component: 'dataTable', source: '@digilist-saas/ds' },
    'dialog': { component: 'confirmDialog', source: '@digilist-saas/ds' },
    'drawer': { component: 'drawer', source: '@digilist-saas/ds' },
    'filter': { component: 'filterDrawer', source: '@digilist-saas/ds' },
    'theme': { pattern: 'themeSwitching', source: '@digilist-saas/ds' },
  };
  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

export { components, patterns, guidelines } from './registry';
export { providers } from './providers';
export { PROHIBITIONS, REQUIREMENTS, DECISION_FLOWS } from './gatekeeper';
