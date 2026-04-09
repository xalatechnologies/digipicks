/**
 * Broadcasts Component — Convex Tests
 *
 * Covers all functions in components/broadcasts/functions.ts:
 *   - send (validation, receipt fan-out, message types)
 *   - listByCreator (filters, sorting)
 *   - listForSubscriber (receipt-based, unread filter)
 *   - get (success, not-found)
 *   - unreadCount (accurate count)
 *   - markAsRead (success, idempotent)
 *   - remove (cascade receipt deletion)
 *
 * Run: cd convex && npx vitest --config vitest.config.ts --run components/broadcasts/__tests__/broadcasts.test.ts
 */

import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import schema from '../schema';
import { modules } from '../testSetup.test-util';
import { api } from '../_generated/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT = 'tenant-bcast-001';
const CREATOR = 'creator-a';
const SUB_A = 'subscriber-a';
const SUB_B = 'subscriber-b';

async function sendBroadcast(
  t: ReturnType<typeof convexTest>,
  overrides: Partial<{
    tenantId: string;
    creatorId: string;
    title: string;
    body: string;
    messageType: string;
    recipientIds: string[];
    pickId: string;
  }> = {},
) {
  return t.mutation(api.functions.send, {
    tenantId: overrides.tenantId ?? TENANT,
    creatorId: overrides.creatorId ?? CREATOR,
    title: overrides.title ?? 'Hot NBA Pick Tonight',
    body: overrides.body ?? 'Check my latest play for the Lakers game.',
    messageType: overrides.messageType ?? 'text_update',
    recipientIds: overrides.recipientIds ?? [SUB_A, SUB_B],
    pickId: overrides.pickId,
  });
}

// ---------------------------------------------------------------------------
// send
// ---------------------------------------------------------------------------

describe('broadcasts/mutations — send', () => {
  it('creates a broadcast and returns id + recipientCount', async () => {
    const t = convexTest(schema, modules);
    const result = await sendBroadcast(t);

    expect(result.id).toBeDefined();
    expect(result.recipientCount).toBe(2);
  });

  it('creates receipts for each recipient', async () => {
    const t = convexTest(schema, modules);
    const result = await sendBroadcast(t);

    const receipts = await t.run(async (ctx) =>
      ctx.db
        .query('broadcastReceipts')
        .withIndex('by_broadcast', (q) => q.eq('broadcastId', result.id))
        .collect(),
    );

    expect(receipts).toHaveLength(2);
    const userIds = receipts.map((r) => r.userId).sort();
    expect(userIds).toEqual([SUB_A, SUB_B].sort());
  });

  it('sets status to sent with sentAt timestamp', async () => {
    const t = convexTest(schema, modules);
    const result = await sendBroadcast(t);

    const broadcast = await t.query(api.functions.get, { id: result.id as any });
    expect(broadcast.status).toBe('sent');
    expect(broadcast.sentAt).toBeGreaterThan(0);
  });

  it('rejects invalid message type', async () => {
    const t = convexTest(schema, modules);

    await expect(sendBroadcast(t, { messageType: 'invalid_type' })).rejects.toThrow(/Invalid message type/);
  });

  it('rejects empty title', async () => {
    const t = convexTest(schema, modules);

    await expect(sendBroadcast(t, { title: '   ' })).rejects.toThrow(/title cannot be empty/);
  });

  it('rejects empty body', async () => {
    const t = convexTest(schema, modules);

    await expect(sendBroadcast(t, { body: '' })).rejects.toThrow(/body cannot be empty/);
  });

  it('handles zero recipients', async () => {
    const t = convexTest(schema, modules);
    const result = await sendBroadcast(t, { recipientIds: [] });

    expect(result.recipientCount).toBe(0);
  });

  it('accepts all valid message types', async () => {
    const t = convexTest(schema, modules);

    for (const type of ['text_update', 'pick_alert', 'announcement']) {
      const result = await sendBroadcast(t, { messageType: type, title: `Test ${type}` });
      expect(result.id).toBeDefined();
    }
  });

  it('stores optional pickId', async () => {
    const t = convexTest(schema, modules);
    const result = await sendBroadcast(t, { pickId: 'pick-123' });

    const broadcast = await t.query(api.functions.get, { id: result.id as any });
    expect(broadcast.pickId).toBe('pick-123');
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe('broadcasts/queries — get', () => {
  it('returns a broadcast by ID', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t);

    const broadcast = await t.query(api.functions.get, { id: id as any });
    expect(broadcast.title).toBe('Hot NBA Pick Tonight');
    expect(broadcast.creatorId).toBe(CREATOR);
  });

  it('throws for non-existent ID', async () => {
    const t = convexTest(schema, modules);
    // Convex will throw on invalid ID
    await expect(t.query(api.functions.get, { id: 'nonexistent' as any })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// listByCreator
// ---------------------------------------------------------------------------

describe('broadcasts/queries — listByCreator', () => {
  it('lists broadcasts for a creator sorted newest first', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t, { title: 'First' });
    await sendBroadcast(t, { title: 'Second' });

    const list = await t.query(api.functions.listByCreator, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(list).toHaveLength(2);
    expect(list[0].title).toBe('Second');
    expect(list[1].title).toBe('First');
  });

  it('respects limit', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t, { title: 'A' });
    await sendBroadcast(t, { title: 'B' });
    await sendBroadcast(t, { title: 'C' });

    const list = await t.query(api.functions.listByCreator, {
      tenantId: TENANT,
      creatorId: CREATOR,
      limit: 2,
    });

    expect(list).toHaveLength(2);
  });

  it('filters by status', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t); // status = "sent"

    const sent = await t.query(api.functions.listByCreator, {
      tenantId: TENANT,
      creatorId: CREATOR,
      status: 'sent',
    });
    expect(sent).toHaveLength(1);

    const drafts = await t.query(api.functions.listByCreator, {
      tenantId: TENANT,
      creatorId: CREATOR,
      status: 'draft',
    });
    expect(drafts).toHaveLength(0);
  });

  it('isolates by creator', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t, { creatorId: CREATOR });
    await sendBroadcast(t, { creatorId: 'other-creator' });

    const list = await t.query(api.functions.listByCreator, {
      tenantId: TENANT,
      creatorId: CREATOR,
    });

    expect(list).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// listForSubscriber
// ---------------------------------------------------------------------------

describe('broadcasts/queries — listForSubscriber', () => {
  it('lists broadcasts for a subscriber via receipts', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t, { recipientIds: [SUB_A] });
    await sendBroadcast(t, { recipientIds: [SUB_B] });

    const listA = await t.query(api.functions.listForSubscriber, {
      tenantId: TENANT,
      userId: SUB_A,
    });
    expect(listA).toHaveLength(1);

    const listB = await t.query(api.functions.listForSubscriber, {
      tenantId: TENANT,
      userId: SUB_B,
    });
    expect(listB).toHaveLength(1);
  });

  it('filters to unread only', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

    // Mark as read
    await t.mutation(api.functions.markAsRead, {
      userId: SUB_A,
      broadcastId: id,
    });

    const unread = await t.query(api.functions.listForSubscriber, {
      tenantId: TENANT,
      userId: SUB_A,
      unreadOnly: true,
    });
    expect(unread).toHaveLength(0);

    const all = await t.query(api.functions.listForSubscriber, {
      tenantId: TENANT,
      userId: SUB_A,
    });
    expect(all).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// unreadCount
// ---------------------------------------------------------------------------

describe('broadcasts/queries — unreadCount', () => {
  it('counts unread broadcasts', async () => {
    const t = convexTest(schema, modules);
    await sendBroadcast(t, { recipientIds: [SUB_A], title: 'B1' });
    await sendBroadcast(t, { recipientIds: [SUB_A], title: 'B2' });

    const { count } = await t.query(api.functions.unreadCount, {
      tenantId: TENANT,
      userId: SUB_A,
    });
    expect(count).toBe(2);
  });

  it('decrements after marking read', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

    await t.mutation(api.functions.markAsRead, {
      userId: SUB_A,
      broadcastId: id,
    });

    const { count } = await t.query(api.functions.unreadCount, {
      tenantId: TENANT,
      userId: SUB_A,
    });
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

describe('broadcasts/mutations — markAsRead', () => {
  it('marks a broadcast receipt as read', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

    const result = await t.mutation(api.functions.markAsRead, {
      userId: SUB_A,
      broadcastId: id,
    });
    expect(result.success).toBe(true);
  });

  it('is idempotent — second call still succeeds', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t, { recipientIds: [SUB_A] });

    await t.mutation(api.functions.markAsRead, {
      userId: SUB_A,
      broadcastId: id,
    });

    const result = await t.mutation(api.functions.markAsRead, {
      userId: SUB_A,
      broadcastId: id,
    });
    expect(result.success).toBe(true);
  });

  it('throws when receipt not found', async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(api.functions.markAsRead, {
        userId: 'nonexistent-user',
        broadcastId: 'nonexistent-broadcast',
      }),
    ).rejects.toThrow(/receipt not found/);
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('broadcasts/mutations — remove', () => {
  it('deletes broadcast and all receipts', async () => {
    const t = convexTest(schema, modules);
    const { id } = await sendBroadcast(t, { recipientIds: [SUB_A, SUB_B] });

    const result = await t.mutation(api.functions.remove, { id: id as any });
    expect(result.success).toBe(true);

    // Verify broadcast is deleted
    await expect(t.query(api.functions.get, { id: id as any })).rejects.toThrow();

    // Verify receipts are deleted
    const receipts = await t.run(async (ctx) =>
      ctx.db
        .query('broadcastReceipts')
        .withIndex('by_broadcast', (q) => q.eq('broadcastId', id))
        .collect(),
    );
    expect(receipts).toHaveLength(0);
  });

  it('throws for non-existent broadcast', async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.functions.remove, { id: 'nonexistent' as any })).rejects.toThrow();
  });
});
