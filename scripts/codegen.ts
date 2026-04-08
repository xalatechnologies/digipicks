#!/usr/bin/env node
/**
 * DigilistSaaS Codegen CLI
 *
 * Generates SDK methods, OpenAPI spec, and documentation from function registry.
 *
 * Usage:
 *   npx xala-codegen --sdk     # Generate SDK methods
 *   npx xala-codegen --openapi # Generate OpenAPI spec
 *   npx xala-codegen --docs    # Generate documentation
 *   npx xala-codegen --all     # Generate everything
 */

import fs from 'node:fs';
import path from 'node:path';

// =============================================================================
// TYPES
// =============================================================================

interface FunctionDef {
    name: string;
    type: 'query' | 'mutation' | 'action';
    description: string;
    handler_path: string;
    args_schema?: Record<string, unknown>;
    returns_schema?: Record<string, unknown>;
    required_permissions: string[];
    required_entitlements: string[];
    public: boolean;
    emits_topics: string[];
    rate_limit_preset: string;
    deprecated: boolean;
    deprecated_message?: string;
    tags: string[];
}

// =============================================================================
// SDK GENERATOR
// =============================================================================

function generateSDKMethod(fn: FunctionDef): string {
    const [namespace, method] = fn.name.includes('.')
        ? fn.name.split('.', 2)
        : ['api', fn.name];

    const deprecated = fn.deprecated
        ? `/** @deprecated ${fn.deprecated_message || 'This function is deprecated'} */\n  `
        : '';

    const doc = `/**
   * ${fn.description}
   *
   * @permissions ${fn.required_permissions.join(', ') || 'none'}
   * @emits ${fn.emits_topics.join(', ') || 'none'}
   */`;

    return `${doc}
  ${deprecated}${method}: async (args?: Record<string, unknown>) => {
    return this.invoke('${fn.name}', args);
  },`;
}

function generateSDK(functions: FunctionDef[]): string {
    // Group by namespace
    const namespaces = new Map<string, FunctionDef[]>();

    for (const fn of functions) {
        const [namespace] = fn.name.includes('.')
            ? fn.name.split('.', 2)
            : ['api'];

        if (!namespaces.has(namespace)) {
            namespaces.set(namespace, []);
        }
        namespaces.get(namespace)!.push(fn);
    }

    const namespaceCode: string[] = [];

    for (const [ns, fns] of namespaces) {
        const methods = fns.map(generateSDKMethod).join('\n\n  ');
        namespaceCode.push(`
  ${ns} = {
    ${methods}
  };`);
    }

    return `/**
 * DigilistSaaS SDK - Auto-generated from function registry
 *
 * DO NOT EDIT MANUALLY - Run \`npx xala-codegen --sdk\` to regenerate
 * Generated: ${new Date().toISOString()}
 */

import type { ConvexClient } from 'convex/browser';

export class GeneratedAPI {
  constructor(private client: ConvexClient) {}

  private async invoke(name: string, args?: Record<string, unknown>) {
    // Convex function invocation
    return this.client.action(name as any, args || {});
  }
${namespaceCode.join('\n')}
}
`;
}

// =============================================================================
// OPENAPI GENERATOR
// =============================================================================

function generateOpenAPI(functions: FunctionDef[]): Record<string, unknown> {
    const paths: Record<string, unknown> = {};

    for (const fn of functions) {
        const pathName = `/api/${fn.name.replace('.', '/')}`;

        paths[pathName] = {
            [fn.type === 'query' ? 'get' : 'post']: {
                operationId: fn.name.replace('.', '_'),
                summary: fn.description,
                deprecated: fn.deprecated,
                tags: fn.tags.length > 0 ? fn.tags : [fn.name.split('.')[0]],
                security: fn.public ? [] : [{ bearerAuth: [] }],
                requestBody: fn.args_schema ? {
                    required: true,
                    content: {
                        'application/json': {
                            schema: fn.args_schema,
                        },
                    },
                } : undefined,
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: fn.returns_schema || { type: 'object' },
                            },
                        },
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '401': { $ref: '#/components/responses/Unauthorized' },
                    '403': { $ref: '#/components/responses/Forbidden' },
                    '500': { $ref: '#/components/responses/InternalError' },
                },
            },
        };
    }

    return {
        openapi: '3.1.0',
        info: {
            title: 'DigilistSaaS API',
            version: '1.0.0',
            description: 'Multi-tenant Backend-as-a-Service API powered by Convex',
        },
        servers: [
            { url: 'https://{project}.convex.cloud', variables: { project: { default: 'your-project' } } },
        ],
        paths,
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            responses: {
                BadRequest: {
                    description: 'Bad request',
                    content: {
                        'application/problem+json': {
                            schema: { $ref: '#/components/schemas/RFC7807Problem' },
                        },
                    },
                },
                Unauthorized: { description: 'Authentication required' },
                Forbidden: { description: 'Insufficient permissions' },
                InternalError: { description: 'Internal server error' },
            },
            schemas: {
                RFC7807Problem: {
                    type: 'object',
                    properties: {
                        type: { type: 'string' },
                        title: { type: 'string' },
                        status: { type: 'integer' },
                        detail: { type: 'string' },
                        instance: { type: 'string' },
                    },
                    required: ['type', 'title', 'status'],
                },
            },
        },
    };
}

// =============================================================================
// DOCUMENTATION GENERATOR
// =============================================================================

function generateDocs(functions: FunctionDef[]): string {
    const sections: string[] = [];

    // Group by namespace
    const namespaces = new Map<string, FunctionDef[]>();

    for (const fn of functions) {
        const [namespace] = fn.name.includes('.')
            ? fn.name.split('.', 2)
            : ['Other'];

        if (!namespaces.has(namespace)) {
            namespaces.set(namespace, []);
        }
        namespaces.get(namespace)!.push(fn);
    }

    sections.push('# DigilistSaaS Function Reference\n');
    sections.push('> Auto-generated from function registry\n');

    // TOC
    sections.push('## Contents\n');
    for (const [ns] of namespaces) {
        sections.push(`- [${ns}](#${ns.toLowerCase()})`);
    }
    sections.push('');

    // Each namespace
    for (const [ns, fns] of namespaces) {
        sections.push(`## ${ns}\n`);

        for (const fn of fns) {
            const deprecated = fn.deprecated ? ' DEPRECATED' : '';
            sections.push(`### \`${fn.name}\`${deprecated}\n`);
            sections.push(`${fn.description}\n`);

            sections.push(`| Property | Value |`);
            sections.push(`|----------|-------|`);
            sections.push(`| Type | \`${fn.type}\` |`);
            sections.push(`| Permissions | ${fn.required_permissions.join(', ') || 'None'} |`);
            sections.push(`| Entitlements | ${fn.required_entitlements.join(', ') || 'None'} |`);
            sections.push(`| Rate Limit | ${fn.rate_limit_preset} |`);
            if (fn.emits_topics.length > 0) {
                sections.push(`| Emits | ${fn.emits_topics.join(', ')} |`);
            }
            sections.push('');
        }
    }

    return sections.join('\n');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    const args = process.argv.slice(2);
    const generateAll = args.includes('--all');
    const generateSDKFlag = generateAll || args.includes('--sdk');
    const generateOpenAPIFlag = generateAll || args.includes('--openapi');
    const generateDocsFlag = generateAll || args.includes('--docs');

    if (!generateSDKFlag && !generateOpenAPIFlag && !generateDocsFlag) {
        console.log('Usage: npx xala-codegen [--sdk] [--openapi] [--docs] [--all]');
        process.exit(1);
    }

    // Load functions from registry
    console.log('Loading function registry...');

    // Mock data for demo
    const functions: FunctionDef[] = [
        {
            name: 'rbac.listRoles',
            type: 'query',
            description: 'List all roles for the tenant',
            handler_path: 'convex/rbac/listRoles',
            required_permissions: ['rbac:roles:read'],
            required_entitlements: [],
            public: false,
            emits_topics: [],
            rate_limit_preset: 'standard',
            deprecated: false,
            tags: ['rbac'],
        },
        // Add more as needed...
    ];

    if (generateSDKFlag) {
        console.log('Generating SDK...');
        const sdk = generateSDK(functions);
        const outPath = path.join(process.cwd(), 'packages/sdk/src/generated.ts');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, sdk);
        console.log(`  Written to ${outPath}`);
    }

    if (generateOpenAPIFlag) {
        console.log('Generating OpenAPI spec...');
        const openapi = generateOpenAPI(functions);
        const outPath = path.join(process.cwd(), 'docs/openapi.json');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(openapi, null, 2));
        console.log(`  Written to ${outPath}`);
    }

    if (generateDocsFlag) {
        console.log('Generating documentation...');
        const docs = generateDocs(functions);
        const outPath = path.join(process.cwd(), 'docs/api/functions.md');
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, docs);
        console.log(`  Written to ${outPath}`);
    }

    console.log('Done!');
}

main().catch(console.error);
