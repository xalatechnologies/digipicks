/**
 * Creator Applications Component Contract
 */

import { v } from 'convex/values';
import { defineContract } from '../../lib/componentContract';

export const CONTRACT = defineContract({
  name: 'creatorApplications',
  version: '1.0.0',
  category: 'domain',
  description: 'Creator application submission and review workflow',

  queries: {
    get: {
      args: { id: v.string() },
      returns: v.any(),
    },
    getForApplicant: {
      args: { tenantId: v.string(), applicantUserId: v.string() },
      returns: v.any(),
    },
    list: {
      args: { tenantId: v.string() },
      returns: v.array(v.any()),
    },
    listByStatus: {
      args: { tenantId: v.string(), status: v.string() },
      returns: v.array(v.any()),
    },
    countsByStatus: {
      args: { tenantId: v.string() },
      returns: v.any(),
    },
  },

  mutations: {
    submit: {
      args: { tenantId: v.string(), applicantUserId: v.string() },
      returns: v.object({ id: v.string() }),
    },
    updateStatus: {
      args: {
        id: v.string(),
        status: v.string(),
        reviewedBy: v.string(),
      },
      returns: v.object({ success: v.boolean() }),
    },
  },

  emits: [
    'creator-applications.application.submitted',
    'creator-applications.application.approved',
    'creator-applications.application.rejected',
    'creator-applications.application.info-requested',
  ],

  subscribes: [],

  dependencies: {
    core: ['tenants', 'users'],
    components: ['audit', 'rbac'],
  },
});
