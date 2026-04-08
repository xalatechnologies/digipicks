/**
 * Usage guidelines and best practices for Designsystemet.
 * 
 * This file contains comprehensive guidelines for using Designsystemet
 * components correctly and consistently across applications.
 */

export interface Guideline {
  /** Unique identifier */
  id: string;
  /** Guideline title */
  title: string;
  /** Detailed description */
  description: string;
  /** Category of guideline */
  category: 'accessibility' | 'styling' | 'usage' | 'performance' | 'architecture';
  /** Importance level */
  level: 'required' | 'recommended' | 'suggested';
  /** Examples of what to do */
  do: string[];
  /** Examples of what not to do */
  dont: string[];
  /** Related guidelines */
  related?: string[];
}

export const guidelines: Record<string, Guideline> = {
  // Import Guidelines
  imports: {
    id: 'imports',
    title: 'Import Rules',
    description: 'Proper import practices for Designsystemet components.',
    category: 'architecture',
    level: 'required',
    do: [
      'Import all components from @digilist-saas/ds',
      'Import styles once in the application entry point',
      'Use named imports for better tree shaking',
    ],
    dont: [
      'Import directly from @digdir/* packages',
      'Import styles in multiple places',
      'Use default imports for components',
    ],
    related: ['styling', 'performance'],
  },

  // Styling Guidelines
  styling: {
    id: 'styling',
    title: 'Styling and Customization',
    description: 'How to style components without breaking the design system.',
    category: 'styling',
    level: 'required',
    do: [
      'Use component variants for different styles',
      'Apply design tokens for consistency',
      'Create wrapper components in @digilist-saas/ds if needed',
      'Use CSS variables for theme customization',
    ],
    dont: [
      'Override component styles with !important',
      'Hardcode colors and spacing',
      'Create custom UI components in applications',
      'Modify component internals',
    ],
    related: ['imports', 'theming'],
  },

  // Accessibility Guidelines
  accessibility: {
    id: 'accessibility',
    title: 'Accessibility Requirements',
    description: 'Ensuring components are accessible to all users.',
    category: 'accessibility',
    level: 'required',
    do: [
      'Test with keyboard navigation',
      'Ensure proper color contrast',
      'Provide alt text for images',
      'Use semantic HTML elements',
      'Announce state changes to screen readers',
    ],
    dont: [
      'Rely on color alone for meaning',
      'Remove focus indicators',
      'Use divs for interactive elements',
      'Skip ARIA attributes',
    ],
    related: ['keyboard', 'screenReader'],
  },

  // Keyboard Navigation
  keyboard: {
    id: 'keyboard',
    title: 'Keyboard Navigation',
    description: 'Ensuring all interactive elements work with keyboard.',
    category: 'accessibility',
    level: 'required',
    do: [
      'Support Tab and Shift+Tab navigation',
      'Provide Enter and Space key activation',
      'Include Escape key for closing modals',
      'Maintain visible focus indicators',
    ],
    dont: [
      'Trap focus unintentionally',
      'Skip interactive elements in tab order',
      'Remove outline on focus',
      'Ignore keyboard events',
    ],
    related: ['accessibility', 'modal'],
  },

  // Screen Reader Support
  screenReader: {
    id: 'screenReader',
    title: 'Screen Reader Support',
    description: 'Making content accessible to screen reader users.',
    category: 'accessibility',
    level: 'required',
    do: [
      'Use proper heading hierarchy',
      'Provide descriptive labels',
      'Announce dynamic content changes',
      'Use ARIA live regions for notifications',
    ],
    dont: [
      'Use placeholder text as labels',
      'Hide content from screen readers unnecessarily',
      'Forget to announce state changes',
      'Use empty alt attributes for meaningful images',
    ],
    related: ['accessibility', 'dynamics'],
  },

  // Performance Guidelines
  performance: {
    id: 'performance',
    title: 'Performance Optimization',
    description: 'Keeping applications fast and efficient.',
    category: 'performance',
    level: 'recommended',
    do: [
      'Lazy load heavy components',
      'Use React.memo for expensive components',
      'Optimize re-renders with proper keys',
      'Bundle split by route',
    ],
    dont: [
      'Import all components upfront',
      'Create unnecessary re-renders',
      'Use index as map key',
      'Ignore bundle size',
    ],
    related: ['imports', 'bundle'],
  },

  // Bundle Size
  bundle: {
    id: 'bundle',
    title: 'Bundle Size Management',
    description: 'Keeping the application bundle size small.',
    category: 'performance',
    level: 'recommended',
    do: [
      'Analyze bundle size regularly',
      'Use dynamic imports for code splitting',
      'Remove unused dependencies',
      'Optimize images and assets',
    ],
    dont: [
      'Include large libraries unnecessarily',
      'Ignore bundle analyzer warnings',
      'Ship unused code to production',
      'Forget to optimize images',
    ],
    related: ['performance', 'imports'],
  },

  // Theming
  theming: {
    id: 'theming',
    title: 'Theme Implementation',
    description: 'Proper theme switching and customization.',
    category: 'styling',
    level: 'required',
    do: [
      'Use DesignsystemetProvider for theme management',
      'Switch themes via data attributes',
      'Load theme CSS once per application',
      'Test all components in each theme',
    ],
    dont: [
      'Load multiple theme CSS files',
      'Hardcode theme-specific styles',
      'Bypass the theme provider',
      'Ignore dark mode support',
    ],
    related: ['styling', 'imports'],
  },

  // Modal Guidelines
  modal: {
    id: 'modal',
    title: 'Modal and Dialog Usage',
    description: 'Best practices for modal dialogs.',
    category: 'usage',
    level: 'required',
    do: [
      'Trap focus within the modal',
      'Close on Escape key',
      'Provide a close button',
      'Restore focus on close',
    ],
    dont: [
      'Open multiple modals at once',
      'Prevent modal from closing',
      'Forget backdrop click handling',
      'Ignore focus management',
    ],
    related: ['accessibility', 'keyboard'],
  },

  // Form Guidelines
  forms: {
    id: 'forms',
    title: 'Form Design Patterns',
    description: 'Creating accessible and usable forms.',
    category: 'usage',
    level: 'required',
    do: [
      'Group related fields with Fieldset',
      'Associate labels with inputs',
      'Provide clear error messages',
      'Validate on blur and submit',
    ],
    dont: [
      'Use placeholder as label',
      'Show errors while typing',
      'Submit forms with critical errors',
      'Forget required field indicators',
    ],
    related: ['validation', 'accessibility'],
  },

  // Validation
  validation: {
    id: 'validation',
    title: 'Form Validation',
    description: 'Implementing user-friendly form validation.',
    category: 'usage',
    level: 'required',
    do: [
      'Provide inline error messages',
      'Use ErrorSummary for multiple errors',
      'Mark invalid fields with aria-invalid',
      'Allow correction after validation',
    ],
    dont: [
      'Use alerts for validation errors',
      'Clear form on validation error',
      'Block all input on first error',
      'Use only color for errors',
    ],
    related: ['forms', 'accessibility'],
  },

  // Dynamic Content
  dynamics: {
    id: 'dynamics',
    title: 'Dynamic Content Updates',
    description: 'Handling content changes gracefully.',
    category: 'accessibility',
    level: 'recommended',
    do: [
      'Announce content changes to screen readers',
      'Provide loading indicators',
      'Maintain scroll position when possible',
      'Use transitions for smooth updates',
    ],
    dont: [
      'Move focus without warning',
      'Auto-refresh without indication',
      'Ignore loading states',
      'Create jarring animations',
    ],
    related: ['accessibility', 'performance'],
  },

  // Responsive Design
  responsive: {
    id: 'responsive',
    title: 'Responsive Design',
    description: 'Ensuring components work on all screen sizes.',
    category: 'usage',
    level: 'required',
    do: [
      'Test on mobile devices',
      'Use responsive breakpoints',
      'Consider touch targets',
      'Optimize for mobile first',
    ],
    dont: [
      'Fixed width layouts',
      'Small touch targets',
      'Horizontal scrolling on mobile',
      'Ignore viewport meta tag',
    ],
    related: ['accessibility', 'styling'],
  },

  // Error Handling
  errors: {
    id: 'errors',
    title: 'Error Handling',
    description: 'Graceful error handling and recovery.',
    category: 'usage',
    level: 'required',
    do: [
      'Show user-friendly error messages',
      'Provide recovery actions',
      'Log errors for debugging',
      'Maintain application state',
    ],
    dont: [
      'Show technical error details',
      'Lose user data on error',
      'Crash the entire application',
      'Ignore error boundaries',
    ],
    related: ['validation', 'accessibility'],
  },

  // Testing
  testing: {
    id: 'testing',
    title: 'Testing Guidelines',
    description: 'Testing components and patterns.',
    category: 'architecture',
    level: 'recommended',
    do: [
      'Test accessibility with keyboard',
      'Test with screen readers',
      'Write unit tests for logic',
      'Visual test all variants',
    ],
    dont: [
      'Skip accessibility testing',
      'Test only with mouse',
      'Ignore edge cases',
      'Forget visual regression tests',
    ],
    related: ['accessibility', 'performance'],
  },

  // Shared Infrastructure (docs/SHARED_INFRASTRUCTURE.md)
  sharedInfrastructure: {
    id: 'sharedInfrastructure',
    title: 'Shared Infrastructure',
    description: 'Auth, realtime, RBAC, feature flags must come from @digilist-saas/app-shell or @digilist-saas/sdk.',
    category: 'architecture',
    level: 'required',
    do: [
      'Import AuthProvider, useAuth from @digilist-saas/app-shell',
      'Import RealtimeProvider or ConvexRealtimeProvider from app-shell',
      'Import FeatureGate, useRBAC from app-shell',
      'Use XalaConvexProvider from @digilist-saas/sdk',
    ],
    dont: [
      'Implement app-local auth, realtime, or RBAC',
      'Import auth from custom hooks',
      'Bypass shared provider stack',
    ],
    related: ['imports'],
  },

  // CSS Modules (ESLint: require-css-modules, no-hardcoded-colors, no-hardcoded-pixels)
  cssModules: {
    id: 'cssModules',
    title: 'CSS Modules',
    description: 'Use .module.css for component styles. Enforced by ESLint.',
    category: 'styling',
    level: 'required',
    do: [
      'Use .module.css for all component styles',
      'Use design tokens (--ds-*) not hardcoded colors',
      'Use --ds-size-* for spacing, not --ds-spacing-* or px',
    ],
    dont: [
      'Use plain .css files',
      'Hardcode rgb/rgba/hex colors',
      'Use inline styles for layout',
      'Use px for spacing (prefer tokens)',
    ],
    related: ['styling'],
  },
};

export const guidelineCategories = {
  accessibility: ['accessibility', 'keyboard', 'screenReader'],
  styling: ['styling', 'theming', 'cssModules'],
  usage: ['modal', 'forms', 'validation', 'dynamics', 'responsive', 'errors'],
  performance: ['performance', 'bundle'],
  architecture: ['imports', 'testing', 'sharedInfrastructure'],
} as const;

export type GuidelineCategory = keyof typeof guidelineCategories;
export type GuidelineId = keyof typeof guidelines;

/**
 * Get all guidelines for a specific category.
 */
export function getGuidelinesByCategory(category: GuidelineCategory): Guideline[] {
  const ids = guidelineCategories[category];
  return ids.map(id => guidelines[id]).filter((g): g is Guideline => g !== undefined);
}

/**
 * Get guidelines by importance level.
 */
export function getGuidelinesByLevel(level: 'required' | 'recommended' | 'suggested'): Guideline[] {
  return Object.values(guidelines).filter(g => g.level === level);
}

/**
 * Get related guidelines for a given guideline ID.
 */
export function getRelatedGuidelines(guidelineId: GuidelineId): Guideline[] {
  const guideline = guidelines[guidelineId];
  if (!guideline?.related) return [];
  
  return guideline.related
    .map(id => guidelines[id])
    .filter((g): g is Guideline => g !== undefined);
}
