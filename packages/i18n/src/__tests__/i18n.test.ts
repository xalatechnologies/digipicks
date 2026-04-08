import { describe, it, expect } from 'vitest';
import {
    getDirection,
    formatDate,
    formatDateTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    sharedTranslations,
} from '../index';

describe('getDirection', () => {
    it('returns "ltr" for Norwegian (nb)', () => {
        expect(getDirection('nb')).toBe('ltr');
    });

    it('returns "ltr" for English (en)', () => {
        expect(getDirection('en')).toBe('ltr');
    });

    it('returns "rtl" for Arabic (ar)', () => {
        expect(getDirection('ar')).toBe('rtl');
    });
});

describe('formatDate', () => {
    const date = new Date(2024, 0, 15); // January 15, 2024

    it('formats date in Norwegian', () => {
        const result = formatDate(date, 'nb');
        expect(result).toContain('15');
        expect(result).toContain('2024');
        // Norwegian uses "januar" for January
        expect(result.toLowerCase()).toContain('januar');
    });

    it('formats date in English', () => {
        const result = formatDate(date, 'en');
        expect(result).toContain('15');
        expect(result).toContain('2024');
        expect(result).toContain('January');
    });

    it('formats date in Arabic', () => {
        const result = formatDate(date, 'ar');
        // Arabic formatted date should contain the year
        expect(result).toMatch(/2024|٢٠٢٤/);
    });
});

describe('formatDateTime', () => {
    // Use a UTC-friendly date to avoid timezone issues in tests
    const date = new Date(Date.UTC(2024, 0, 15, 14, 30, 0));

    it('includes time in the formatted output', () => {
        const result = formatDateTime(date, 'en', 'UTC');
        // Should contain hour and minute components
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('uses short month form', () => {
        const result = formatDateTime(date, 'en', 'UTC');
        // Short month form for January is "Jan"
        expect(result).toContain('Jan');
    });

    it('respects the timezone parameter', () => {
        const resultUTC = formatDateTime(date, 'en', 'UTC');
        const resultTokyo = formatDateTime(date, 'en', 'Asia/Tokyo');
        // Different timezones should produce different times
        // UTC is 14:30, Tokyo is 23:30 (UTC+9)
        expect(resultUTC).not.toBe(resultTokyo);
    });

    it('formats datetime in Norwegian', () => {
        const result = formatDateTime(date, 'nb', 'UTC');
        expect(result).toContain('2024');
        expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formats datetime in Arabic', () => {
        const result = formatDateTime(date, 'ar', 'UTC');
        expect(result).toMatch(/2024|٢٠٢٤/);
    });
});

describe('formatNumber', () => {
    const value = 1234567.89;

    it('formats numbers with Norwegian locale (space as thousands separator)', () => {
        const result = formatNumber(value, 'nb');
        // Norwegian uses non-breaking space (or regular space) as thousands separator
        // and comma as decimal separator: "1 234 567,89"
        expect(result).toMatch(/1\s234\s567,89/);
    });

    it('formats numbers with English locale (comma as thousands separator)', () => {
        const result = formatNumber(value, 'en');
        // English uses comma as thousands separator and period as decimal: "1,234,567.89"
        expect(result).toContain('1,234,567.89');
    });

    it('formats numbers with Arabic locale', () => {
        const result = formatNumber(value, 'ar');
        // Arabic should produce a formatted number string
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('formatCurrency', () => {
    const amount = 1234.5;

    it('formats NOK in Norwegian locale', () => {
        const result = formatCurrency(amount, 'NOK', 'nb');
        // Should contain the amount and NOK indicator
        expect(result).toMatch(/1\s?234/);
        // Should contain NOK or kr
        expect(result).toMatch(/NOK|kr/);
    });

    it('formats USD in English locale', () => {
        const result = formatCurrency(amount, 'USD', 'en');
        // Should contain dollar sign and formatted amount
        expect(result).toContain('$');
        expect(result).toContain('1,234.50');
    });

    it('formats EUR in Arabic locale', () => {
        const result = formatCurrency(amount, 'EUR', 'ar');
        // Should contain EUR symbol or text
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
    });
});

describe('formatRelativeTime', () => {
    it('formats "-1 day" in Norwegian as "i går" (yesterday)', () => {
        const result = formatRelativeTime(-1, 'day', 'nb');
        expect(result).toContain('i går');
    });

    it('formats "1 day" in English as "tomorrow"', () => {
        const result = formatRelativeTime(1, 'day', 'en');
        expect(result).toContain('tomorrow');
    });

    it('formats relative time in Arabic', () => {
        const result = formatRelativeTime(-1, 'day', 'ar');
        // Arabic should produce non-empty text
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
    });

    it('formats "-1 hour" in English as "1 hour ago"', () => {
        const result = formatRelativeTime(-1, 'hour', 'en');
        expect(result).toContain('hour ago');
    });

    it('formats "0 days" in English as "today" (numeric: auto)', () => {
        const result = formatRelativeTime(0, 'day', 'en');
        expect(result).toContain('today');
    });
});

describe('sharedTranslations', () => {
    it('has translations for Norwegian (nb)', () => {
        expect(sharedTranslations).toHaveProperty('nb');
    });

    it('has translations for English (en)', () => {
        expect(sharedTranslations).toHaveProperty('en');
    });

    it('has translations for Arabic (ar)', () => {
        expect(sharedTranslations).toHaveProperty('ar');
    });

    it('each locale has a "translation" key', () => {
        expect(sharedTranslations.nb).toHaveProperty('translation');
        expect(sharedTranslations.en).toHaveProperty('translation');
        expect(sharedTranslations.ar).toHaveProperty('translation');
    });
});
