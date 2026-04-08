/**
 * ESLint Rule: Require CSS Modules
 *
 * DS Standards: Components must use .module.css for local styling.
 * Plain .css imports are forbidden — they pollute the global scope.
 *
 * Allowed:
 *   import styles from './Foo.module.css'     ✅ CSS Module
 *   import '@digilist-saas/ds/...'                     ✅ Package CSS
 *   import '@digdir/designsystemet-css/...'   ✅ Framework CSS
 *
 * Forbidden:
 *   import './Foo.css'                        ❌ Global CSS
 *   import '../styles/utils.css'              ❌ Global CSS
 *
 * Scope: apps/ and packages/digilist/ only.
 * packages/ds/ is excluded (framework-level resets are allowed).
 */

export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Require CSS Modules (.module.css) instead of plain CSS imports for local component styles.',
            category: 'DS Standards',
        },
        messages: {
            requireCssModule:
                "Plain CSS import '{{source}}' forbidden. Use CSS Modules (*.module.css) for component styles.",
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Only enforce in apps/ and packages/digilist/
        const inScope =
            filename.includes('/apps/') ||
            filename.includes('/packages/digilist/');

        if (!inScope) {
            return {};
        }

        // Skip the DS package itself
        if (filename.includes('/packages/ds/')) {
            return {};
        }

        return {
            ImportDeclaration(node) {
                const source = node.source.value;

                // Only check CSS imports
                if (!source.endsWith('.css')) {
                    return;
                }

                // Allow package CSS (from node_modules / @xala / @digdir)
                if (
                    source.startsWith('@') ||
                    !source.startsWith('.') // non-relative = package
                ) {
                    return;
                }

                // Allow CSS Modules
                if (source.endsWith('.module.css')) {
                    return;
                }

                // Forbidden: plain relative .css import
                context.report({
                    node,
                    messageId: 'requireCssModule',
                    data: { source },
                });
            },
        };
    },
};
