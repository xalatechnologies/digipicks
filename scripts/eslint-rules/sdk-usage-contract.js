/**
 * ESLint Rule: SDK Usage Contract Enforcement
 *
 * Enforces the App Architecture Contract's SDK namespace restrictions.
 * Each app type can only import from allowed SDK namespaces.
 *
 * Package: @digilist-saas/sdk (the actual SDK used across apps)
 */

// SDK Usage Contract from APP_ARCHITECTURE_CONTRACT.md
const SDK_ALLOWED = {
    backoffice: ['tenant', 'modules', 'billing', 'governance', 'ops', 'auth', 'seasons', 'organizations'],
    minside: ['digilist', 'tenant', 'auth', 'bookings', 'seasons', 'messaging'],
    web: ['digilist', 'auth', 'bookings', 'listings', 'reviews'],
    'user-guides': ['docs', 'guides'],
    monitoring: ['ops', 'audit', 'events'],
    'saas-admin': ['tenant', 'modules', 'billing', 'audit', 'auth'],
};

export default {
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce SDK Usage Contract per app type',
            category: 'Architecture',
        },
        messages: {
            forbiddenImport:
                "App '{{app}}' cannot import from SDK namespace '{{namespace}}'. Allowed: {{allowed}}",
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Determine which app we're in
        const appMatch = filename.match(/apps\/(backoffice|minside|web|user-guides|monitoring|saas-admin)\//);
        if (!appMatch) {
            return {}; // Not in an app, skip
        }

        const appType = appMatch[1];
        const allowed = SDK_ALLOWED[appType] || [];

        return {
            ImportDeclaration(node) {
                const source = node.source.value;

                // Check @digilist-saas/sdk imports
                if (!source.startsWith('@digilist-saas/sdk')) {
                    return;
                }

                // Extract namespace from import path
                // e.g., '@digilist-saas/sdk/tenant' -> 'tenant'
                const parts = source.replace('@digilist-saas/sdk/', '').split('/');
                const namespace = parts[0];

                if (!namespace || namespace === 'sdk') {
                    return; // Root import, allow
                }

                // Check if namespace is allowed for this app
                if (!allowed.includes(namespace)) {
                    context.report({
                        node,
                        messageId: 'forbiddenImport',
                        data: {
                            app: appType,
                            namespace,
                            allowed: allowed.join(', '),
                        },
                    });
                }
            },
        };
    },
};
