import { action, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { internal, components } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { wrapInEmailLayout } from '../email/baseLayout';

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const BACKOFFICE_OWNER_PERMISSIONS = [
  'resource:view',
  'resource:write',
  'resource:publish',
  'resource:delete',
  'messaging:admin',
  'review:moderate',
  'user:manage',
  'user:deactivate',
  'tenant:configure',
  'org:manage',
  'audit:view',
];

// =============================================================================
// Request Magic Link
// =============================================================================

/**
 * Request a magic link to be sent to the user's email.
 * Creates a token and triggers email sending.
 */
export const requestMagicLink = action({
  args: {
    email: v.string(),
    appOrigin: v.string(),
    returnPath: v.optional(v.string()),
    appId: v.string(),
  },
  handler: async (ctx, { email, appOrigin, returnPath, appId }) => {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Generate secure token
    const token = generateSecureToken();
    const now = Date.now();

    // Store the magic link token
    await ctx.runMutation(internal.auth.magicLink.storeMagicLink, {
      email: normalizedEmail,
      token,
      appOrigin,
      returnPath: returnPath || '/',
      appId,
      createdAt: now,
      expiresAt: now + MAGIC_LINK_EXPIRY_MS,
    });

    // Build magic link URL
    const magicLinkUrl = `${appOrigin}/auth/magic-link?token=${token}`;

    // Send email
    await sendMagicLinkEmail(normalizedEmail, magicLinkUrl);

    return {
      success: true,
      message: 'Magic link sent to your email',
    };
  },
});

/**
 * Internal mutation to store magic link token.
 */
export const storeMagicLink = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
    appOrigin: v.string(),
    returnPath: v.string(),
    appId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Create new magic link via auth component
    await ctx.runMutation(components.auth.mutations.createMagicLink, {
      email: args.email,
      token: args.token,
      appOrigin: args.appOrigin,
      returnPath: args.returnPath,
      appId: args.appId,
      expiresAt: args.expiresAt,
    });
  },
});

// =============================================================================
// Verify Magic Link
// =============================================================================

/**
 * Verify a magic link token and create a session.
 */
export const verifyMagicLink = action({
  args: {
    token: v.string(),
  },
  handler: async (
    ctx,
    { token },
  ): Promise<{
    success: boolean;
    error?: string;
    sessionToken?: string;
    user?: { id: string; email: string; name?: string; role: string; tenantId?: string };
    isNewUser?: boolean;
    returnPath?: string;
    appOrigin?: string;
  }> => {
    // Get and validate the magic link via auth component
    const magicLink = await ctx.runMutation(internal.auth.magicLink.consumeMagicLink, { token });

    if (!magicLink) {
      return {
        success: false,
        error: 'Invalid or expired magic link',
      };
    }

    // Find or create user
    const result = await ctx.runMutation(internal.auth.magicLink.findOrCreateUser, {
      email: magicLink.email,
      appId: magicLink.appId,
    });

    // Create session
    const sessionToken: string = await ctx.runMutation(internal.auth.sessions.createSession, {
      userId: result.userId,
      provider: 'magic-link',
      appId: magicLink.appId,
    });

    return {
      success: true,
      sessionToken,
      user: result.user,
      isNewUser: result.isNewUser,
      returnPath: magicLink.returnPath,
      appOrigin: magicLink.appOrigin,
    };
  },
});

/**
 * Internal mutation to consume (use) a magic link token.
 * Delegates to auth component's consumeMagicLink mutation.
 */
export const consumeMagicLink = internalMutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    // Consume the magic link via auth component
    const magicLink = await ctx.runMutation(components.auth.mutations.consumeMagicLink, { token });

    if (!magicLink) {
      return null;
    }

    return {
      email: magicLink.email,
      appOrigin: magicLink.appOrigin,
      returnPath: magicLink.returnPath,
      appId: magicLink.appId,
    };
  },
});

/**
 * Internal mutation to find or create a user by email.
 */
export const findOrCreateUser = internalMutation({
  args: {
    email: v.string(),
    appId: v.string(),
  },
  handler: async (
    ctx,
    { email, appId },
  ): Promise<{
    userId: Id<'users'>;
    user: { id: string; email: string; name?: string; role: string; tenantId?: string };
    isNewUser: boolean;
  }> => {
    const shouldProvisionBackoffice = appId === 'backoffice';

    // Try to find existing user
    let user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();

    let isNewUser = false;

    if (!user) {
      // Create new user
      isNewUser = true;
      const initialRole = appId === 'backoffice' ? 'creator' : 'subscriber';
      const userId = await ctx.db.insert('users', {
        email,
        role: initialRole,
        status: 'active',
        metadata: { provider: 'magic-link' },
        lastLoginAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    } else {
      // Ensure backoffice users have creator access; otherwise only update login timestamp.
      const patch: Partial<{
        role: string;
        lastLoginAt: number;
      }> = { lastLoginAt: Date.now() };
      if (appId === 'backoffice' && user.role !== 'creator' && user.role !== 'admin') {
        patch.role = 'creator';
      }
      await ctx.db.patch(user._id, patch);
      user = await ctx.db.get(user._id);
    }

    if (shouldProvisionBackoffice && user) {
      const tenantId = await ensureDedicatedOwnerTenant(ctx, user._id as string, user.email, user.name);
      if (String(user.tenantId ?? '') !== tenantId) {
        await ctx.db.patch(user._id, {
          tenantId: tenantId as any,
        });
        user = await ctx.db.get(user._id);
      }

      const existingMembership = await ctx.db
        .query('tenantUsers')
        .withIndex('by_tenant_user', (q) => q.eq('tenantId', tenantId as any).eq('userId', user!._id))
        .first();

      if (!existingMembership) {
        await ctx.db.insert('tenantUsers', {
          tenantId: tenantId as any,
          userId: user!._id,
          status: 'active',
          joinedAt: Date.now(),
        });
      } else if (existingMembership.status !== 'active') {
        await ctx.db.patch(existingMembership._id, {
          status: 'active',
          joinedAt: existingMembership.joinedAt ?? Date.now(),
        });
      }

      const userId = user!._id as string;
      const existingRoles = await ctx.runQuery(components.rbac.queries.listRoles, {
        tenantId,
        limit: 200,
      });
      let ownerRole = existingRoles.find((r: any) => r.name === 'Owner');

      if (!ownerRole) {
        const created = await ctx.runMutation(components.rbac.mutations.createRole, {
          tenantId,
          name: 'Owner',
          permissions: BACKOFFICE_OWNER_PERMISSIONS,
          isSystem: true,
        });
        ownerRole = { _id: created.id };
      }

      const userRoles = await ctx.runQuery(components.rbac.queries.listUserRoles, {
        userId,
        tenantId,
        limit: 200,
      });
      const hasOwnerRole = userRoles.some((assignment: any) => {
        const roleId = assignment.role?._id ?? assignment.roleId;
        return roleId === ownerRole._id;
      });

      if (!hasOwnerRole) {
        await ctx.runMutation(components.rbac.mutations.assignRole, {
          userId,
          roleId: ownerRole._id,
          tenantId,
        });
      }
    }

    return {
      userId: user!._id,
      user: {
        id: String(user!._id),
        email: user!.email,
        name: user!.name,
        role: user!.role,
        tenantId: user!.tenantId ? String(user!.tenantId) : undefined,
      },
      isNewUser,
    };
  },
});

// =============================================================================
// Helpers
// =============================================================================

function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeTenantSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

async function ensureUniqueTenantSlug(ctx: any, preferred: string): Promise<string> {
  let slug = preferred || `tenant-${Date.now()}`;
  let suffix = 1;
  while (true) {
    const existing = await ctx.db
      .query('tenants')
      .withIndex('by_slug', (q: any) => q.eq('slug', slug))
      .first();
    if (!existing) return slug;
    slug = `${preferred}-${suffix}`;
    suffix += 1;
  }
}

async function ensureDedicatedOwnerTenant(ctx: any, userId: string, email: string, name?: string): Promise<string> {
  const currentUser = await ctx.db.get(userId as any);
  if (!currentUser) throw new Error('User not found');

  if (currentUser.tenantId) {
    const existingTenant = await ctx.db.get(currentUser.tenantId);
    if (existingTenant && String(existingTenant.ownerId ?? '') === userId) {
      return String(existingTenant._id);
    }
  }

  const baseSlug = normalizeTenantSlug(email.split('@')[0] || `tenant-${userId.slice(-6)}`);
  const slug = await ensureUniqueTenantSlug(ctx, baseSlug);
  const tenantName = name?.trim() ? `${name} - Backoffice` : `${email} - Backoffice`;

  const tenantId = await ctx.db.insert('tenants', {
    name: tenantName,
    slug,
    status: 'active',
    settings: {},
    seatLimits: { admin: 3, user: 50 },
    featureFlags: {},
    enabledCategories: ['ALLE', 'LOKALER', 'ARRANGEMENTER', 'SPORT', 'TORG'],
    ownerId: userId as any,
    contactEmail: email,
    onboardingStep: 'tenant_created',
    plan: 'starter',
  } as any);

  return String(tenantId);
}

/**
 * Send magic link email using Resend with professional branded template.
 * Uses the shared baseLayout for consistent branding with all other emails.
 * Falls back to console.log in development if RESEND_API_KEY is not set.
 */
async function sendMagicLinkEmail(email: string, magicLinkUrl: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    // Development fallback - log to console
    console.log('=== MAGIC LINK EMAIL (dev mode) ===');
    console.log('To:', email);
    console.log('Link:', magicLinkUrl);
    console.log('===================================');
    return;
  }

  const fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
  const fromName = process.env.EMAIL_FROM_NAME || 'Xala';

  // Build the inner email body content (matching other template styles)
  const bodyContent = `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1C362D;">Logg inn med lenke</h2>
<p style="margin:0 0 24px;color:#666;">Klikk p&aring; knappen under for &aring; logge inn p&aring; din konto.</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">
    <tr>
        <td style="border-radius:8px;background-color:#1C362D;">
            <a href="${magicLinkUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                Logg inn
            </a>
        </td>
    </tr>
</table>

<p style="margin:0 0 24px;font-size:13px;color:#999;">
    Eller kopier denne lenken til nettleseren din:<br/>
    <a href="${magicLinkUrl}" style="color:#1C362D;word-break:break-all;font-size:12px;">${magicLinkUrl}</a>
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 24px;">
    <tr>
        <td style="background-color:#FFFBEB;border-left:4px solid #F59E0B;border-radius:6px;padding:14px 18px;font-size:14px;line-height:1.5;color:#92400E;">
            Denne lenken utl&oslash;per om <strong>15 minutter</strong>. Av sikkerhetsgrunner kan den bare brukes &eacute;n gang.
        </td>
    </tr>
</table>

<p style="margin:0;font-size:13px;color:#999;">Hvis du ikke ba om denne e-posten, kan du trygt ignorere den. Kontoen din er sikker.</p>`;

  // Wrap in the branded HTML email layout
  const html = wrapInEmailLayout({
    body: bodyContent.trim(),
    subject: `Logg inn på ${fromName}`,
    preheader: 'Klikk for å logge inn — lenken utløper om 15 minutter',
  });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: `Logg inn på ${fromName}`,
      html,
      text: `Logg inn på ${fromName}\n\nKlikk på lenken under for å logge inn:\n${magicLinkUrl}\n\nDenne lenken utløper om 15 minutter og kan bare brukes én gang.\n\nHvis du ikke ba om denne e-posten, kan du trygt ignorere den.`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send magic link email:', error);
    throw new Error('Failed to send magic link email');
  }
}
