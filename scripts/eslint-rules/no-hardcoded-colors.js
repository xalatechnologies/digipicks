/**
 * ESLint Rule: No Hardcoded Colors
 *
 * DS Standards: Use design tokens (var(--ds-*)) instead of rgb/rgba/hex.
 * Colors should come from themes only. See docs/DS_STANDARDS_IMPLEMENTATION_PLAN.md
 */

const COLOR_PATTERN = /^(#([0-9a-fA-F]{3,8})|rgb\s*\(|rgba\s*\()/;

function checkValue(node, context, report) {
    if (node.type === 'Literal' && typeof node.value === 'string') {
        const val = node.value.trim();
        if (COLOR_PATTERN.test(val)) {
            report(node);
        }
    }
    if (node.type === 'TemplateLiteral' && node.quasis?.length === 1) {
        const val = node.quasis[0]?.value?.raw?.trim() ?? '';
        if (COLOR_PATTERN.test(val)) {
            report(node);
        }
    }
}

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Use design tokens instead of hardcoded rgb/rgba/hex. Colors from themes only.',
            category: 'DS Standards',
        },
        messages: {
            noHardcodedColor: 'Avoid hardcoded colors (rgb/rgba/hex). Use design tokens (e.g. var(--ds-color-neutral-text-default)) instead.',
        },
        schema: [],
    },

    create(context) {
        return {
            'JSXAttribute[name.name="style"]'(node) {
                const expr = node.value?.expression;
                if (expr?.type !== 'ObjectExpression') return;

                for (const prop of expr.properties) {
                    if (prop.type !== 'Property' || prop.key?.name == null) continue;
                    const value = prop.value;
                    checkValue(value, context, (n) => {
                        context.report({
                            node: n,
                            messageId: 'noHardcodedColor',
                        });
                    });
                }
            },
        };
    },
};
