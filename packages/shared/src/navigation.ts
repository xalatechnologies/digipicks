/**
 * @digilist-saas/shared - Navigation
 *
 * Shared navigation configurations for DigilistSaaS apps.
 * Sidebar sections, bottom nav items, and skip links.
 */

import type { AppId } from './types';

// =============================================================================
// Navigation Types
// =============================================================================

/** Sidebar navigation item */
export interface NavItem {
    id: string;
    name: string;
    nameKey: string; // i18n key
    description?: string;
    descriptionKey?: string; // i18n key
    href: string;
    icon: string; // Icon name (resolved in app)
    badge?: string | number;
}

/** Sidebar section */
export interface NavSection {
    id?: string;
    title?: string;
    titleKey?: string; // i18n key
    items: NavItem[];
}

/** Bottom navigation item */
export interface BottomNavItem {
    id: string;
    label: string;
    labelKey: string; // i18n key
    icon: string;
    href: string;
}

/** Skip link for accessibility */
export interface SkipLink {
    targetId: string;
    label: string;
    labelKey: string; // i18n key
}

/** Dashboard layout variant */
export type DashboardVariant = 'minside' | 'backoffice' | 'platform';

/** Docs layout: tree-type navigation item (recursive) */
export interface DocsTreeNavItem {
    id: string;
    label: string;
    labelKey?: string;
    /** Link target; omit for group/folder nodes */
    href?: string;
    children?: DocsTreeNavItem[];
}

/** Unified dashboard nav item - contexts for minside, roles for backoffice */
export interface DashboardNavItemConfig extends Omit<NavItem, 'name' | 'description'> {
    nameKey: string;
    descriptionKey?: string;
    description?: string;
    /** minside: filter by account context */
    contexts?: ('personal' | 'organization')[];
    /** backoffice: filter by effective role */
    roles?: ('superadmin' | 'admin' | 'user')[];
    module?: string;
    /** Filter by dashboard mode (user role only). Omit = show in all modes. */
    modes?: ('leietaker' | 'utleier')[];
    /** Hide this item for users who are owners (have a tenantId). */
    hideForOwners?: boolean;
}

/** Unified dashboard nav section */
export interface DashboardNavSectionConfig {
    title?: string;
    titleKey?: string;
    items: DashboardNavItemConfig[];
}

/** Dashboard nav config per variant */
export interface DashboardNavConfig {
    sections: DashboardNavSectionConfig[];
    bottomNavIds: readonly string[];
}

// =============================================================================
// Skip Links (shared across all apps)
// =============================================================================

export const SKIP_LINKS: SkipLink[] = [
    {
        targetId: 'main-content',
        label: 'Hopp til hovedinnhold',
        labelKey: 'common.skipToMain',
    },
    {
        targetId: 'main-navigation',
        label: 'Hopp til navigasjon',
        labelKey: 'common.skipToNav',
    },
];

// =============================================================================
// Backoffice Navigation
// =============================================================================

export const BACKOFFICE_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            {
                id: 'dashboard',
                name: 'Dashboard',
                nameKey: 'backoffice.nav.dashboard',
                descriptionKey: 'backoffice.nav.dashboardDesc',
                href: '/',
                icon: 'home',
            },
        ],
    },
    {
        title: 'Management',
        titleKey: 'backoffice.nav.sectionManagement',
        items: [
            {
                id: 'tenants',
                name: 'Tenants',
                nameKey: 'backoffice.nav.tenants',
                descriptionKey: 'backoffice.nav.tenantsDesc',
                href: '/tenants',
                icon: 'building',
            },
            {
                id: 'modules',
                name: 'Modules',
                nameKey: 'backoffice.nav.modules',
                descriptionKey: 'backoffice.nav.modulesDesc',
                href: '/modules',
                icon: 'sparkles',
            },
            {
                id: 'plans',
                name: 'Plans',
                nameKey: 'backoffice.nav.plans',
                descriptionKey: 'backoffice.nav.plansDesc',
                href: '/plans',
                icon: 'chart',
            },
            {
                id: 'users',
                name: 'Users',
                nameKey: 'backoffice.nav.users',
                descriptionKey: 'backoffice.nav.usersDesc',
                href: '/users',
                icon: 'users',
            },
        ],
    },
    {
        title: 'Operations',
        titleKey: 'backoffice.nav.sectionOperations',
        items: [
            {
                id: 'billing',
                name: 'Billing',
                nameKey: 'backoffice.nav.billing',
                descriptionKey: 'backoffice.nav.billingDesc',
                href: '/billing',
                icon: 'chart',
            },
            {
                id: 'governance',
                name: 'Governance',
                nameKey: 'backoffice.nav.governance',
                descriptionKey: 'backoffice.nav.governanceDesc',
                href: '/governance',
                icon: 'shield',
            },
            {
                id: 'settings',
                name: 'Settings',
                nameKey: 'backoffice.nav.settings',
                descriptionKey: 'backoffice.nav.settingsDesc',
                href: '/settings',
                icon: 'settings',
            },
        ],
    },
];

export const BACKOFFICE_BOTTOM_NAV: BottomNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelKey: 'backoffice.nav.dashboard', icon: 'home', href: '/' },
    { id: 'tenants', label: 'Tenants', labelKey: 'backoffice.nav.tenants', icon: 'building', href: '/tenants' },
    { id: 'billing', label: 'Billing', labelKey: 'backoffice.nav.billing', icon: 'chart', href: '/billing' },
    { id: 'settings', label: 'Settings', labelKey: 'backoffice.nav.settings', icon: 'settings', href: '/settings' },
];

// =============================================================================
// Dashboard Navigation
// =============================================================================

export const DASHBOARD_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            {
                id: 'dashboard',
                name: 'Dashboard',
                nameKey: 'dashboard.nav.dashboard',
                descriptionKey: 'dashboard.nav.dashboardDesc',
                href: '/',
                icon: 'home',
            },
        ],
    },
    {
        title: 'Domain',
        titleKey: 'dashboard.nav.sectionDomain',
        items: [
            {
                id: 'objects',
                name: 'Objects',
                nameKey: 'dashboard.nav.objects',
                descriptionKey: 'dashboard.nav.objectsDesc',
                href: '/objects',
                icon: 'building',
            },

        ],
    },
    {
        title: 'Tenant',
        titleKey: 'dashboard.nav.sectionTenant',
        items: [
            {
                id: 'users',
                name: 'Users',
                nameKey: 'dashboard.nav.users',
                descriptionKey: 'dashboard.nav.usersDesc',
                href: '/users',
                icon: 'users',
            },
            {
                id: 'settings',
                name: 'Settings',
                nameKey: 'dashboard.nav.settings',
                descriptionKey: 'dashboard.nav.settingsDesc',
                href: '/settings',
                icon: 'settings',
            },
        ],
    },
];

export const DASHBOARD_BOTTOM_NAV: BottomNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelKey: 'dashboard.nav.dashboard', icon: 'home', href: '/' },
    { id: 'objects', label: 'Objects', labelKey: 'dashboard.nav.objects', icon: 'building', href: '/objects' },

    { id: 'settings', label: 'Settings', labelKey: 'dashboard.nav.settings', icon: 'settings', href: '/settings' },
];

// =============================================================================
// Monitoring Navigation
// =============================================================================

export const MONITORING_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            {
                id: 'health',
                name: 'Health',
                nameKey: 'monitoring.nav.health',
                descriptionKey: 'monitoring.nav.healthDesc',
                href: '/',
                icon: 'home',
            },
        ],
    },
    {
        title: 'Observability',
        titleKey: 'monitoring.nav.sectionObservability',
        items: [
            {
                id: 'metrics',
                name: 'Metrics',
                nameKey: 'monitoring.nav.metrics',
                descriptionKey: 'monitoring.nav.metricsDesc',
                href: '/metrics',
                icon: 'chart',
            },
            {
                id: 'outbox',
                name: 'Outbox',
                nameKey: 'monitoring.nav.outbox',
                descriptionKey: 'monitoring.nav.outboxDesc',
                href: '/outbox',
                icon: 'settings',
            },
            {
                id: 'errors',
                name: 'Errors',
                nameKey: 'monitoring.nav.errors',
                descriptionKey: 'monitoring.nav.errorsDesc',
                href: '/errors',
                icon: 'shield',
            },
        ],
    },
];

// =============================================================================
// SaaS Admin Navigation
// =============================================================================

export const SAAS_ADMIN_NAV_SECTIONS: NavSection[] = [
    {
        items: [
            {
                id: 'overview',
                name: 'Overview',
                nameKey: 'saasAdmin.nav.overview',
                descriptionKey: 'saasAdmin.nav.overviewDesc',
                href: '/',
                icon: 'home',
            },
        ],
    },
    {
        title: 'Platform',
        titleKey: 'saasAdmin.nav.sectionPlatform',
        items: [
            {
                id: 'tenants',
                name: 'Tenants',
                nameKey: 'saasAdmin.nav.tenants',
                descriptionKey: 'saasAdmin.nav.tenantsDesc',
                href: '/tenants',
                icon: 'building',
            },
            {
                id: 'users',
                name: 'Users',
                nameKey: 'saasAdmin.nav.users',
                descriptionKey: 'saasAdmin.nav.usersDesc',
                href: '/users',
                icon: 'users',
            },
            {
                id: 'modules',
                name: 'Modules',
                nameKey: 'saasAdmin.nav.modules',
                descriptionKey: 'saasAdmin.nav.modulesDesc',
                href: '/modules',
                icon: 'sparkles',
            },
            {
                id: 'moderation',
                name: 'Moderation',
                nameKey: 'saasAdmin.nav.moderation',
                descriptionKey: 'saasAdmin.nav.moderationDesc',
                href: '/moderation',
                icon: 'shield',
            },
        ],
    },
    {
        title: 'Operations',
        titleKey: 'saasAdmin.nav.sectionOperations',
        items: [
            {
                id: 'billing',
                name: 'Billing',
                nameKey: 'saasAdmin.nav.billing',
                descriptionKey: 'saasAdmin.nav.billingDesc',
                href: '/billing',
                icon: 'creditCard',
            },
            {
                id: 'audit',
                name: 'Audit Log',
                nameKey: 'saasAdmin.nav.audit',
                descriptionKey: 'saasAdmin.nav.auditDesc',
                href: '/audit',
                icon: 'clock',
            },
        ],
    },
];

export const SAAS_ADMIN_BOTTOM_NAV: BottomNavItem[] = [
    { id: 'overview', label: 'Overview', labelKey: 'saasAdmin.nav.overview', icon: 'home', href: '/' },
    { id: 'tenants', label: 'Tenants', labelKey: 'saasAdmin.nav.tenants', icon: 'building', href: '/tenants' },
    { id: 'users', label: 'Users', labelKey: 'saasAdmin.nav.users', icon: 'users', href: '/users' },
    { id: 'audit', label: 'Audit', labelKey: 'saasAdmin.nav.audit', icon: 'clock', href: '/audit' },
];

// =============================================================================
// Get Navigation by App
// =============================================================================

// =============================================================================
// Dashboard Navigation (unified config by variant)
// =============================================================================

export const DASHBOARD_NAV_CONFIG: Record<DashboardVariant, DashboardNavConfig> = {
    minside: {
        bottomNavIds: ['dashboard', 'notifications', 'settings'],
        sections: [
            {
                items: [
                    { id: 'dashboard', nameKey: 'minside.dashboard', descriptionKey: 'minside.dashboardDesc', href: '/', icon: 'home', contexts: ['personal', 'organization'] },
                ],
            },
            {
                titleKey: 'minside.myActivity',
                items: [
                    { id: 'billing', nameKey: 'minside.billing', descriptionKey: 'minside.billingDesc', href: '/billing', icon: 'creditCard', contexts: ['personal'] },
                    { id: 'notifications', nameKey: 'minside.notifications', descriptionKey: 'minside.notificationsDesc', href: '/notifications', icon: 'message', contexts: ['personal', 'organization'] },
                ],
            },
            {
                titleKey: 'minside.account',
                items: [
                    { id: 'settings', nameKey: 'minside.settings', descriptionKey: 'minside.settingsDesc', href: '/preferences', icon: 'settings', contexts: ['personal'] },
                    { id: 'help', nameKey: 'minside.help', descriptionKey: 'minside.helpDesc', href: '/help', icon: 'bookOpen', contexts: ['personal', 'organization'] },
                ],
            },
            {
                titleKey: 'org.organization',
                items: [
                    { id: 'org-dashboard', nameKey: 'org.dashboard', descriptionKey: 'org.dashboardDesc', href: '/org', icon: 'home', contexts: ['organization'] },
                    { id: 'org-invoices', nameKey: 'org.invoices', descriptionKey: 'org.invoicesDesc', href: '/org/invoices', icon: 'creditCard', contexts: ['organization'] },
                    { id: 'org-members', nameKey: 'org.members', descriptionKey: 'org.membersDesc', href: '/org/members', icon: 'users', contexts: ['organization'] },
                    { id: 'org-settings', nameKey: 'org.settings', descriptionKey: 'org.settingsDesc', href: '/org/settings', icon: 'settings', contexts: ['organization'] },
                    { id: 'org-activity', nameKey: 'org.activity', descriptionKey: 'org.activityDesc', href: '/org/activity', icon: 'calendar', contexts: ['organization'] },
                ],
            },
        ],
    },
    backoffice: {
        bottomNavIds: ['dashboard', 'listings', 'messages', 'settings'],
        sections: [
            {
                items: [
                    { id: 'dashboard', nameKey: 'backoffice.nav.dashboard', description: 'Oversikt og statistikk', href: '/', icon: 'home', roles: ['superadmin', 'admin', 'user'] },
                ],
            },
            {
                title: 'Administrasjon',
                items: [
                    { id: 'listings', nameKey: 'backoffice.nav.listings', description: 'Administrer lokaler og utstyr', href: '/listings', icon: 'building', roles: ['superadmin', 'admin', 'user'], modes: ['utleier'] },
                    { id: 'form-builder', nameKey: 'backoffice.nav.formBuilder', description: 'Bygg og administrer skjemaer', href: '/form-builder', icon: 'fileText', roles: ['superadmin', 'admin'] },
                ],
            },

            {
                title: 'Økonomi',
                items: [
                    { id: 'economy', nameKey: 'backoffice.nav.economy', description: 'Økonomi, fakturaer og rapporter', href: '/economy', icon: 'chart', roles: ['admin'] },
                ],
            },
            {
                title: 'Innsikt',
                items: [
                    { id: 'reports', nameKey: 'backoffice.nav.reports', description: 'Statistikk og eksport', href: '/reports', icon: 'chart', roles: ['admin'] },
                    { id: 'payment-reconciliation', nameKey: 'backoffice.nav.paymentReconciliation', description: 'Avstem betalinger', href: '/payments/reconciliation', icon: 'creditCard', roles: ['admin'] },
                    { id: 'pricing-rules', nameKey: 'backoffice.nav.pricingRules', description: 'Administrer priser', href: '/pricing-rules', icon: 'settings', roles: ['admin', 'user'], modes: ['utleier'] },
                    { id: 'equipment-services', nameKey: 'backoffice.nav.equipmentServices', description: 'Utstyr og tilleggstjenester', href: '/equipment-services', icon: 'building', roles: ['admin', 'user'], modes: ['utleier'] },
                    { id: 'innhold', nameKey: 'backoffice.nav.innhold', description: 'Innhold på lokaler', href: '/innhold', icon: 'fileText', roles: ['admin', 'user'], modes: ['utleier'] },
                ],
            },
            {
                title: 'Brukere',
                items: [
                    { id: 'organizations', nameKey: 'backoffice.nav.organizations', description: 'Administrer organisasjoner', href: '/organizations', icon: 'organization', roles: ['admin'] },
                    { id: 'users', nameKey: 'backoffice.nav.users', description: 'Administrer brukere', href: '/users', icon: 'users', roles: ['admin'] },
                ],
            },
            {
                title: 'Innstillinger',
                items: [
                    { id: 'integrations', nameKey: 'backoffice.nav.integrations', description: 'Tilkoblinger og APIer', href: '/integrations', icon: 'settings', roles: ['admin'] },
                    { id: 'listing-wizard', nameKey: 'backoffice.nav.listingWizard', description: 'Opprett lokale', href: '/listings/wizard', icon: 'building', roles: ['admin', 'user'], modes: ['utleier'] },
                    { id: 'tenant-settings', nameKey: 'backoffice.nav.tenantSettings', description: 'Konfigurer tenant', href: '/tenant/settings', icon: 'settings', roles: ['admin'] },
                    { id: 'tenant-branding', nameKey: 'backoffice.nav.tenantBranding', description: 'Logo og farger', href: '/tenant/branding', icon: 'building', roles: ['admin'] },
                    { id: 'reviews-moderation', nameKey: 'backoffice.nav.reviewsModeration', description: 'Moderer anmeldelser', href: '/reviews/moderation', icon: 'checkCircle', roles: ['admin'], module: 'reviews' },
                    { id: 'reviews-integrations', nameKey: 'backoffice.nav.reviewsIntegrations', description: 'Google og TripAdvisor', href: '/reviews/integrations', icon: 'link', roles: ['admin'], module: 'reviews' },
                    { id: 'audit', nameKey: 'backoffice.nav.audit', description: 'Systemhendelser', href: '/audit', icon: 'clock', roles: ['admin'] },
                    { id: 'settings', nameKey: 'backoffice.nav.settings', description: 'Systemkonfigurasjon', href: '/settings', icon: 'settings', roles: ['admin', 'user'], modes: ['utleier'] },
                ],
            },
            {
                titleKey: 'nav.mySection',
                items: [
                    { id: 'my-dashboard', nameKey: 'nav.myDashboard', description: 'Din personlige oversikt', href: '/', icon: 'home', roles: ['user'], modes: ['leietaker'] },
                    { id: 'my-billing', nameKey: 'nav.myBilling', description: 'Faktura og betaling', href: '/billing', icon: 'creditCard', roles: ['user'], modes: ['leietaker'] },
                ],
            },
            {
                titleKey: 'nav.orgSection',
                items: [
                    { id: 'org-dashboard', nameKey: 'nav.orgDashboard', description: 'Organisasjonsoversikt', href: '/org', icon: 'building', roles: ['user'], contexts: ['organization'] },
                    { id: 'org-members', nameKey: 'nav.orgMembers', description: 'Medlemmer', href: '/org/members', icon: 'users', roles: ['user'], contexts: ['organization'] },
                    { id: 'org-invoices', nameKey: 'nav.orgInvoices', description: 'Fakturaer', href: '/org/invoices', icon: 'creditCard', roles: ['user'], contexts: ['organization'] },
                    { id: 'org-activity', nameKey: 'nav.orgActivity', description: 'Aktivitetslogg', href: '/org/activity', icon: 'clock', roles: ['user'], contexts: ['organization'] },
                    { id: 'org-settings', nameKey: 'nav.orgSettings', description: 'Organisasjonsinnstillinger', href: '/org/settings', icon: 'settings', roles: ['user'], contexts: ['organization'] },
                ],
            },
        ],
    },
    platform: {
        bottomNavIds: ['overview', 'tenants', 'users', 'audit'],
        sections: [
            {
                items: [
                    { id: 'platform-overview', nameKey: 'platform.nav.overview', description: 'Platform overview', href: '/platform', icon: 'home', roles: ['superadmin'] },
                ],
            },
            {
                title: 'Platform',
                titleKey: 'platform.nav.sectionPlatform',
                items: [
                    { id: 'platform-tenants', nameKey: 'platform.nav.tenants', description: 'Manage tenants', href: '/platform/tenants', icon: 'building', roles: ['superadmin'] },
                    { id: 'platform-users', nameKey: 'platform.nav.users', description: 'Platform users', href: '/platform/users', icon: 'users', roles: ['superadmin'] },
                    { id: 'platform-modules', nameKey: 'platform.nav.modules', description: 'Feature modules', href: '/platform/modules', icon: 'sparkles', roles: ['superadmin'] },
                    { id: 'platform-moderation', nameKey: 'platform.nav.moderation', description: 'Content moderation', href: '/platform/moderation', icon: 'shield', roles: ['superadmin'] },
                    { id: 'platform-applications', nameKey: 'platform.nav.applications', description: 'Søknader om utleiertilgang', href: '/platform/applications', icon: 'fileText', roles: ['superadmin'] },
                ],
            },
            {
                title: 'Operations',
                titleKey: 'platform.nav.sectionOperations',
                items: [
                    { id: 'platform-billing', nameKey: 'platform.nav.billing', description: 'Platform billing', href: '/platform/billing', icon: 'creditCard', roles: ['superadmin'] },
                    { id: 'platform-audit', nameKey: 'platform.nav.audit', description: 'Audit log', href: '/platform/audit', icon: 'clock', roles: ['superadmin'] },
                ],
            },
        ],
    },
};

// =============================================================================
// Get Navigation by App
// =============================================================================

export function getNavSections(appId: AppId): NavSection[] {
    switch (appId) {
        case 'backoffice':
            return BACKOFFICE_NAV_SECTIONS;
        case 'dashboard':
            return DASHBOARD_NAV_SECTIONS;
        case 'monitoring':
            return MONITORING_NAV_SECTIONS;
        case 'saas-admin':
            return SAAS_ADMIN_NAV_SECTIONS;
        default:
            return [];
    }
}

export function getBottomNav(appId: AppId): BottomNavItem[] {
    switch (appId) {
        case 'backoffice':
            return BACKOFFICE_BOTTOM_NAV;
        case 'dashboard':
            return DASHBOARD_BOTTOM_NAV;
        case 'saas-admin':
            return SAAS_ADMIN_BOTTOM_NAV;
        default:
            return [];
    }
}
