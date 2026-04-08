import { describe, it, expect } from 'vitest';
import {
  SKIP_LINKS,
  BACKOFFICE_NAV_SECTIONS,
  BACKOFFICE_BOTTOM_NAV,
  DASHBOARD_NAV_SECTIONS,
  DASHBOARD_BOTTOM_NAV,
  MONITORING_NAV_SECTIONS,
  SAAS_ADMIN_NAV_SECTIONS,
  SAAS_ADMIN_BOTTOM_NAV,
  DASHBOARD_NAV_CONFIG,
  getNavSections,
  getBottomNav,
} from '../navigation';
import type { NavItem, NavSection, BottomNavItem, DashboardNavItemConfig } from '../navigation';

// ---------------------------------------------------------------------------
// Helper: collect all item IDs from NavSection[]
// ---------------------------------------------------------------------------
function collectItemIds(sections: NavSection[]): string[] {
  return sections.flatMap(s => s.items.map(i => i.id));
}

// ---------------------------------------------------------------------------
// Skip Links
// ---------------------------------------------------------------------------
describe('SKIP_LINKS', () => {
  it('has at least main-content and main-navigation', () => {
    const ids = SKIP_LINKS.map(l => l.targetId);
    expect(ids).toContain('main-content');
    expect(ids).toContain('main-navigation');
  });

  it('each skip link has required fields', () => {
    for (const link of SKIP_LINKS) {
      expect(typeof link.targetId).toBe('string');
      expect(typeof link.label).toBe('string');
      expect(typeof link.labelKey).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// NavItem shape validation helper
// ---------------------------------------------------------------------------
function expectValidNavItem(item: NavItem) {
  expect(typeof item.id).toBe('string');
  expect(item.id.length).toBeGreaterThan(0);
  expect(typeof item.nameKey).toBe('string');
  expect(item.nameKey.length).toBeGreaterThan(0);
  expect(typeof item.href).toBe('string');
  expect(item.href.startsWith('/')).toBe(true);
  expect(typeof item.icon).toBe('string');
  expect(item.icon.length).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Backoffice navigation
// ---------------------------------------------------------------------------
describe('BACKOFFICE_NAV_SECTIONS', () => {
  it('has sections with items', () => {
    expect(BACKOFFICE_NAV_SECTIONS.length).toBeGreaterThan(0);
    for (const section of BACKOFFICE_NAV_SECTIONS) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('every nav item has required fields', () => {
    for (const section of BACKOFFICE_NAV_SECTIONS) {
      for (const item of section.items) {
        expectValidNavItem(item);
      }
    }
  });

  it('BACKOFFICE_BOTTOM_NAV IDs reference existing section item IDs', () => {
    const sectionIds = collectItemIds(BACKOFFICE_NAV_SECTIONS);
    for (const bottomItem of BACKOFFICE_BOTTOM_NAV) {
      expect(sectionIds).toContain(bottomItem.id);
    }
  });
});

// ---------------------------------------------------------------------------
// Dashboard navigation
// ---------------------------------------------------------------------------
describe('DASHBOARD_NAV_SECTIONS', () => {
  it('has sections with items', () => {
    expect(DASHBOARD_NAV_SECTIONS.length).toBeGreaterThan(0);
  });

  it('every nav item has required fields', () => {
    for (const section of DASHBOARD_NAV_SECTIONS) {
      for (const item of section.items) {
        expectValidNavItem(item);
      }
    }
  });

  it('DASHBOARD_BOTTOM_NAV IDs reference existing section item IDs', () => {
    const sectionIds = collectItemIds(DASHBOARD_NAV_SECTIONS);
    for (const bottomItem of DASHBOARD_BOTTOM_NAV) {
      expect(sectionIds).toContain(bottomItem.id);
    }
  });
});

// ---------------------------------------------------------------------------
// DASHBOARD_NAV_CONFIG (unified config by variant)
// ---------------------------------------------------------------------------
describe('DASHBOARD_NAV_CONFIG', () => {
  it('has minside, backoffice, and platform variants', () => {
    expect(DASHBOARD_NAV_CONFIG).toHaveProperty('minside');
    expect(DASHBOARD_NAV_CONFIG).toHaveProperty('backoffice');
    expect(DASHBOARD_NAV_CONFIG).toHaveProperty('platform');
  });

  for (const variant of ['minside', 'backoffice', 'platform'] as const) {
    describe(`variant: ${variant}`, () => {
      it('has sections with items', () => {
        const config = DASHBOARD_NAV_CONFIG[variant];
        expect(config.sections.length).toBeGreaterThan(0);
        for (const section of config.sections) {
          expect(section.items.length).toBeGreaterThan(0);
        }
      });

      it('every item has id, nameKey, href, icon', () => {
        const config = DASHBOARD_NAV_CONFIG[variant];
        for (const section of config.sections) {
          for (const item of section.items) {
            expect(typeof item.id).toBe('string');
            expect(item.id.length).toBeGreaterThan(0);
            expect(typeof item.nameKey).toBe('string');
            expect(item.nameKey.length).toBeGreaterThan(0);
            expect(typeof item.href).toBe('string');
            expect(typeof item.icon).toBe('string');
          }
        }
      });

      it('bottomNavIds is a non-empty array of strings', () => {
        const config = DASHBOARD_NAV_CONFIG[variant];
        expect(config.bottomNavIds.length).toBeGreaterThan(0);
        for (const id of config.bottomNavIds) {
          expect(typeof id).toBe('string');
        }
      });
    });
  }

  it('backoffice roles only include superadmin, admin, user', () => {
    const validRoles = new Set(['superadmin', 'admin', 'user']);
    const config = DASHBOARD_NAV_CONFIG.backoffice;
    for (const section of config.sections) {
      for (const item of section.items) {
        if (item.roles) {
          for (const role of item.roles) {
            expect(validRoles.has(role)).toBe(true);
          }
        }
      }
    }
  });

  it('backoffice does not use invalid roles like case_handler or arranger', () => {
    const invalidRoles = ['case_handler', 'arranger', 'saksbehandler', 'moderator'];
    const config = DASHBOARD_NAV_CONFIG.backoffice;
    for (const section of config.sections) {
      for (const item of section.items) {
        if (item.roles) {
          for (const role of item.roles) {
            expect(invalidRoles).not.toContain(role);
          }
        }
      }
    }
  });

  it('platform variant items all require superadmin role', () => {
    const config = DASHBOARD_NAV_CONFIG.platform;
    for (const section of config.sections) {
      for (const item of section.items) {
        expect(item.roles).toBeDefined();
        expect(item.roles).toContain('superadmin');
      }
    }
  });

  it('minside items have contexts (personal and/or organization)', () => {
    const validContexts = new Set(['personal', 'organization']);
    const config = DASHBOARD_NAV_CONFIG.minside;
    for (const section of config.sections) {
      for (const item of section.items) {
        if (item.contexts) {
          for (const ctx of item.contexts) {
            expect(validContexts.has(ctx)).toBe(true);
          }
        }
      }
    }
  });

  it('no duplicate IDs within a variant', () => {
    for (const variant of ['minside', 'backoffice', 'platform'] as const) {
      const config = DASHBOARD_NAV_CONFIG[variant];
      const ids = config.sections.flatMap(s => s.items.map(i => i.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

// ---------------------------------------------------------------------------
// getNavSections / getBottomNav helpers
// ---------------------------------------------------------------------------
describe('getNavSections', () => {
  it('returns backoffice sections for backoffice appId', () => {
    expect(getNavSections('backoffice')).toBe(BACKOFFICE_NAV_SECTIONS);
  });

  it('returns dashboard sections for dashboard appId', () => {
    expect(getNavSections('dashboard')).toBe(DASHBOARD_NAV_SECTIONS);
  });

  it('returns monitoring sections for monitoring appId', () => {
    expect(getNavSections('monitoring')).toBe(MONITORING_NAV_SECTIONS);
  });

  it('returns saas-admin sections for saas-admin appId', () => {
    expect(getNavSections('saas-admin')).toBe(SAAS_ADMIN_NAV_SECTIONS);
  });

  it('returns empty array for apps without sidebar nav', () => {
    expect(getNavSections('web')).toEqual([]);
    expect(getNavSections('minside')).toEqual([]);
    expect(getNavSections('docs')).toEqual([]);
  });
});

describe('getBottomNav', () => {
  it('returns backoffice bottom nav for backoffice appId', () => {
    expect(getBottomNav('backoffice')).toBe(BACKOFFICE_BOTTOM_NAV);
  });

  it('returns dashboard bottom nav for dashboard appId', () => {
    expect(getBottomNav('dashboard')).toBe(DASHBOARD_BOTTOM_NAV);
  });

  it('returns saas-admin bottom nav for saas-admin appId', () => {
    expect(getBottomNav('saas-admin')).toBe(SAAS_ADMIN_BOTTOM_NAV);
  });

  it('returns empty array for apps without bottom nav', () => {
    expect(getBottomNav('web')).toEqual([]);
    expect(getBottomNav('minside')).toEqual([]);
  });
});
