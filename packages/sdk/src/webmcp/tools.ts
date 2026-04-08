/**
 * WebMCP Tool Factories
 *
 * Stateless factory functions that create ModelContextTool objects for each
 * exposed capability. Each tool wraps existing Convex queries/mutations
 * via the raw client (not React hooks) so they can be used as plain async
 * functions inside navigator.modelContext.registerTool().
 */

import { api } from '../convex-api';
import type { WebMCPContext, ModelContextTool, MCPContent } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function textResult(data: unknown): MCPContent {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(message: string): MCPContent {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
  };
}

// ─── Read-only tools ─────────────────────────────────────────────────────────

export function createSearchListingsTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'searchListings',
    description:
      'Search available venues and spaces for booking. Filter by category, amenities, capacity, and date. Returns a list of venues with name, description, price, rating, and availability.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free text search (matches venue name or description)',
        },
        category: {
          type: 'string',
          description: 'Category key (e.g. LOKALER, NAERING, IDRETT, KULTUR)',
        },
        amenities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Amenity slugs to filter by (e.g. scene, lydanlegg, parkering)',
        },
        minCapacity: {
          type: 'number',
          description: 'Minimum guest/person capacity',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 20)',
        },
      },
    },
    async execute(params) {
      try {
        const results = await ctx.convex.query(
          api.domain.resources.listPublic as unknown,
          {
            tenantId: ctx.tenantId,
            categoryKey: params.category as string | undefined,
            status: 'published',
            limit: (params.limit as number) ?? 20,
          },
        ) as Array<Record<string, unknown>>;

        let filtered = results ?? [];

        // Client-side text search
        if (params.query && typeof params.query === 'string') {
          const q = (params.query as string).toLowerCase();
          filtered = filtered.filter((r) => {
            const name = (r.name as string || '').toLowerCase();
            const desc = (r.description as string || '').toLowerCase();
            return name.includes(q) || desc.includes(q);
          });
        }

        // Client-side amenity filtering
        if (Array.isArray(params.amenities) && params.amenities.length > 0) {
          const wanted = new Set(params.amenities as string[]);
          filtered = filtered.filter((r) => {
            const amenities = r.amenities as Array<{ slug?: string }> | undefined;
            if (!amenities) return false;
            return [...wanted].every((slug) =>
              amenities.some((a) => a.slug === slug),
            );
          });
        }

        // Client-side capacity filtering
        if (typeof params.minCapacity === 'number') {
          filtered = filtered.filter(
            (r) => typeof r.capacity === 'number' && r.capacity >= (params.minCapacity as number),
          );
        }

        // Project to a concise shape for the agent
        const listings = filtered.map((r) => ({
          id: r._id ?? r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          category: r.categoryKey,
          capacity: r.capacity,
          price: r.price,
          priceUnit: r.priceUnit,
          city: r.city,
          averageRating: (r.reviewStats as { averageRating?: number } | undefined)?.averageRating,
          reviewCount: (r.reviewStats as { total?: number } | undefined)?.total,
          amenities: (r.amenities as Array<{ name?: string; slug?: string }> | undefined)
            ?.map((a) => a.name || a.slug),
        }));

        return textResult({ count: listings.length, listings });
      } catch (e) {
        return errorResult(`Search failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export function createGetListingDetailsTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'getListingDetails',
    description:
      'Get full details for a specific venue including amenities, pricing, availability info, and reviews. Use a venue ID from searchListings results, or look up by URL slug.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Venue ID (from searchListings results)',
        },
        slug: {
          type: 'string',
          description: 'Venue URL slug (alternative to ID)',
        },
      },
    },
    async execute(params) {
      try {
        let result: Record<string, unknown> | null = null;

        if (params.slug && typeof params.slug === 'string') {
          result = await ctx.convex.query(
            api.domain.resources.getBySlugPublic as unknown,
            { slug: params.slug, tenantId: ctx.tenantId },
          ) as Record<string, unknown> | null;
        } else if (params.id && typeof params.id === 'string') {
          result = await ctx.convex.query(
            api.domain.resources.get as unknown,
            { id: params.id },
          ) as Record<string, unknown> | null;
        } else {
          return errorResult('Provide either "id" or "slug"');
        }

        if (!result) {
          return errorResult('Venue not found');
        }

        // Project to a rich but readable shape
        const detail = {
          id: result._id ?? result.id,
          name: result.name,
          slug: result.slug,
          description: result.description,
          category: result.categoryKey,
          capacity: result.capacity,
          price: result.price,
          priceUnit: result.priceUnit,
          currency: result.currency,
          city: result.city,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          images: (result.images as Array<{ url?: string; alt?: string }> | undefined)
            ?.map((img) => ({ url: img.url, alt: img.alt })),
          amenities: (result.amenities as Array<{ name?: string; slug?: string; icon?: string }> | undefined)
            ?.map((a) => ({ name: a.name, slug: a.slug, icon: a.icon })),
          pricing: result.pricing,
          openingHours: result.openingHours,
          averageRating: (result.reviewStats as { averageRating?: number } | undefined)?.averageRating,
          reviewCount: (result.reviewStats as { total?: number } | undefined)?.total,
        };

        return textResult(detail);
      } catch (e) {
        return errorResult(`Lookup failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

// ─── Mutation tools (require user confirmation) ──────────────────────────────

export function createToggleFavoriteTool(ctx: WebMCPContext): ModelContextTool {
  return {
    name: 'toggleFavorite',
    description:
      'Add or remove a venue from your favorites. Requires the user to be logged in.',
    inputSchema: {
      type: 'object',
      properties: {
        resourceId: {
          type: 'string',
          description: 'Venue ID to add/remove from favorites',
        },
      },
      required: ['resourceId'],
    },
    async execute(params) {
      try {
        if (!ctx.userId) {
          return errorResult('You must be logged in to manage favorites.');
        }
        if (!params.resourceId) {
          return errorResult('resourceId is required');
        }

        await ctx.convex.mutation(
          api.domain.favorites.toggle as unknown,
          {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            resourceId: params.resourceId as string,
          },
        );

        return textResult({
          success: true,
          message: 'Favorite toggled successfully',
        });
      } catch (e) {
        return errorResult(`Toggle favorite failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}
