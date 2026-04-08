/**
 * ESLint Rule: No App-Local Auth
 *
 * DS Standards / Security Invariants: Auth must come from the shared
 * infrastructure in @digilist-saas/app-shell or @digilist-saas/sdk.
 *
 * Importing AuthProvider or useAuth from any other path creates divergent
 * auth state, breaks SSO, and violates tenant isolation contracts.
 *
 * Allowed sources:
 *   @digilist-saas/app-shell  — shared AuthProvider, useAuth, ProtectedRoute
 *   @digilist-saas/sdk        — useAuth re-export from SDK layer
 *
 * Forbidden: any app-local file that exports/re-exports AuthProvider or useAuth
 * (i.e. imports of these names from paths that are NOT the two allowed packages)
 *
 * See docs/SHARED_INFRASTRUCTURE.md for auth invariants.
 */

const ALLOWED_AUTH_SOURCES = [
    '@digilist-saas/app-shell',
    '@digilist-saas/sdk',
];

const AUTH_IDENTIFIERS = new Set(['AuthProvider', 'useAuth']);

export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Prevent app-local AuthProvider/useAuth implementations. ' +
                'Import from @digilist-saas/app-shell or @digilist-saas/sdk instead.',
            category: 'Security',
            recommended: true,
        },
        messages: {
            noAppLocalAuth:
                "App-local import of '{{name}}' from '{{source}}' is forbidden. " +
                'Use @digilist-saas/app-shell or @digilist-saas/sdk instead.',
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

        // Skip the app-shell and sdk themselves
        if (
            filename.includes('/packages/app-shell/') ||
            filename.includes('/packages/sdk/')
        ) {
            return {};
        }

        return {
            ImportDeclaration(node) {
                const source = node.source.value;

                // Allow imports from the canonical sources
                const isAllowed = ALLOWED_AUTH_SOURCES.some(
                    (pkg) => source === pkg || source.startsWith(pkg + '/')
                );
                if (isAllowed) return;

                // Check if any imported specifier is a forbidden auth identifier
                for (const specifier of node.specifiers) {
                    const importedName =
                        specifier.type === 'ImportSpecifier'
                            ? specifier.imported?.name
                            : specifier.type === 'ImportDefaultSpecifier'
                            ? specifier.local?.name
                            : null;

                    if (importedName && AUTH_IDENTIFIERS.has(importedName)) {
                        context.report({
                            node: specifier,
                            messageId: 'noAppLocalAuth',
                            data: {
                                name: importedName,
                                source,
                            },
                        });
                    }
                }
            },
        };
    },
};
