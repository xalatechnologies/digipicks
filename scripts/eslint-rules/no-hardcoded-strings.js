/**
 * ESLint Rule: No Hardcoded Strings
 *
 * Enforces Localization Guardrails: No hardcoded user-facing strings.
 * All user-facing strings must use t() or Trans component from @digilist-saas/i18n.
 *
 * HOW TO FIX:
 *
 * 1. Import the translation hook:
 *    import { useT } from '@digilist-saas/i18n';
 *
 * 2. Get the t function in your component:
 *    const t = useT();
 *    // or with a namespace:
 *    const t = useT('backoffice');
 *
 * 3. Replace hardcoded strings:
 *    BEFORE: <Heading>Innstillinger</Heading>
 *    AFTER:  <Heading>{t('settings.title')}</Heading>
 *
 *    BEFORE: <Button>Lagre</Button>
 *    AFTER:  <Button>{t('common.save')}</Button>
 *
 *    BEFORE: <Textfield placeholder="Sok..." />
 *    AFTER:  <Textfield placeholder={t('action.search')} />
 *
 *    BEFORE: <Button aria-label="Lukk dialog">X</Button>
 *    AFTER:  <Button aria-label={t('common.close')}>X</Button>
 *
 * 4. Add translation keys to locales:
 *    - packages/i18n/locales/nb.json (Norwegian Bokmal — primary)
 *    - packages/i18n/locales/en.json (English)
 *    - packages/i18n/locales/ar.json (Arabic — if applicable)
 *
 * 5. For interpolation:
 *    t('validation.minLength', { min: 3 })
 *    → nb.json: "minLength": "Ma vaere minst {{min}} tegn"
 *
 * AVAILABLE NAMESPACES: common, auth, errors, validation, action, backoffice,
 *   dashboard, web, booking, calendar, messages, settings, billing, minside, etc.
 *
 * See: packages/i18n/locales/nb.json for all available keys.
 * See: scripts/eslint-rules/DS_COMPONENT_DICTIONARY.md for UI terminology.
 */

// Attributes that require localization
const LOCALIZED_ATTRIBUTES = [
    'aria-label',
    'aria-describedby',
    'title',
    'placeholder',
    'alt',
];

// Attributes that are NOT user-facing (allow hardcoded)
const ALLOWED_ATTRIBUTES = [
    'data-testid',
    'data-cy',
    'id',
    'className',
    'name',
    'type',
    'href',
    'src',
    'role',
    'key',
];

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Prevent hardcoded user-facing strings',
            category: 'Localization Guardrails',
        },
        messages: {
            noHardcodedString:
                "Hardcoded string forbidden. Use t('key') from @digilist-saas/i18n. Add key to packages/i18n/locales/nb.json and en.json.",
            noHardcodedAttribute:
                "Hardcoded '{{attr}}' forbidden. Use t('key') from @digilist-saas/i18n (e.g. aria-label={t('common.close')}).",
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Skip test files
        if (
            filename.includes('.test.') ||
            filename.includes('.spec.') ||
            filename.includes('__tests__')
        ) {
            return {};
        }

        // Only enforce in apps/
        if (!filename.includes('/apps/')) {
            return {};
        }

        return {
            // Check JSX text content
            JSXText(node) {
                const text = node.value.trim();

                // Skip whitespace-only or empty
                if (!text || /^[\s\n]*$/.test(text)) {
                    return;
                }

                // Skip if it's just punctuation or special chars
                if (/^[.,;:!?()[\]{}<>\/\\|@#$%^&*+=~`'"_-]+$/.test(text)) {
                    return;
                }

                // Skip numbers only
                if (/^\d+$/.test(text)) {
                    return;
                }

                context.report({
                    node,
                    messageId: 'noHardcodedString',
                });
            },

            // Check attributes that need localization
            JSXAttribute(node) {
                if (!node.name || !node.name.name) return;

                const attrName = node.name.name;

                // Check if this attribute needs localization
                if (!LOCALIZED_ATTRIBUTES.includes(attrName)) {
                    return;
                }

                // Check if value is a string literal
                if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
                    context.report({
                        node,
                        messageId: 'noHardcodedAttribute',
                        data: { attr: attrName },
                    });
                }
            },
        };
    },
};
