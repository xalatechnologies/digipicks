/**
 * Platform Role-Based Capability Definitions
 *
 * Unified capability matrix for the dashboard portal. Covers superadmin
 * (platform-level), tenant admin, and end-user roles.
 *
 * @see apps/dashboard - Unified portal
 */

/**
 * Platform role hierarchy — simplified to 3 roles.
 *
 * - superadmin: Platform infrastructure only (tenants, billing, modules, flags, integrations)
 * - admin: Platform admin — sees all tenants cross-tenant (listings, resources, etc.)
 * - user: Tenant-level — acts as both tenant admin (owner) and end-user, scoped to own tenant
 */
export type PlatformRole =
  | 'superadmin'    // Platform infra (SaaS admin)
  | 'admin'         // Platform admin (cross-tenant)
  | 'user';         // Tenant admin + end-user (own tenant only)

/** Roles that grant superadmin access (normalized from various auth sources) */
export const SUPERADMIN_ROLES = new Set([
  'superadmin', 'super_admin', 'saasadmin', 'SaaSAdmin', 'SuperAdmin',
]);

/**
 * Capability definitions for feature-level access control.
 */
export type Capability =
  // Listings / Resources
  | 'CAP_LISTING_READ'
  | 'CAP_LISTING_CREATE'
  | 'CAP_LISTING_EDIT'
  // Users & orgs
  | 'CAP_USER_VIEW'
  | 'CAP_USER_ADMIN'
  | 'CAP_ORG_VIEW'
  | 'CAP_ORG_ADMIN'
  // Settings
  | 'CAP_SETTINGS_VIEW'
  | 'CAP_SETTINGS_ADMIN'
  // Audit & reports
  | 'CAP_AUDIT_VIEW'
  | 'CAP_REPORTS_VIEW'
  | 'CAP_REPORTS_EXPORT'
  // Platform (superadmin)
  | 'CAP_PLATFORM_ADMIN'
  | 'CAP_TENANT_MANAGE'
  | 'CAP_MODULE_MANAGE'
  | 'CAP_PLATFORM_BILLING'
  // Tenant admin extras
  | 'CAP_TENANT_SETTINGS'
  | 'CAP_TENANT_BRANDING'
  | 'CAP_EMAIL_TEMPLATE_MANAGE'
  | 'CAP_FORM_BUILDER'
  | 'CAP_INTEGRATION_MANAGE'
  | 'CAP_PAYMENT_RECONCILE'
  | 'CAP_GDPR_MANAGE'
  | 'CAP_WEBHOOK_MANAGE';

/** All tenant-level capabilities (admin/owner get these) */
const TENANT_ADMIN_CAPS: Capability[] = [
  'CAP_LISTING_READ',
  'CAP_LISTING_CREATE',
  'CAP_LISTING_EDIT',
  'CAP_USER_VIEW',
  'CAP_USER_ADMIN',
  'CAP_ORG_VIEW',
  'CAP_ORG_ADMIN',
  'CAP_SETTINGS_VIEW',
  'CAP_SETTINGS_ADMIN',
  'CAP_AUDIT_VIEW',
  'CAP_REPORTS_VIEW',
  'CAP_REPORTS_EXPORT',
  'CAP_TENANT_SETTINGS',
  'CAP_TENANT_BRANDING',
  'CAP_EMAIL_TEMPLATE_MANAGE',
  'CAP_FORM_BUILDER',
  'CAP_INTEGRATION_MANAGE',
  'CAP_PAYMENT_RECONCILE',
  'CAP_GDPR_MANAGE',
  'CAP_WEBHOOK_MANAGE',
];

/** Platform-level capabilities (superadmin only) */
const PLATFORM_CAPS: Capability[] = [
  'CAP_PLATFORM_ADMIN',
  'CAP_TENANT_MANAGE',
  'CAP_MODULE_MANAGE',
  'CAP_PLATFORM_BILLING',
];

/**
 * Role-to-capability mapping.
 * admin and user share the same feature capabilities — the difference is DATA SCOPE:
 * - admin sees cross-tenant data
 * - user sees only own tenant data (tenant admin + end-user)
 */
export const ROLE_CAPABILITIES: Record<PlatformRole, Capability[]> = {
  superadmin: [...TENANT_ADMIN_CAPS, ...PLATFORM_CAPS],
  admin: TENANT_ADMIN_CAPS,
  user: TENANT_ADMIN_CAPS, // same feature caps, but scoped to own tenant
};

export function getCapabilitiesForRole(role: PlatformRole | undefined): Capability[] {
  if (!role) return [];
  return ROLE_CAPABILITIES[role] ?? [];
}

export function roleHasCapability(
  role: PlatformRole | undefined,
  capability: Capability
): boolean {
  return getCapabilitiesForRole(role).includes(capability);
}

/** Check if a raw role string represents a superadmin */
export function isSuperadminRole(role: string | undefined | null): boolean {
  return !!role && SUPERADMIN_ROLES.has(role);
}
