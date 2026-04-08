/**
 * DigilistSaaS App Configuration
 *
 * Registers Convex components for the plug-and-play platform architecture.
 * Components are added incrementally as they are migrated from the monolithic schema.
 *
 * @see docs/DOMAIN_BUNDLE_SPEC.md for the component contract specification
 */
import { defineApp } from "convex/server";

const app = defineApp();

// =============================================================================
// COMPONENTS — Added as each domain is migrated
// =============================================================================

// Phase 1b: audit (general-purpose audit log)
import audit from "./components/audit/convex.config";
app.use(audit);

// Phase 1c: reviews
import reviews from "./components/reviews/convex.config";
app.use(reviews);

// Phase 1d: notifications
import notifications from "./components/notifications/convex.config";
app.use(notifications);

// Phase 1e: user-prefs (favorites + savedFilters)
import userPrefs from "./components/user-prefs/convex.config";
app.use(userPrefs);

// Phase 2a: messaging
import messaging from "./components/messaging/convex.config";
app.use(messaging);

// Phase 2c: analytics (monitoring + reporting)
import analytics from "./components/analytics/convex.config";
app.use(analytics);

// Phase 2d: compliance
import compliance from "./components/compliance/convex.config";
app.use(compliance);

// Phase 2e: tenant-config (feature flags + branding)
import tenantConfig from "./components/tenant-config/convex.config";
app.use(tenantConfig);

// Workstream 1: resources
import resources from "./components/resources/convex.config";
app.use(resources);

// Phase 3b: pricing
import pricing from "./components/pricing/convex.config";
app.use(pricing);

// Phase 3c: addons
import addons from "./components/addons/convex.config";
app.use(addons);

// Phase 4a: auth
import auth from "./components/auth/convex.config";
app.use(auth);

// Phase 4b: rbac
import rbac from "./components/rbac/convex.config";
app.use(rbac);

// Phase 4c: billing
import billing from "./components/billing/convex.config";
app.use(billing);

// Phase 4d: integrations
import integrations from "./components/integrations/convex.config";
app.use(integrations);

// Phase 5: guides
import guides from "./components/guides/convex.config";
app.use(guides);

// Phase 5b: support (ticketing system)
import support from "./components/support/convex.config";
app.use(support);

// Phase 6c: subscriptions (membership tiers, memberships, benefit usage)
import subscriptions from "./components/subscriptions/convex.config";
app.use(subscriptions);

// Phase 7a: external-reviews (Google Places, TripAdvisor review aggregation)
import externalReviews from "./components/externalReviews/convex.config";
app.use(externalReviews);

// Phase 7b: classification (hierarchical categories, tags, attribute definitions)
import classification from "./components/classification/convex.config";
app.use(classification);

// DigiPicks: picks (creator pick posting, result tracking)
import picks from "./components/picks/convex.config";
app.use(picks);

// DigiPicks: broadcasts (creator-to-subscriber messaging)
import broadcasts from "./components/broadcasts/convex.config";
app.use(broadcasts);

// DigiPicks: emailCampaigns (transactional + marketing email campaigns)
import emailCampaigns from "./components/emailCampaigns/convex.config";
app.use(emailCampaigns);

export default app;
