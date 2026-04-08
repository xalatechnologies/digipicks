/**
 * Component Contract — Standardized API Shape for Plug-and-Play Components
 *
 * Every component must declare its public API shape in a contract.ts file.
 * Two components implementing the same contract are interchangeable.
 *
 * @see docs/DOMAIN_BUNDLE_SPEC.md
 */

import type { Validator } from "convex/values";

// =============================================================================
// CONTRACT TYPES
// =============================================================================

/** Definition of a single function in the contract */
export interface ContractFunction {
    args: Record<string, Validator<any, any, any>>;
    returns: Validator<any, any, any>;
    description?: string;
}

/** Full component contract definition */
export interface ComponentContract {
    /** Unique component identifier */
    name: string;
    /** Semantic version */
    version: string;
    /** Component category: "domain" | "infrastructure" | "platform" */
    category: "domain" | "infrastructure" | "platform";
    /** Human-readable description */
    description?: string;

    /** Public queries the component must expose */
    queries: Record<string, ContractFunction>;
    /** Public mutations the component must expose */
    mutations: Record<string, ContractFunction>;
    /** Public actions the component may expose */
    actions?: Record<string, ContractFunction>;

    /** Event topics this component emits */
    emits: string[];
    /** Event topics this component subscribes to */
    subscribes: string[];

    /** Dependencies on core tables and other components */
    dependencies: {
        /** Core tables this component references (by string ID) */
        core: string[];
        /** Other components this component depends on */
        components: string[];
    };
}

// =============================================================================
// CONTRACT VALIDATION
// =============================================================================

/**
 * Define a component contract. Use in each component's contract.ts.
 * Provides type safety and validation at definition time.
 */
export function defineContract(contract: ComponentContract): Readonly<ComponentContract> {
    // Validate contract shape
    if (!contract.name || contract.name.length === 0) {
        throw new Error("Component contract must have a name");
    }
    if (!contract.version || !/^\d+\.\d+\.\d+$/.test(contract.version)) {
        throw new Error(`Invalid version format: ${contract.version}. Use semver (e.g., "1.0.0")`);
    }
    if (!contract.category) {
        throw new Error("Component contract must have a category");
    }

    // Validate event topic format: {component}.{entity}.{action}
    const topicRegex = /^[a-z-]+\.[a-z-]+\.[a-z-]+$/;
    for (const topic of contract.emits) {
        if (!topicRegex.test(topic)) {
            throw new Error(
                `Invalid event topic format: "${topic}". Use "{component}.{entity}.{action}" (e.g., "reviews.review.created")`
            );
        }
    }
    for (const topic of contract.subscribes) {
        if (!topicRegex.test(topic)) {
            throw new Error(
                `Invalid event topic format: "${topic}". Use "{component}.{entity}.{action}"`
            );
        }
    }

    return Object.freeze(contract);
}

