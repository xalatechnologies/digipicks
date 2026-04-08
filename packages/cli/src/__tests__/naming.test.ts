import { describe, it, expect } from 'vitest';
import { toKebab, toCamel, toPascal, toSnake, toTitle, pluralize, singularize } from '../lib/naming.js';

describe('toKebab', () => {
  it('converts PascalCase to kebab-case', () => {
    expect(toKebab('ReviewMod')).toBe('review-mod');
  });

  it('converts camelCase to kebab-case', () => {
    expect(toKebab('giftCard')).toBe('gift-card');
  });

  it('converts snake_case to kebab-case', () => {
    expect(toKebab('review_mod')).toBe('review-mod');
  });

  it('converts spaces to kebab-case', () => {
    expect(toKebab('review mod')).toBe('review-mod');
  });

  it('returns already kebab-case strings unchanged', () => {
    expect(toKebab('gift-card')).toBe('gift-card');
  });

  it('lowercases all characters', () => {
    expect(toKebab('GiftCard')).toBe('gift-card');
  });
});

describe('toCamel', () => {
  it('converts kebab-case to camelCase', () => {
    expect(toCamel('review-mod')).toBe('reviewMod');
  });

  it('converts PascalCase through kebab to camelCase', () => {
    expect(toCamel('ReviewMod')).toBe('reviewMod');
  });

  it('handles single word', () => {
    expect(toCamel('review')).toBe('review');
  });
});

describe('toPascal', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascal('gift-card')).toBe('GiftCard');
  });

  it('converts single word to PascalCase', () => {
    expect(toPascal('review')).toBe('Review');
  });

  it('handles multi-segment names', () => {
    expect(toPascal('access-code-batch')).toBe('AccessCodeBatch');
  });
});

describe('toSnake', () => {
  it('converts kebab-case to snake_case', () => {
    expect(toSnake('gift-card')).toBe('gift_card');
  });

  it('converts PascalCase through kebab to snake_case', () => {
    expect(toSnake('GiftCard')).toBe('gift_card');
  });
});

describe('toTitle', () => {
  it('converts kebab-case to Title Case', () => {
    expect(toTitle('gift-card')).toBe('Gift Card');
  });

  it('converts single word', () => {
    expect(toTitle('review')).toBe('Review');
  });

  it('converts PascalCase through kebab to Title Case', () => {
    expect(toTitle('GiftCard')).toBe('Gift Card');
  });
});

describe('pluralize', () => {
  it('adds s to regular nouns', () => {
    expect(pluralize('card')).toBe('cards');
  });

  it('adds es to words ending in s', () => {
    expect(pluralize('access')).toBe('accesses');
  });

  it('adds es to words ending in x', () => {
    expect(pluralize('box')).toBe('boxes');
  });

  it('adds es to words ending in sh', () => {
    expect(pluralize('crash')).toBe('crashes');
  });

  it('adds es to words ending in ch', () => {
    expect(pluralize('batch')).toBe('batches');
  });

  it('converts y to ies for consonant+y', () => {
    expect(pluralize('category')).toBe('categories');
  });

  it('keeps y and adds s for vowel+y', () => {
    expect(pluralize('key')).toBe('keys');
  });
});

describe('singularize', () => {
  it('removes trailing s', () => {
    expect(singularize('cards')).toBe('card');
  });

  it('converts ies back to y', () => {
    expect(singularize('categories')).toBe('category');
  });

  it('removes es from ses', () => {
    expect(singularize('accesses')).toBe('access');
  });

  it('removes es from xes', () => {
    expect(singularize('boxes')).toBe('box');
  });

  it('removes es from ches', () => {
    expect(singularize('batches')).toBe('batch');
  });

  it('removes es from shes', () => {
    expect(singularize('crashes')).toBe('crash');
  });

  it('does not remove s from words ending in ss', () => {
    expect(singularize('access')).toBe('access');
  });

  it('returns singular words unchanged', () => {
    expect(singularize('review')).toBe('review');
  });
});
