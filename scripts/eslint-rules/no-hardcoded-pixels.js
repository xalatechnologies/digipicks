/**
 * ESLint Rule: No Hardcoded Pixels
 *
 * DS Standards: Enforce design tokens over hardcoded pixel values in inline styles.
 * Properties like padding, margin, gap, fontSize, borderRadius should use
 * var(--ds-size-*) or var(--ds-font-size-*) tokens.
 *
 * Allowed exceptions:
 * - width, height (often dynamic/calculated)
 * - maxWidth, maxHeight, minWidth, minHeight (layout constraints)
 * - top, left, right, bottom (positioning)
 * - borderWidth (1px, 2px are common and correct)
 * - lineHeight (often unitless or px-based)
 * - Values of 0px or 1px
 *
 * Scope: JSX style={{}} props only (CSS modules are not checked by ESLint).
 */

const PX_PATTERN = /^['"]?(\d+)px['"]?$/;

// Properties that should use design tokens (spacing/sizing)
const TOKEN_PROPERTIES = new Set([
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'paddingInline',
    'paddingBlock',
    'paddingInlineStart',
    'paddingInlineEnd',
    'paddingBlockStart',
    'paddingBlockEnd',
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'marginInline',
    'marginBlock',
    'marginInlineStart',
    'marginInlineEnd',
    'marginBlockStart',
    'marginBlockEnd',
    'gap',
    'rowGap',
    'columnGap',
    'fontSize',
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'borderStartStartRadius',
    'borderStartEndRadius',
    'borderEndStartRadius',
    'borderEndEndRadius',
]);

// Suggestion mapping for common px values
const SIZE_TOKEN_MAP = {
    2: '--ds-size-0-5',
    4: '--ds-size-1',
    8: '--ds-size-2',
    12: '--ds-size-3',
    16: '--ds-size-4',
    20: '--ds-size-5',
    24: '--ds-size-6',
    28: '--ds-size-7',
    32: '--ds-size-8',
    36: '--ds-size-9',
    40: '--ds-size-10',
    44: '--ds-size-11',
    48: '--ds-size-12',
};

const FONT_SIZE_MAP = {
    12: '--ds-font-size-xs',
    14: '--ds-font-size-sm',
    16: '--ds-font-size-md',
    18: '--ds-font-size-lg',
    20: '--ds-font-size-xl',
    24: '--ds-font-size-2xl',
    30: '--ds-font-size-3xl',
};

function getSuggestion(propName, pxValue) {
    if (propName === 'fontSize' && FONT_SIZE_MAP[pxValue]) {
        return `var(${FONT_SIZE_MAP[pxValue]})`;
    }
    if (SIZE_TOKEN_MAP[pxValue]) {
        return `var(${SIZE_TOKEN_MAP[pxValue]})`;
    }
    return 'a design token (var(--ds-size-*))';
}

export default {
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'Enforce design tokens over hardcoded pixel values in inline style props for spacing/sizing properties.',
            category: 'DS Standards',
        },
        messages: {
            noHardcodedPixels:
                "Avoid hardcoded '{{value}}' for {{property}}. Use {{suggestion}} instead.",
        },
        schema: [],
    },

    create(context) {
        return {
            'JSXAttribute[name.name="style"]'(node) {
                const expr = node.value?.expression;
                if (expr?.type !== 'ObjectExpression') return;

                for (const prop of expr.properties) {
                    if (prop.type !== 'Property') continue;

                    const propName = prop.key?.name || prop.key?.value;
                    if (!propName || !TOKEN_PROPERTIES.has(propName)) continue;

                    const value = prop.value;

                    // Check string literals like "16px"
                    if (value?.type === 'Literal' && typeof value.value === 'string') {
                        const match = value.value.match(PX_PATTERN);
                        if (match) {
                            const pxValue = parseInt(match[1], 10);
                            if (pxValue > 1) {
                                context.report({
                                    node: value,
                                    messageId: 'noHardcodedPixels',
                                    data: {
                                        value: value.value,
                                        property: propName,
                                        suggestion: getSuggestion(propName, pxValue),
                                    },
                                });
                            }
                        }
                    }

                    // Check numeric literals (React interprets numbers as px for some properties)
                    if (value?.type === 'Literal' && typeof value.value === 'number') {
                        const pxValue = value.value;
                        if (pxValue > 1) {
                            context.report({
                                node: value,
                                messageId: 'noHardcodedPixels',
                                data: {
                                    value: `${pxValue}px`,
                                    property: propName,
                                    suggestion: getSuggestion(propName, pxValue),
                                },
                            });
                        }
                    }
                }
            },
        };
    },
};
