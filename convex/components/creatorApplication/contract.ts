/**
 * Creator Application Component Contract
 */

import { v } from 'convex/values';
import { defineContract } from '../../lib/componentContract';

export const CONTRACT = defineContract({
  name: 'creatorApplication',
  version: '1.0.0',
  category: 'domain',
  description: 'Creator application and manual verification workflow',

  queries: {
    list: {
      args: {
        tenantId: v.string(),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
      },
      returns: v.array(v.any()),
    },
    get: {
      args: { id: v.string() },
      returns: v.any(),
    },
    getByUser: {
      args: {
        tenantId: v.string(),
        userId: v.string(),
      },
      returns: v.any(),
    },
  },

  mutations: {
    submit: {
      args: {
        tenantId: v.string(),
        userId: v.string(),
        displayName: v.string(),
        bio: v.string(),
        niche: v.string(),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: v.optional(v.any()),
        metadata: v.optional(v.any()),
      },
      returns: v.object({ id: v.string() }),
    },
    approve: {
      args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.optional(v.string()),
      },
      returns: v.object({ success: v.boolean() }),
    },
    reject: {
      args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.optional(v.string()),
      },
      returns: v.object({ success: v.boolean() }),
    },
    requestMoreInfo: {
      args: {
        id: v.string(),
        reviewedBy: v.string(),
        reviewNote: v.string(),
      },
      returns: v.object({ success: v.boolean() }),
    },
    resubmit: {
      args: {
        id: v.string(),
        userId: v.string(),
        displayName: v.optional(v.string()),
        bio: v.optional(v.string()),
        niche: v.optional(v.string()),
        specialties: v.optional(v.array(v.string())),
        performanceProof: v.optional(v.string()),
        trackRecordUrl: v.optional(v.string()),
        socialLinks: v.optional(v.any()),
        metadata: v.optional(v.any()),
      },
      returns: v.object({ success: v.boolean() }),
    },
  },

  emits: [
    'creator-application.application.submitted',
    'creator-application.application.approved',
    'creator-application.application.rejected',
    'creator-application.application.more-info-requested',
    'creator-application.application.resubmitted',
  ],

  subscribes: [],

  dependencies: {
    core: ['tenants', 'users'],
    components: [],
  },
});
