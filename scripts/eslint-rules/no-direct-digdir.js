/**
 * ESLint Rule: No Direct Digdir Imports
 *
 * Enforces UI Guardrails: All apps and packages must import from @digipicks/ds,
 * which is the single facade over Designsystemet primitives.
 * Direct imports from @digdir/*, @radix-ui/*, or other UI kits are forbidden.
 */

const FORBIDDEN_PACKAGES = [
  '@digdir/designsystemet-react',
  '@digdir/designsystemet-css',
  '@digdir/designsystemet-theme',
  '@radix-ui/',
  '@headlessui/',
  'antd',
  '@mui/',
  'shadcn',
  'tailwindcss',
  '@chakra-ui/',
];

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent direct Digdir/UI kit imports. Use @digipicks/ds instead.',
      category: 'UI Guardrails',
    },
    messages: {
      noDirectDigdir: "Direct UI kit import '{{package}}' forbidden. Import from @digipicks/ds instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    // @digipicks/ds is the facade — it imports from @digdir; skip it
    if (filename.includes('/packages/ds/')) {
      return {};
    }

    // Only enforce in apps/ and packages/digilist/
    const inScope = filename.includes('/apps/') || filename.includes('/packages/digilist/');
    if (!inScope) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value;

        for (const forbidden of FORBIDDEN_PACKAGES) {
          if (source.startsWith(forbidden) || source.includes(forbidden)) {
            context.report({
              node,
              messageId: 'noDirectDigdir',
              data: { package: source },
            });
            return;
          }
        }
      },
    };
  },
};
