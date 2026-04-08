import { describe, it, expect } from 'vitest';
import {
  cn,
  spacing,
  interactiveBackgrounds,
  badgeStyles,
  menuItemStyles,
  emptyStateStyles,
  buttonTextColors,
  logoStyles,
  brandColors,
  brandColorsCss,
} from '../utils';

// ---------------------------------------------------------------------------
// cn — class name merging
// ---------------------------------------------------------------------------

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', undefined, 'b', null, false, 'c')).toBe('a b c');
  });

  it('returns empty string for no args', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('only')).toBe('only');
  });
});

// ---------------------------------------------------------------------------
// Design token exports — structure validation
// ---------------------------------------------------------------------------

describe('spacing', () => {
  it('has expected keys', () => {
    expect(spacing).toHaveProperty('xs');
    expect(spacing).toHaveProperty('sm');
    expect(spacing).toHaveProperty('md');
    expect(spacing).toHaveProperty('lg');
    expect(spacing).toHaveProperty('xl');
  });

  it('values reference CSS custom properties', () => {
    for (const [, value] of Object.entries(spacing)) {
      expect(value).toMatch(/^var\(--ds-size-/);
    }
  });
});

describe('interactiveBackgrounds', () => {
  it('has hover, active, selected', () => {
    expect(interactiveBackgrounds).toHaveProperty('hover');
    expect(interactiveBackgrounds).toHaveProperty('active');
    expect(interactiveBackgrounds).toHaveProperty('selected');
  });
});

describe('badgeStyles', () => {
  it('has meta, shortcut, notification presets', () => {
    expect(badgeStyles).toHaveProperty('meta');
    expect(badgeStyles).toHaveProperty('shortcut');
    expect(badgeStyles).toHaveProperty('notification');
  });

  it('each preset has padding and fontSize', () => {
    for (const [, style] of Object.entries(badgeStyles)) {
      expect(style).toHaveProperty('padding');
      expect(style).toHaveProperty('fontSize');
    }
  });
});

describe('menuItemStyles', () => {
  it('has padding and gap', () => {
    expect(menuItemStyles).toHaveProperty('padding');
    expect(menuItemStyles).toHaveProperty('gap');
  });
});

describe('emptyStateStyles', () => {
  it('has padding and gap', () => {
    expect(emptyStateStyles).toHaveProperty('padding');
    expect(emptyStateStyles).toHaveProperty('gap');
  });
});

describe('buttonTextColors', () => {
  it('has semantic color keys', () => {
    expect(buttonTextColors).toHaveProperty('success');
    expect(buttonTextColors).toHaveProperty('accent');
    expect(buttonTextColors).toHaveProperty('danger');
    expect(buttonTextColors).toHaveProperty('warning');
  });
});

describe('logoStyles', () => {
  it('has title and subtitle presets', () => {
    expect(logoStyles).toHaveProperty('title');
    expect(logoStyles).toHaveProperty('subtitle');
    expect(logoStyles.title).toHaveProperty('fontSize');
    expect(logoStyles.subtitle).toHaveProperty('textTransform');
  });
});

describe('brandColors', () => {
  it('has 7 brand colors', () => {
    expect(Object.keys(brandColors)).toHaveLength(7);
  });

  it('each color has hex and oklch', () => {
    for (const [, color] of Object.entries(brandColors)) {
      expect(color).toHaveProperty('hex');
      expect(color).toHaveProperty('oklch');
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('brandColorsCss', () => {
  it('contains CSS custom properties', () => {
    expect(brandColorsCss).toMatch(/--brand-navy/);
    expect(brandColorsCss).toMatch(/--brand-blue/);
    expect(brandColorsCss).toMatch(/:root/);
  });
});
