/**
 * ESLint Rule: No Domain UI in Backoffice
 *
 * Enforces the Domain App Rule: backoffice never contains domain-specific UI.
 * Domain UI components belong in web/minside apps, not administration.
 */

// Known domain UI packages and paths
const DOMAIN_UI_PATTERNS = [
    'digilist-ui',
    '/digilist/src/listings/',
    '/digilist/src/bookings/',
    '/digilist/src/calendar/',
    // Add future domain UI patterns here
];

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Prevent domain UI imports in backoffice',
            category: 'Architecture',
        },
        messages: {
            noDomainUiInBackoffice:
                "Backoffice cannot import domain UI '{{package}}'. Domain UI belongs in web/minside apps. (Domain App Rule)",
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Only enforce in backoffice app
        if (!filename.includes('/apps/backoffice/')) {
            return {};
        }

        return {
            ImportDeclaration(node) {
                const source = node.source.value;

                for (const pattern of DOMAIN_UI_PATTERNS) {
                    if (source.includes(pattern)) {
                        context.report({
                            node,
                            messageId: 'noDomainUiInBackoffice',
                            data: { package: source },
                        });
                        return;
                    }
                }
            },
        };
    },
};
