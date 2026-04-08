/**
 * UI patterns registry for common Designsystemet component combinations.
 * 
 * This registry provides documented patterns for frequently used UI
 * combinations and layouts using Designsystemet components.
 */

export interface PatternInfo {
  /** Pattern identifier */
  id: string;
  /** Display name */
  name: string;
  /** Brief description */
  description: string;
  /** Components used in this pattern */
  components: string[];
  /** When to use this pattern */
  whenToUse: string[];
  /** Accessibility considerations */
  a11y: string[];
  /** Related patterns */
  related?: string[];
}

export const patterns: Record<string, PatternInfo> = {
  // Form Patterns
  formField: {
    id: 'form-field',
    name: 'Form Field',
    description: 'Standard form input with label, description, and error handling.',
    components: ['Field', 'Input', 'Textarea', 'Select'],
    whenToUse: [
      'Any form requiring user input',
      'When you need validation feedback',
      'For consistent form layout',
    ],
    a11y: [
      'Always associate labels with inputs',
      'Provide error messages in the field description',
      'Use appropriate input types for better mobile experience',
    ],
    related: ['formValidation', 'formLayout'],
  },
  
  formValidation: {
    id: 'form-validation',
    name: 'Form Validation',
    description: 'Comprehensive form validation with error summary and field-level errors.',
    components: ['ErrorSummary', 'Field', 'Input', 'Button'],
    whenToUse: [
      'Multi-field forms',
      'When validation errors need to be visible at form level',
      'For complex validation requirements',
    ],
    a11y: [
      'ErrorSummary must link to invalid fields',
      'Field errors should be announced',
      'Maintain focus on first invalid field',
    ],
    related: ['formField', 'formLayout'],
  },

  formLayout: {
    id: 'form-layout',
    name: 'Form Layout',
    description: 'Organized form layout with proper grouping and sections.',
    components: ['Fieldset', 'Field', 'Divider', 'Button'],
    whenToUse: [
      'Multi-section forms',
      'Related field grouping',
      'Complex data entry',
    ],
    a11y: [
      'Use Fieldset for related controls',
      'Provide clear section headings',
      'Maintain logical tab order',
    ],
    related: ['formField', 'formValidation'],
  },

  // Navigation Patterns
  primaryNavigation: {
    id: 'primary-navigation',
    name: 'Primary Navigation',
    description: 'Main site navigation with active states and responsive behavior.',
    components: ['Button', 'Link', 'Breadcrumbs'],
    whenToUse: [
      'Site header navigation',
      'Main menu structure',
      'Hierarchical navigation',
    ],
    a11y: [
      'Use semantic nav elements',
      'Indicate current page',
      'Provide skip links for keyboard users',
    ],
    related: ['pagination', 'tabs'],
  },

  tabNavigation: {
    id: 'tab-navigation',
    name: 'Tab Navigation',
    description: 'Content organization using tabbed interface.',
    components: ['Tabs', 'Card', 'Divider'],
    whenToUse: [
      'Organizing related content',
      'Settings panels',
      'Multi-step processes',
    ],
    a11y: [
      'Ensure tab panels are properly associated',
      'Support keyboard navigation',
      'Announce tab changes',
    ],
    related: ['accordion', 'primaryNavigation'],
  },

  accordion: {
    id: 'accordion',
    name: 'Accordion',
    description: 'Expandable sections for progressive disclosure.',
    components: ['Details', 'Button', 'Divider'],
    whenToUse: [
      'FAQ sections',
      'Progressive disclosure',
      'Space-constrained content',
    ],
    a11y: [
      'Announce expanded/collapsed state',
      'Support keyboard toggle',
      'Maintain focus control',
    ],
    related: ['tabNavigation', 'disclosure'],
  },

  // Data Display Patterns
  dataTable: {
    id: 'data-table',
    name: 'Data Table',
    description: 'Sortable, filterable data table with pagination.',
    components: ['Table', 'Button', 'Pagination', 'Search'],
    whenToUse: [
      'Large datasets',
      'Sortable content',
      'Filterable lists',
    ],
    a11y: [
      'Provide table headers',
      'Support row navigation',
      'Announce sort order',
    ],
    related: ['listView', 'cardGrid'],
  },

  listView: {
    id: 'list-view',
    name: 'List View',
    description: 'Structured list display with actions and metadata.',
    components: ['List', 'Button', 'Avatar', 'Tag'],
    whenToUse: [
      'Search results',
      'User lists',
      'Content directories',
    ],
    a11y: [
      'Use semantic list elements',
      'Provide descriptive links',
      'Maintain consistent structure',
    ],
    related: ['dataTable', 'cardGrid'],
  },

  cardGrid: {
    id: 'card-grid',
    name: 'Card Grid',
    description: 'Responsive grid of cards for content display.',
    components: ['Card', 'Button', 'Avatar', 'Badge'],
    whenToUse: [
      'Product catalogs',
      'Dashboard widgets',
      'Image galleries',
    ],
    a11y: [
      'Ensure proper heading hierarchy',
      'Provide alt text for images',
      'Maintain focus indicators',
    ],
    related: ['listView', 'dataTable'],
  },

  // Action Patterns
  confirmationDialog: {
    id: 'confirmation-dialog',
    name: 'Confirmation Dialog',
    description: 'Modal dialog for confirming destructive actions.',
    components: ['Dialog', 'Button', 'Alert'],
    whenToUse: [
      'Destructive actions',
      'Important confirmations',
      'Irreversible operations',
    ],
    a11y: [
      'Focus trap in dialog',
      'Provide clear action labels',
      'Support escape to cancel',
    ],
    related: ['alertToast', 'disclosure'],
  },

  alertToast: {
    id: 'alert-toast',
    name: 'Alert Toast',
    description: 'Non-modal notification for system feedback.',
    components: ['Alert', 'Button', 'Badge'],
    whenToUse: [
      'Success messages',
      'System notifications',
      'Background updates',
    ],
    a11y: [
      'Use ARIA live regions',
      'Provide dismiss option',
      'Do not auto-dismiss too quickly',
    ],
    related: ['confirmationDialog', 'inlineValidation'],
  },

  // Input Patterns
  searchWithSuggestions: {
    id: 'search-with-suggestions',
    name: 'Search with Suggestions',
    description: 'Autocomplete search with categorized suggestions.',
    components: ['Search', 'Suggestion', 'Button', 'Divider'],
    whenToUse: [
      'Site search',
      'Product search',
      'People finder',
    ],
    a11y: [
      'Announce suggestion count',
      'Support keyboard selection',
      'Provide clear categories',
    ],
    related: ['filterGroup', 'multiSelect'],
  },

  multiSelect: {
    id: 'multi-select',
    name: 'Multi-Select',
    description: 'Multiple selection with chips and autocomplete.',
    components: ['Chip', 'Button', 'Field', 'Suggestion'],
    whenToUse: [
      'Tag selection',
      'Multi-category filtering',
      'Recipient selection',
    ],
    a11y: [
      'Announce selected items',
      'Provide remove option',
      'Support keyboard removal',
    ],
    related: ['searchWithSuggestions', 'filterGroup'],
  },

  filterGroup: {
    id: 'filter-group',
    name: 'Filter Group',
    description: 'Organized filter controls for content refinement.',
    components: ['Fieldset', 'Checkbox', 'Radio', 'Button'],
    whenToUse: [
      'Product filtering',
      'Search refinement',
      'Data filtering',
    ],
    a11y: [
      'Group related filters',
      'Provide clear labels',
      'Show active filter count',
    ],
    related: ['multiSelect', 'searchWithSuggestions'],
  },

  // Feedback Patterns
  loadingStates: {
    id: 'loading-states',
    name: 'Loading States',
    description: 'Consistent loading indicators for async operations.',
    components: ['Spinner', 'Skeleton', 'Button'],
    whenToUse: [
      'Data fetching',
      'Form submission',
      'Page transitions',
    ],
    a11y: [
      'Announce loading state',
      'Provide loading feedback',
      'Maintain interactive elements',
    ],
    related: ['progressIndicator', 'emptyState'],
  },

  progressIndicator: {
    id: 'progress-indicator',
    name: 'Progress Indicator',
    description: 'Step-by-step progress for multi-stage processes.',
    components: ['Button', 'Divider', 'Tag'],
    whenToUse: [
      'Multi-step forms',
      'Checkout process',
      'Onboarding flows',
    ],
    a11y: [
      'Announce current step',
      'Provide step navigation',
      'Show completion status',
    ],
    related: ['loadingStates', 'wizard'],
  },

  emptyState: {
    id: 'empty-state',
    name: 'Empty State',
    description: 'Guidance for empty content areas with actions.',
    components: ['Button', 'Alert', 'Avatar'],
    whenToUse: [
      'No search results',
      'Empty data lists',
      'First-time user experience',
    ],
    a11y: [
      'Provide helpful description',
      'Offer clear actions',
      'Maintain page context',
    ],
    related: ['errorState', 'initialLoad'],
  },

  errorState: {
    id: 'error-state',
    name: 'Error State',
    description: 'Error display with recovery actions.',
    components: ['Alert', 'Button', 'Link'],
    whenToUse: [
      'Network errors',
      'Validation failures',
      'System errors',
    ],
    a11y: [
      'Clearly explain the error',
      'Provide recovery options',
      'Maintain accessibility',
    ],
    related: ['emptyState', 'alertToast'],
  },

  // Specialized Patterns
  disclosure: {
    id: 'disclosure',
    name: 'Disclosure Widget',
    description: 'Show/hide content sections with proper semantics.',
    components: ['Button', 'Details'],
    whenToUse: [
      'Additional information',
      'Help text',
      'Optional content',
    ],
    a11y: [
      'Use proper ARIA attributes',
      'Support keyboard toggle',
      'Maintain focus management',
    ],
    related: ['accordion', 'tooltip'],
  },

  inlineValidation: {
    id: 'inline-validation',
    name: 'Inline Validation',
    description: 'Real-time validation feedback as users type.',
    components: ['Field', 'Input', 'Alert', 'Tag'],
    whenToUse: [
      'Password strength',
      'Username availability',
      'Format validation',
    ],
    a11y: [
      'Provide timely feedback',
      'Do not interrupt typing',
      'Use color and text',
    ],
    related: ['formValidation', 'errorSummary'],
  },

  wizard: {
    id: 'wizard',
    name: 'Wizard',
    description: 'Multi-step process with navigation and validation.',
    components: ['Button', 'Fieldset', 'Divider', 'Alert'],
    whenToUse: [
      'Complex forms',
      'Setup processes',
      'Guided workflows',
    ],
    a11y: [
      'Show current step',
      'Allow step navigation',
      'Validate before proceeding',
    ],
    related: ['progressIndicator', 'formLayout'],
  },
};

export const patternCategories = {
  forms: ['formField', 'formValidation', 'formLayout'],
  navigation: ['primaryNavigation', 'tabNavigation', 'accordion'],
  dataDisplay: ['dataTable', 'listView', 'cardGrid'],
  actions: ['confirmationDialog', 'alertToast'],
  inputs: ['searchWithSuggestions', 'multiSelect', 'filterGroup'],
  feedback: ['loadingStates', 'progressIndicator', 'emptyState', 'errorState'],
  specialized: ['disclosure', 'inlineValidation', 'wizard'],
} as const;

export type PatternCategory = keyof typeof patternCategories;
export type PatternId = keyof typeof patterns;
