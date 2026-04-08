/**
 * ESLint Rule: No Deprecated Spacing Tokens
 *
 * DS Standards: --ds-spacing-* tokens are fully migrated to --ds-size-*.
 * Also catches --digilist-spacing-* (deprecated namespace).
 * Zero tolerance — these are errors, not warnings.
 *
 * See docs/DS_STANDARDS_IMPLEMENTATION_PLAN.md
 */

const DEPRECATED_PATTERNS = [
    { pattern: /--ds-spacing-/, replacement: '--ds-size-*', namespace: '--ds-spacing-*' },
    { pattern: /--digilist-spacing-/, replacement: '--ds-size-*', namespace: '--digilist-spacing-*' },
];

function checkStringForDeprecated(value, node, context) {
    if (typeof value !== 'string') return;

    for (const { pattern, namespace, replacement } of DEPRECATED_PATTERNS) {
        if (pattern.test(value)) {
            context.report({
                node,
                messageId: 'noDeprecatedSpacing',
                data: { namespace, replacement },
            });
            return; // one report per node is enough
        }
    }
}

export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Prevent deprecated --ds-spacing-* and --digilist-spacing-* tokens. Use --ds-size-* instead.',
            category: 'DS Standards',
        },
        messages: {
            noDeprecatedSpacing:
                'Deprecated token {{namespace}} found. Use {{replacement}} instead. All spacing tokens have been migrated.',
        },
        schema: [],
    },

    create(context) {
        return {
            // Check string literals in JSX attributes (style, className, etc.)
            'JSXAttribute Literal'(node) {
                checkStringForDeprecated(node.value, node, context);
            },

            // Check template literals in JSX
            'JSXAttribute TemplateLiteral'(node) {
                for (const quasi of node.quasis) {
                    checkStringForDeprecated(quasi.value?.raw, node, context);
                }
            },

            // Check string literals in style object properties
            'Property > Literal'(node) {
                checkStringForDeprecated(node.value, node, context);
            },

            // Check template literals in style object properties
            'Property > TemplateLiteral'(node) {
                for (const quasi of node.quasis) {
                    checkStringForDeprecated(quasi.value?.raw, node, context);
                }
            },

            // Check tagged template literals (e.g. css`...`)
            TaggedTemplateExpression(node) {
                for (const quasi of node.quasi.quasis) {
                    checkStringForDeprecated(quasi.value?.raw, node, context);
                }
            },
        };
    },
};
