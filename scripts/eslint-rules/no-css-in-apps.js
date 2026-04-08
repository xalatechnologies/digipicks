/**
 * ESLint Rule: No CSS Files in Apps
 * 
 * Enforces UI Guardrails: No custom CSS rule.
 * Styling must come from platform-ui tokens and variants only.
 */

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Prevent CSS file imports in apps',
            category: 'UI Guardrails',
        },
        messages: {
            noCssImport:
                "CSS file imports forbidden in apps. Styling via platform-ui tokens only. (UI Guardrails: No Custom CSS Rule)",
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Only enforce in apps/
        if (!filename.includes('/apps/')) {
            return {};
        }

        return {
            ImportDeclaration(node) {
                const source = node.source.value;

                // Block CSS/SCSS imports
                if (
                    source.endsWith('.css') ||
                    source.endsWith('.scss') ||
                    source.endsWith('.sass') ||
                    source.endsWith('.less')
                ) {
                    context.report({
                        node,
                        messageId: 'noCssImport',
                    });
                }
            },
        };
    },
};
