/**
 * Shared test helper for domain facade tests.
 *
 * Creates a `convexTest` instance with the app schema and registers
 * only the components each test file needs. This mirrors the real
 * runtime where facades call `ctx.runQuery(components.{name}.functions.*)`.
 *
 * Usage:
 *   const t = createDomainTest(["audit", "reviews"]);
 *   const { tenantId, adminId, userId } = await seedTestTenant(t);
 *   const result = await t.mutation(api.domain.reviews.create, { ... });
 */
import { convexTest } from "convex-test";
import schema from "../../schema";
import { modules } from "../../testSetup.test-util";
import { components } from "../../_generated/api";

// Component schemas
import auditSchema from "../../components/audit/schema";
import reviewsSchema from "../../components/reviews/schema";
import notificationsSchema from "../../components/notifications/schema";
import userPrefsSchema from "../../components/user-prefs/schema";
import messagingSchema from "../../components/messaging/schema";
import analyticsSchema from "../../components/analytics/schema";
import complianceSchema from "../../components/compliance/schema";
import tenantConfigSchema from "../../components/tenant-config/schema";
import resourcesSchema from "../../components/resources/schema";
import pricingSchema from "../../components/pricing/schema";
import addonsSchema from "../../components/addons/schema";
import authSchema from "../../components/auth/schema";
import rbacSchema from "../../components/rbac/schema";
import billingSchema from "../../components/billing/schema";
import integrationsSchema from "../../components/integrations/schema";
import guidesSchema from "../../components/guides/schema";
import supportSchema from "../../components/support/schema";
import externalReviewsSchema from "../../components/externalReviews/schema";
import classificationSchema from "../../components/classification/schema";
import subscriptionsSchema from "../../components/subscriptions/schema";
import picksSchema from "../../components/picks/schema";
import broadcastsSchema from "../../components/broadcasts/schema";

// Component modules (import.meta.glob)
import { modules as auditModules } from "../../components/audit/testSetup.test-util";
import { modules as reviewsModules } from "../../components/reviews/testSetup.test-util";
import { modules as notificationsModules } from "../../components/notifications/testSetup.test-util";
import { modules as userPrefsModules } from "../../components/user-prefs/testSetup.test-util";
import { modules as messagingModules } from "../../components/messaging/testSetup.test-util";
import { modules as analyticsModules } from "../../components/analytics/testSetup.test-util";
import { modules as complianceModules } from "../../components/compliance/testSetup.test-util";
import { modules as tenantConfigModules } from "../../components/tenant-config/testSetup.test-util";
import { modules as resourcesModules } from "../../components/resources/testSetup.test-util";
import { modules as pricingModules } from "../../components/pricing/testSetup.test-util";
import { modules as addonsModules } from "../../components/addons/testSetup.test-util";
import { modules as authModules } from "../../components/auth/testSetup.test-util";
import { modules as rbacModules } from "../../components/rbac/testSetup.test-util";
import { modules as billingModules } from "../../components/billing/testSetup.test-util";
import { modules as integrationsModules } from "../../components/integrations/testSetup.test-util";
import { modules as guidesModules } from "../../components/guides/testSetup.test-util";
import { modules as supportModules } from "../../components/support/testSetup.test-util";
import { modules as externalReviewsModules } from "../../components/externalReviews/testSetup.test-util";
import { modules as classificationModules } from "../../components/classification/testSetup.test-util";
import { modules as subscriptionsModules } from "../../components/subscriptions/testSetup.test-util";
import { modules as picksModules } from "../../components/picks/testSetup.test-util";
import { modules as broadcastsModules } from "../../components/broadcasts/testSetup.test-util";

/**
 * Registry mapping component names (matching convex.config.ts variable names)
 * to their schema + modules needed by `t.registerComponent()`.
 */
const COMPONENT_REGISTRY = {
    audit: { schema: auditSchema, modules: auditModules },
    reviews: { schema: reviewsSchema, modules: reviewsModules },
    notifications: { schema: notificationsSchema, modules: notificationsModules },
    userPrefs: { schema: userPrefsSchema, modules: userPrefsModules },
    messaging: { schema: messagingSchema, modules: messagingModules },
    analytics: { schema: analyticsSchema, modules: analyticsModules },
    compliance: { schema: complianceSchema, modules: complianceModules },
    tenantConfig: { schema: tenantConfigSchema, modules: tenantConfigModules },
    resources: { schema: resourcesSchema, modules: resourcesModules },
    pricing: { schema: pricingSchema, modules: pricingModules },
    addons: { schema: addonsSchema, modules: addonsModules },
    auth: { schema: authSchema, modules: authModules },
    rbac: { schema: rbacSchema, modules: rbacModules },
    billing: { schema: billingSchema, modules: billingModules },
    integrations: { schema: integrationsSchema, modules: integrationsModules },
    guides: { schema: guidesSchema, modules: guidesModules },
    support: { schema: supportSchema, modules: supportModules },
    externalReviews: { schema: externalReviewsSchema, modules: externalReviewsModules },
    classification: { schema: classificationSchema, modules: classificationModules },
    subscriptions: { schema: subscriptionsSchema, modules: subscriptionsModules },
    picks: { schema: picksSchema, modules: picksModules },
    broadcasts: { schema: broadcastsSchema, modules: broadcastsModules },
} as const;

export type ComponentName = keyof typeof COMPONENT_REGISTRY;

/**
 * Create a convexTest instance with the app schema and register
 * only the specified components. This gives each test file a minimal
 * but realistic environment.
 */
export function createDomainTest(componentNames: ComponentName[]) {
    const t = convexTest(schema, modules);
    for (const name of componentNames) {
        const c = COMPONENT_REGISTRY[name];
        t.registerComponent(name, c.schema as any, c.modules);
    }
    return t;
}

/**
 * Seed a minimal tenant + users into the core tables.
 * Returns IDs that can be passed as typed `v.id("tenants")` args to facades.
 */
export async function seedTestTenant(t: ReturnType<typeof convexTest>) {
    return t.run(async (ctx) => {
        const tenantId = await ctx.db.insert("tenants", {
            name: "Test Tenant",
            slug: "test-tenant",
            status: "active",
            settings: {},
            seatLimits: { max: 100 },
            featureFlags: {
                seasons: true,
                analytics: true,
                messaging: true,
                compliance: true,
                integrations: true,
                guides: true,
                support: true,
                classification: true,
            },
            enabledCategories: ["ALLE", "LOKALER", "ARRANGEMENTER"],
        });

        const adminId = await ctx.db.insert("users", {
            email: "admin@test.no",
            name: "Test Admin",
            role: "admin",
            status: "active",
            tenantId,
            metadata: {},
        });

        const userId = await ctx.db.insert("users", {
            email: "user@test.no",
            name: "Test User",
            role: "user",
            status: "active",
            tenantId,
            metadata: {},
        });

        // Create tenantUser memberships
        const now = Date.now();
        await ctx.db.insert("tenantUsers", {
            tenantId,
            userId: adminId,
            status: "active",
            joinedAt: now,
        });
        await ctx.db.insert("tenantUsers", {
            tenantId,
            userId,
            status: "active",
            joinedAt: now,
        });

        return { tenantId, adminId, userId };
    });
}

/**
 * Seed a resource in the resources component.
 * Superset of all per-file seedResource helpers — accepts all possible overrides
 * so callers only need to pass what they care about.
 *
 * Requires that the convexTest instance has registered the "resources" component.
 */
export async function seedResource(
    t: ReturnType<typeof convexTest>,
    tenantId: string,
    overrides: Partial<{
        name: string;
        slug: string;
        categoryKey: string;
        status: string;
        capacity: number;
        description: string;
        metadata: Record<string, unknown>;
        subcategoryKeys: string[];
    }> = {}
) {
    return (t as any).mutation(components.resources.mutations.create, {
        tenantId,
        name: overrides.name ?? "Hovedscenen",
        slug: overrides.slug ?? "hovedscenen",
        categoryKey: overrides.categoryKey ?? "LOKALER",
        status: overrides.status ?? "active",
        capacity: overrides.capacity,
        description: overrides.description,
        metadata: overrides.metadata,
        subcategoryKeys: overrides.subcategoryKeys,
    });
}

/**
 * Grant a single permission to a user via the RBAC component.
 *
 * Requires that the convexTest instance has registered the "rbac" component.
 */
export async function grantPermission(
    t: ReturnType<typeof convexTest>,
    tenantId: string,
    userId: string,
    permission: string
) {
    const role = await (t as any).mutation(components.rbac.mutations.createRole, {
        tenantId,
        name: `Role-${permission}`,
        permissions: [permission],
        isSystem: true,
    });
    await (t as any).mutation(components.rbac.mutations.assignRole, {
        tenantId,
        userId,
        roleId: role.id as any,
    });
    return role;
}

/**
 * Grant booking-related RBAC permissions to a user via the RBAC component.
 * Default set covers all booking operations (view, write, approve, cancel, delete).
 *
 * Requires that the convexTest instance has registered the "rbac" component.
 */
export async function grantAdminPermissions(
    t: ReturnType<typeof convexTest>,
    tenantId: string,
    userId: string,
    permissions: string[] = [
        "resource:view",
        "resource:write",
        "resource:publish",
        "resource:delete",
        "messaging:admin",
        "review:moderate",
        "audit:view",
    ]
) {
    const role = await (t as any).mutation(components.rbac.mutations.createRole, {
        tenantId,
        name: "Admin",
        permissions,
        isSystem: true,
    });
    await (t as any).mutation(components.rbac.mutations.assignRole, {
        tenantId,
        userId,
        roleId: role.id as any,
    });
    return role;
}

/**
 * Seed a second tenant for cross-tenant isolation tests.
 */
export async function seedSecondTenant(t: ReturnType<typeof convexTest>) {
    return t.run(async (ctx) => {
        const tenantId = await ctx.db.insert("tenants", {
            name: "Other Tenant",
            slug: "other-tenant",
            status: "active",
            settings: {},
            seatLimits: { max: 50 },
            featureFlags: {},
            enabledCategories: ["ALLE"],
        });

        const userId = await ctx.db.insert("users", {
            email: "other@test.no",
            name: "Other User",
            role: "user",
            status: "active",
            tenantId,
            metadata: {},
        });

        await ctx.db.insert("tenantUsers", {
            tenantId,
            userId,
            status: "active",
            joinedAt: Date.now(),
        });

        return { tenantId, userId };
    });
}
