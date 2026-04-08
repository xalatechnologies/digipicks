/**
 * Simple JSON-based registry access utilities.
 *
 * This provides a lightweight alternative to the complex TypeScript registry,
 * using a single JSON file as the source of truth.
 */

// Import JSON directly - this works in the built package
import registryData from './registry.json';

// Type definitions for the JSON registry
type Component = {
  id: string;
  name: string;
  category: string;
  description: string;
  importPath: string;
  supportsAsChild?: boolean;
  a11yFeatures?: string[];
  useCases?: string[];
  related?: string[];
  props?: Record<string, unknown>;
  subComponents?: Record<string, string>;
};

type Pattern = {
  id: string;
  name: string;
  description: string;
  components: string[];
  whenToUse: string[];
  a11y: string[];
  related?: string[];
};

type Example = {
  id: string;
  title: string;
  description: string;
  component?: string;
  code: string;
  tags?: string[];
};

type Guideline = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'required' | 'recommended' | 'suggested';
  do: string[];
  dont: string[];
};

type Registry = {
  version: string;
  lastUpdated: string;
  components: Record<string, Component>;
  patterns: Record<string, Pattern>;
  examples: Record<string, Example>;
  guidelines: Record<string, Guideline>;
  rules: Record<string, string[]>;
  metadata: {
    totalComponents: number;
    totalPatterns: number;
    totalExamples: number;
    totalGuidelines: number;
    categories: Record<string, string[]>;
    themes: string[];
    dataAttributes: Record<string, string[]>;
  };
};

// Type assertion to handle JSON import
export const registry: Registry = registryData as Registry;

// Convenience exports
export const components = registry.components;
export const patterns = registry.patterns;
export const examples = registry.examples;
export const guidelines = registry.guidelines;
export const rules = registry.rules;
export const metadata = registry.metadata;

// Utility functions
export function getComponent(id: string): Component | undefined {
  return components[id];
}

export function getPattern(id: string): Pattern | undefined {
  return patterns[id];
}

export function getExample(id: string): Example | undefined {
  return examples[id];
}

export function getGuideline(id: string): Guideline | undefined {
  return guidelines[id];
}

export function getComponentsByCategory(category: string): Component[] {
  return Object.values(components).filter(c => c.category === category);
}

export function getExamplesForComponent(componentId: string): Example[] {
  return Object.values(examples).filter(e => e.component === componentId);
}

export function searchRegistry(query: string): {
  components: Component[];
  patterns: Pattern[];
  examples: Example[];
  guidelines: Guideline[];
} {
  const lowerQuery = query.toLowerCase();

  return {
    components: Object.values(components).filter(
      c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.category.toLowerCase().includes(lowerQuery)
    ),
    patterns: Object.values(patterns).filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    ),
    examples: Object.values(examples).filter(
      e =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.description.toLowerCase().includes(lowerQuery) ||
        e.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    ),
    guidelines: Object.values(guidelines).filter(
      g =>
        g.title.toLowerCase().includes(lowerQuery) ||
        g.description.toLowerCase().includes(lowerQuery)
    ),
  };
}

// Export types for external use
export type {
  Component,
  Pattern,
  Example,
  Guideline,
  Registry,
};
