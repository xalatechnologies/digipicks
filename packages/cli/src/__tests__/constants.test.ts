import { describe, it, expect } from 'vitest';
import { APPS, ROLES, ROUTE_TYPES, VIEW_MODES, DS_LEVELS, PATHS } from '../lib/constants.js';

describe('constants', () => {
  it('APPS contains the expected app names', () => {
    expect(APPS).toContain('web');
    expect(APPS).toContain('dashboard');
    expect(APPS).toHaveLength(2);
  });

  it('ROLES contains the expected roles', () => {
    expect(ROLES).toContain('admin');
    expect(ROLES).toContain('user');
    expect(ROLES).toContain('case_handler');
    expect(ROLES).toContain('arranger');
  });

  it('ROUTE_TYPES contains list, detail, form', () => {
    expect(ROUTE_TYPES).toEqual(['list', 'detail', 'form']);
  });

  it('VIEW_MODES contains grid, list, table', () => {
    expect(VIEW_MODES).toEqual(['grid', 'list', 'table']);
  });

  it('DS_LEVELS contains primitives, composed, blocks', () => {
    expect(DS_LEVELS).toEqual(['primitives', 'composed', 'blocks']);
  });

  it('PATHS.apps returns correct path for an app', () => {
    const p = PATHS.apps('web');
    expect(p).toContain('apps');
    expect(p).toContain('web');
  });

  it('PATHS.appTsx returns correct path', () => {
    const p = PATHS.appTsx('dashboard');
    expect(p).toContain('apps/dashboard/src/App.tsx');
  });

  it('PATHS.routes returns correct path', () => {
    const p = PATHS.routes('dashboard');
    expect(p).toContain('apps/dashboard/src/routes');
  });
});
