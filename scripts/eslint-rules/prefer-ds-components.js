/**
 * ESLint Rule: Prefer DS Components
 *
 * DS Standards: Suggest design system alternatives for raw semantic HTML
 * elements where equivalent DS components exist.
 *
 * This rule covers structural/layout elements that no-raw-html does not
 * (which focuses on content elements like <p>, <h1>, <button>, etc.).
 *
 * Targets:
 *   <section>  → <ContentLayout> or <Card> from @digipicks/ds
 *   <article>  → <Card> from @digipicks/ds
 *   <header>   → <PageHeader> from @digipicks/ds
 *   <footer>   → <PageFooter> from @digipicks/ds (or DashboardLayout includes it)
 *   <nav>      → <NavigationMenu> or <Tabs> from @digipicks/ds
 *   <aside>    → <Drawer> or sidebar from @digipicks/ds
 *
 * Note: This is a 'warn' rule because these elements are sometimes used
 * legitimately in landmark roles. The rule suggests alternatives; it does
 * not block. Developers should prefer DS components when DS equivalents
 * cover the use case.
 *
 * Scope: apps/ and packages/digilist/ only.
 */

const PREFERRED_ALTERNATIVES = {
  section: 'Prefer <ContentLayout> or <Card> from @digipicks/ds over <section>.',
  article: 'Prefer <Card> from @digipicks/ds over <article>.',
  header: 'Prefer <PageHeader> from @digipicks/ds over <header>.',
  footer: 'Prefer <PageFooter> from @digipicks/ds over <footer>.',
  nav: 'Prefer <NavigationMenu> or <Tabs> from @digipicks/ds over <nav>.',
  aside: 'Prefer <Drawer> or a DS sidebar pattern over <aside>.',
};

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest DS alternatives for raw semantic HTML elements where equivalents exist.',
      category: 'DS Standards',
    },
    messages: {
      preferDsComponent: '{{suggestion}}',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // Only enforce in apps/ and packages/digilist/
    const inScope = filename.includes('/apps/') || filename.includes('/packages/digilist/');

    if (!inScope) {
      return {};
    }

    // Skip the DS package itself
    if (filename.includes('/packages/ds/')) {
      return {};
    }

    // Skip story files
    if (filename.includes('.stories.')) {
      return {};
    }

    return {
      JSXOpeningElement(node) {
        const name = node.name?.name;
        if (!name || typeof name !== 'string') return;

        const suggestion = PREFERRED_ALTERNATIVES[name];
        if (suggestion) {
          context.report({
            node,
            messageId: 'preferDsComponent',
            data: { suggestion },
          });
        }
      },
    };
  },
};
