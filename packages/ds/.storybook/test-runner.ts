import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Storybook Test Runner Configuration
 * 
 * Runs automated tests for all stories:
 * - Smoke tests (story renders without errors)
 * - Accessibility tests (WCAG 2.1 AA compliance via axe-core)
 * - Interaction tests (play functions)
 * 
 * Usage:
 *   pnpm test-storybook
 * 
 * @see https://storybook.js.org/docs/writing-tests/test-runner
 */
const config: TestRunnerConfig = {
  // Run tests in parallel for faster execution
  async preVisit(page) {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);

    // Skip a11y tests for stories that explicitly opt out
    // Usage in story: parameters: { a11y: { disable: true } }
    if (storyContext.parameters?.a11y?.disable) {
      return;
    }

    // Run accessibility checks on every story
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
      // Configure axe-core rules
      axeOptions: {
        // WCAG 2.1 Level AA compliance
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
    });
  },

  // Tags to include/exclude
  tags: {
    // Skip stories tagged with 'skip-test'
    skip: ['skip-test'],
  },
};

export default config;
