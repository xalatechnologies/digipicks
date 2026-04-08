/**
 * ESLint Rule: No Inline SVG
 *
 * DS Standards: Prefer @digilist-saas/ds Icon components over raw <svg> elements.
 * Inline SVGs are hard to maintain, inconsistent, and bypass theme/accessibility.
 */

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer @digilist-saas/ds Icon components over inline <svg> elements for consistency and theming.',
            category: 'DS Standards',
        },
        messages: {
            noInlineSvg: 'Avoid inline <svg>. Use Icon components from @digilist-saas/ds (e.g. SearchIcon, CloseIcon) instead.',
        },
        schema: [],
    },

    create(context) {
        return {
            JSXElement(node) {
                if (node.openingElement?.name?.name === 'svg') {
                    context.report({
                        node,
                        messageId: 'noInlineSvg',
                    });
                }
            },
        };
    },
};
