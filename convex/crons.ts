/**
 * Convex Cron Jobs
 *
 * Scheduled functions that run periodically to maintain system health:
 * - Expire abandoned carts and release inventory holds
 * - Update performance availability statuses
 * - Clean up expired sessions, gift cards, and resale listings
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();



// ---------------------------------------------------------------------------
// Retention — Automated Data Cleanup (daily at 02:00 UTC)
// ---------------------------------------------------------------------------

crons.daily(
    "retentionPurge",
    { hourUTC: 2, minuteUTC: 0 },
    internal.domain.retention.runRetentionPurge
);

// ---------------------------------------------------------------------------
// Auth — Session Cleanup (daily at 03:00 UTC)
// ---------------------------------------------------------------------------

crons.daily(
    "cleanupExpiredSessions",
    { hourUTC: 3, minuteUTC: 0 },
    internal.cronFunctions.cleanupExpiredSessions
);



// ---------------------------------------------------------------------------
// Ticketing — Event Reminders (every hour)
// ---------------------------------------------------------------------------

crons.interval(
    "sendEventReminders",
    { hours: 1 },
    internal.domain.reminders.processDueReminders
);

// ---------------------------------------------------------------------------
// Event Bus — Process Pending Events (every minute)
// ---------------------------------------------------------------------------

crons.interval(
    "processEventBus",
    { minutes: 1 },
    internal.lib.eventBus.processEvents,
    {}
);

// ---------------------------------------------------------------------------
// Event Bus — Clean Up Old Events (daily at 04:00 UTC)
// ---------------------------------------------------------------------------

crons.daily(
    "cleanupProcessedEvents",
    { hourUTC: 4, minuteUTC: 0 },
    internal.lib.eventBus.cleanupProcessed,
    {}
);

// ---------------------------------------------------------------------------
// External Reviews — Sync from Google Places & TripAdvisor (every 4 hours)
// ---------------------------------------------------------------------------

crons.interval(
    "syncExternalReviews",
    { hours: 4 },
    internal.domain.externalReviews.syncAllTenants
);



// ---------------------------------------------------------------------------
// Scheduled Publishing — Auto-publish & Auto-unpublish (every minute)
// ---------------------------------------------------------------------------

crons.interval(
    "processScheduledPublishing",
    { minutes: 1 },
    internal.cronFunctions.processScheduledPublishing
);

// ---------------------------------------------------------------------------
// Scheduled Pick Publishing — Auto-publish draft picks (every minute)
// ---------------------------------------------------------------------------

crons.interval(
    "processScheduledPickPublishing",
    { minutes: 1 },
    internal.cronFunctions.processScheduledPickPublishing
);

// ---------------------------------------------------------------------------
// Listing Lifecycle — Expiration (daily at 01:00 UTC)
// ---------------------------------------------------------------------------

crons.daily(
    "expireListings",
    { hourUTC: 1, minuteUTC: 0 },
    internal.cronFunctions.expireListings
);



export default crons;
