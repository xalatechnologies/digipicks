import { describe, it, expect } from 'vitest';
import nb from '../../locales/nb.json';
import en from '../../locales/en.json';
import ar from '../../locales/ar.json';

/**
 * Recursively extracts all nested key paths from an object.
 * For example, { common: { loading: "..." } } returns ["common.loading"]
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

/**
 * Recursively finds all keys with empty string values.
 */
function getEmptyStringKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const emptyKeys: string[] = [];
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            emptyKeys.push(...getEmptyStringKeys(value as Record<string, unknown>, fullKey));
        } else if (value === '') {
            emptyKeys.push(fullKey);
        }
    }
    return emptyKeys;
}

/**
 * Looks up a nested key path in an object.
 * For example, getNestedValue(obj, "common.loading") returns obj.common.loading
 */
function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
    const parts = keyPath.split('.');
    let current: unknown = obj;
    for (const part of parts) {
        if (current === null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

describe('Translation completeness', () => {
    const nbKeys = getAllKeys(nb as Record<string, unknown>);
    const enKeys = getAllKeys(en as Record<string, unknown>);
    const arKeys = getAllKeys(ar as Record<string, unknown>);

    describe('nb.json (source locale) keys exist in en.json', () => {
        it('English covers at least 99% of Norwegian keys', () => {
            const missingInEn = nbKeys.filter((key) => !enKeys.includes(key));
            const coverage = ((nbKeys.length - missingInEn.length) / nbKeys.length) * 100;
            if (missingInEn.length > 0) {
                console.warn(
                    `Missing ${missingInEn.length} keys in en.json (${coverage.toFixed(1)}% coverage):\n${missingInEn.join('\n')}`
                );
            }
            // English should be nearly complete — allow max 2 missing keys
            expect(missingInEn.length).toBeLessThanOrEqual(2);
        });
    });

    describe('nb.json (source locale) keys exist in ar.json', () => {
        it('Arabic covers critical common keys', () => {
            const commonKeys = nbKeys.filter((k) => k.startsWith('common.'));
            const missingCommon = commonKeys.filter((key) => !arKeys.includes(key));
            // Arabic common namespace coverage (currently ~40%, goal: 80%+)
            const coverage = ((commonKeys.length - missingCommon.length) / commonKeys.length) * 100;
            expect(coverage).toBeGreaterThan(30);
        });

        it('Arabic coverage is tracked (currently incomplete)', () => {
            const missingInAr = nbKeys.filter((key) => !arKeys.includes(key));
            const coverage = ((nbKeys.length - missingInAr.length) / nbKeys.length) * 100;
            console.warn(
                `Arabic translation coverage: ${coverage.toFixed(1)}% (${nbKeys.length - missingInAr.length}/${nbKeys.length} keys)`
            );
            // Arabic is work-in-progress — track coverage trending upward
            expect(arKeys.length).toBeGreaterThan(50);
        });
    });

    describe('no empty string values', () => {
        it('nb.json has no empty string values', () => {
            const emptyKeys = getEmptyStringKeys(nb as Record<string, unknown>);
            if (emptyKeys.length > 0) {
                console.warn(
                    `Empty values in nb.json:\n${emptyKeys.join('\n')}`
                );
            }
            expect(emptyKeys).toEqual([]);
        });

        it('en.json has no empty string values', () => {
            const emptyKeys = getEmptyStringKeys(en as Record<string, unknown>);
            if (emptyKeys.length > 0) {
                console.warn(
                    `Empty values in en.json:\n${emptyKeys.join('\n')}`
                );
            }
            expect(emptyKeys).toEqual([]);
        });
    });

    describe('critical keys exist in all locales', () => {
        const criticalKeys = [
            'common.loading',
            'common.error',
            'common.save',
            'common.cancel',
        ];

        for (const key of criticalKeys) {
            it(`"${key}" exists in nb.json`, () => {
                expect(getNestedValue(nb as Record<string, unknown>, key)).toBeDefined();
            });

            it(`"${key}" exists in en.json`, () => {
                expect(getNestedValue(en as Record<string, unknown>, key)).toBeDefined();
            });

            it(`"${key}" exists in ar.json`, () => {
                expect(getNestedValue(ar as Record<string, unknown>, key)).toBeDefined();
            });
        }
    });
});
