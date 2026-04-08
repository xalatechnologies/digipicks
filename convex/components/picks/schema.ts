/**
 * Picks Component Schema
 *
 * External references (tenantId, creatorId) use v.string()
 * because component tables cannot reference app-level tables.
 *
 * Picks are the core entity: a sports betting pick posted by a creator.
 * Each pick has structured fields for the event, odds, and result tracking.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    pickTails: defineTable({
        tenantId: v.string(),
        userId: v.string(),         // subscriber who tailed the pick
        pickId: v.string(),         // reference to the pick being tailed
        tailedAt: v.number(),       // timestamp when the user tailed this pick
        startingBankroll: v.optional(v.number()), // user's bankroll at time of tail
    })
        .index("by_user", ["userId"])
        .index("by_pick", ["pickId"])
        .index("by_tenant_user", ["tenantId", "userId"])
        .index("by_user_pick", ["userId", "pickId"]),

    picks: defineTable({
        tenantId: v.string(),
        creatorId: v.string(),

        // Event / matchup info
        event: v.string(),         // e.g. "Lakers vs Celtics"
        sport: v.string(),         // e.g. "NBA", "NFL", "MLB", "Soccer", "NHL", "UFC", "Tennis", "Golf", "Other"
        league: v.optional(v.string()), // e.g. "Western Conference", "Premier League"

        // Pick details
        pickType: v.string(),      // e.g. "spread", "moneyline", "total", "prop", "parlay_leg"
        selection: v.string(),     // e.g. "Lakers -3.5", "Over 220.5", "LeBron 25+ pts"

        // Odds
        oddsAmerican: v.string(),  // e.g. "-110", "+150"
        oddsDecimal: v.number(),   // e.g. 1.91, 2.50

        // Sizing & confidence
        units: v.number(),         // e.g. 1.0, 2.5, 5.0
        confidence: v.string(),    // "low", "medium", "high"
        analysis: v.optional(v.string()), // Creator's write-up

        // Result tracking
        result: v.string(),        // "pending", "won", "lost", "push", "void"
        resultAt: v.optional(v.number()),
        gradedBy: v.optional(v.string()), // Who graded the result

        // Scheduling
        eventDate: v.optional(v.number()), // When the event starts
        status: v.string(),        // "draft", "published", "archived"

        // Metadata
        metadata: v.optional(v.any()),
    })
        .index("by_tenant", ["tenantId"])
        .index("by_creator", ["creatorId"])
        .index("by_tenant_status", ["tenantId", "status"])
        .index("by_tenant_sport", ["tenantId", "sport"])
        .index("by_tenant_result", ["tenantId", "result"])
        .index("by_creator_status", ["creatorId", "status"])
        .index("by_event_date", ["tenantId", "eventDate"])
        .index("by_tenant_creator", ["tenantId", "creatorId"]),
});
