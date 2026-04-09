/**
 * Creator Applications Component Schema
 *
 * Stores creator applications and their review state machine.
 * External references use v.string() for component isolation.
 *
 * Status state machine:
 *   draft → submitted → in_review → approved | rejected | needs_more_info
 *   needs_more_info → submitted (resubmission)
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  creatorApplications: defineTable({
    tenantId: v.string(),
    // Applicant — the user submitting. One submitted/in_review/approved
    // application per (tenant, applicantUserId) is enforced in functions.
    applicantUserId: v.string(),

    status: v.string(), // draft | submitted | in_review | approved | rejected | needs_more_info

    // --- Identity ---
    fullName: v.string(),
    country: v.string(),
    dateOfBirth: v.optional(v.string()), // ISO date

    // --- Profile ---
    handle: v.string(), // unique-ish per tenant; checked at submit
    displayName: v.string(),
    bio: v.string(),
    avatarStorageId: v.optional(v.string()),
    primarySports: v.array(v.string()), // e.g. ["NFL", "NBA"]
    nicheTags: v.array(v.string()),

    // --- Proof ---
    externalLinks: v.array(
      v.object({
        label: v.string(),
        url: v.string(),
      }),
    ),
    idDocumentStorageId: v.optional(v.string()),
    sampleNotes: v.optional(v.string()), // free-text or 3-pick narrative

    // --- Self-attestation ---
    ageConfirmed: v.boolean(), // 18+
    rulesAccepted: v.boolean(),

    // --- Review state ---
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()), // admin userId
    reviewNote: v.optional(v.string()), // rejection reason or info request
  })
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_status', ['tenantId', 'status'])
    .index('by_applicant', ['applicantUserId'])
    .index('by_tenant_handle', ['tenantId', 'handle']),
});
