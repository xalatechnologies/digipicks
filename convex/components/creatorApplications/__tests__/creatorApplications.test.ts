import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import schema from '../schema';
import { modules } from '../testSetup.test-util';
import { api } from '../_generated/api';

const TENANT = 'tenant-ca-test';
const APPLICANT = 'user-applicant';
const ADMIN = 'user-admin';

const validDraft = {
  tenantId: TENANT,
  applicantUserId: APPLICANT,
  fullName: 'Jane Doe',
  country: 'US',
  handle: 'janedoe',
  displayName: 'Jane Doe',
  bio: 'I bet NFL props for a living and have a 5-year track record.',
  primarySports: ['NFL'],
  nicheTags: ['props'],
  externalLinks: [{ label: 'Twitter', url: 'https://x.com/janedoe' }],
  ageConfirmed: true,
  rulesAccepted: true,
};

describe('creatorApplications/upsertDraft', () => {
  it('creates a new draft', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    expect(id).toBeDefined();

    const app = await t.query(api.functions.getForApplicant, {
      tenantId: TENANT,
      applicantUserId: APPLICANT,
    });
    expect(app!.status).toBe('draft');
    expect(app!.handle).toBe('janedoe');
  });

  it('updates an existing draft instead of creating a new one', async () => {
    const t = convexTest(schema, modules);
    const { id: id1 } = await t.mutation(api.functions.upsertDraft, validDraft);
    const { id: id2 } = await t.mutation(api.functions.upsertDraft, {
      ...validDraft,
      bio: 'Updated bio with at least twenty characters.',
    });
    expect(id1).toBe(id2);

    const app = await t.query(api.functions.getForApplicant, {
      tenantId: TENANT,
      applicantUserId: APPLICANT,
    });
    expect(app!.bio).toMatch(/Updated bio/);
  });

  it('blocks creating a new draft when an active application exists', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    await t.mutation(api.functions.submit, { id: id as any });

    await expect(t.mutation(api.functions.upsertDraft, validDraft)).rejects.toThrow(/already has an application/);
  });
});

describe('creatorApplications/submit', () => {
  it('transitions draft → submitted with submittedAt timestamp', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    await t.mutation(api.functions.submit, { id: id as any });

    const app = await t.query(api.functions.get, { id: id as any });
    expect(app!.status).toBe('submitted');
    expect(app!.submittedAt).toBeGreaterThan(0);
  });

  it('rejects submit without age confirmation', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, {
      ...validDraft,
      ageConfirmed: false,
    });
    await expect(t.mutation(api.functions.submit, { id: id as any })).rejects.toThrow(/Age confirmation/);
  });

  it('rejects submit with bio shorter than 20 chars', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, {
      ...validDraft,
      bio: 'Too short',
    });
    await expect(t.mutation(api.functions.submit, { id: id as any })).rejects.toThrow(/Bio must be/);
  });

  it('rejects submit with no primary sports', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, {
      ...validDraft,
      primarySports: [],
    });
    await expect(t.mutation(api.functions.submit, { id: id as any })).rejects.toThrow(/primary sport/);
  });

  it('rejects submit when handle is already taken by another active application', async () => {
    const t = convexTest(schema, modules);
    const { id: idA } = await t.mutation(api.functions.upsertDraft, validDraft);
    await t.mutation(api.functions.submit, { id: idA as any });

    const { id: idB } = await t.mutation(api.functions.upsertDraft, {
      ...validDraft,
      applicantUserId: 'user-other',
    });
    await expect(t.mutation(api.functions.submit, { id: idB as any })).rejects.toThrow(/Handle is already taken/);
  });
});

describe('creatorApplications/updateStatus state machine', () => {
  async function seedSubmitted() {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    await t.mutation(api.functions.submit, { id: id as any });
    return { t, id };
  }

  it('submitted → in_review → approved', async () => {
    const { t, id } = await seedSubmitted();
    await t.mutation(api.functions.updateStatus, {
      id: id as any,
      status: 'in_review',
      reviewedBy: ADMIN,
    });
    await t.mutation(api.functions.updateStatus, {
      id: id as any,
      status: 'approved',
      reviewedBy: ADMIN,
    });
    const app = await t.query(api.functions.get, { id: id as any });
    expect(app!.status).toBe('approved');
    expect(app!.reviewedBy).toBe(ADMIN);
  });

  it('rejects illegal transitions (approved → rejected)', async () => {
    const { t, id } = await seedSubmitted();
    await t.mutation(api.functions.updateStatus, {
      id: id as any,
      status: 'approved',
      reviewedBy: ADMIN,
    });
    await expect(
      t.mutation(api.functions.updateStatus, {
        id: id as any,
        status: 'rejected',
        reviewedBy: ADMIN,
        reviewNote: 'Reason',
      }),
    ).rejects.toThrow(/Cannot transition/);
  });

  it('rejects rejection without a review note', async () => {
    const { t, id } = await seedSubmitted();
    await expect(
      t.mutation(api.functions.updateStatus, {
        id: id as any,
        status: 'rejected',
        reviewedBy: ADMIN,
      }),
    ).rejects.toThrow(/review note is required/);
  });

  it('needs_more_info → submitted resubmission allowed', async () => {
    const { t, id } = await seedSubmitted();
    await t.mutation(api.functions.updateStatus, {
      id: id as any,
      status: 'needs_more_info',
      reviewedBy: ADMIN,
      reviewNote: 'Please add a sample pick history',
    });
    await t.mutation(api.functions.submit, { id: id as any });
    const app = await t.query(api.functions.get, { id: id as any });
    expect(app!.status).toBe('submitted');
  });
});

describe('creatorApplications/queries', () => {
  it('countsByStatus reflects applications across statuses', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    const before = await t.query(api.functions.countsByStatus, { tenantId: TENANT });
    expect(before.draft).toBe(1);
    expect(before.submitted).toBe(0);

    await t.mutation(api.functions.submit, { id: id as any });
    const after = await t.query(api.functions.countsByStatus, { tenantId: TENANT });
    expect(after.draft).toBe(0);
    expect(after.submitted).toBe(1);
    expect(after.total).toBe(1);
  });

  it('listByStatus filters correctly', async () => {
    const t = convexTest(schema, modules);
    const { id } = await t.mutation(api.functions.upsertDraft, validDraft);
    await t.mutation(api.functions.submit, { id: id as any });

    const submitted = await t.query(api.functions.listByStatus, {
      tenantId: TENANT,
      status: 'submitted',
    });
    expect(submitted).toHaveLength(1);

    const drafts = await t.query(api.functions.listByStatus, {
      tenantId: TENANT,
      status: 'draft',
    });
    expect(drafts).toHaveLength(0);
  });
});
