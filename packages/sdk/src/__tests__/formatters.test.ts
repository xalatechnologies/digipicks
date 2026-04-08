/**
 * formatters.test.ts
 *
 * Unit tests for SDK formatting utilities (date, time, currency, etc.).
 */
import { describe, it, expect } from 'vitest';
import {
    formatDate,
    formatTime,
    formatDateTime,
    formatCurrency,
    formatWeekdays,
    formatTimeSlot,
    formatPeriod,
    calculateDuration,
    mapPaymentStatus,
    getListingTypeLabel,
    formatPercent,
} from '../formatters';

// ---------------------------------------------------------------------------
// Date / Time Formatters
// ---------------------------------------------------------------------------

describe('formatDate', () => {
    it('formats an ISO date string', () => {
        const result = formatDate('2026-01-15T10:00:00Z');
        expect(result).toContain('2026');
        expect(result).toContain('15');
    });

    it('formats a Date object', () => {
        const result = formatDate(new Date('2026-06-01'));
        expect(result).toContain('2026');
    });

    it('formats an epoch timestamp', () => {
        const epoch = new Date('2026-03-20').getTime();
        const result = formatDate(epoch);
        expect(result).toContain('2026');
        expect(result).toContain('20');
    });

    it('returns empty string for falsy input', () => {
        expect(formatDate('')).toBe('');
        expect(formatDate(null as any)).toBe('');
        expect(formatDate(undefined as any)).toBe('');
    });

    it('returns original string for invalid date', () => {
        expect(formatDate('not-a-date')).toBe('not-a-date');
    });

    it('handles epoch 0 correctly (does not treat as falsy)', () => {
        const result = formatDate(0);
        // Epoch 0 = Jan 1, 1970
        expect(result).toContain('1970');
    });
});

describe('formatTime', () => {
    it('formats an ISO string to HH:mm', () => {
        const result = formatTime('2026-01-15T14:30:00Z');
        // Time zone dependent, but should contain digits
        expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('returns empty string for falsy input', () => {
        expect(formatTime('')).toBe('');
    });

    it('returns original string for invalid date', () => {
        expect(formatTime('invalid')).toBe('invalid');
    });
});

describe('formatDateTime', () => {
    it('formats to date + time', () => {
        const result = formatDateTime('2026-01-15T14:30:00Z');
        expect(result).toContain('2026');
        expect(result).toContain('15');
    });

    it('returns empty string for falsy input', () => {
        expect(formatDateTime('')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------

describe('formatCurrency', () => {
    it('formats NOK by default', () => {
        const result = formatCurrency(1500);
        // Should contain NOK symbol (kr) and the amount
        expect(result).toContain('1');
        expect(result).toContain('500');
    });

    it('formats with custom currency', () => {
        const result = formatCurrency(100, 'USD');
        expect(result).toBeTruthy();
    });

    it('handles zero', () => {
        const result = formatCurrency(0);
        expect(result).toContain('0');
    });

    it('handles decimal amounts', () => {
        const result = formatCurrency(99.5);
        expect(result).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// Weekday / Period / Time Slot
// ---------------------------------------------------------------------------

describe('formatWeekdays', () => {
    it('maps full weekday names to Norwegian labels', () => {
        expect(formatWeekdays(['monday', 'wednesday'])).toEqual(['Mandag', 'Onsdag']);
    });

    it('maps abbreviated weekday names', () => {
        expect(formatWeekdays(['mon', 'fri'])).toEqual(['Man', 'Fre']);
    });

    it('returns empty array for undefined', () => {
        expect(formatWeekdays(undefined)).toEqual([]);
    });

    it('returns empty array for empty array', () => {
        expect(formatWeekdays([])).toEqual([]);
    });

    it('returns original string for unknown keys', () => {
        expect(formatWeekdays(['foo'])).toEqual(['foo']);
    });
});

describe('formatTimeSlot', () => {
    it('formats start and end as range', () => {
        expect(formatTimeSlot('08:00', '16:00')).toBe('08:00 – 16:00');
    });
});

describe('formatPeriod', () => {
    it('formats two dates as a period range', () => {
        const result = formatPeriod('2026-06-01', '2026-08-31');
        expect(result).toContain('–');
        expect(result).toContain('2026');
    });

    it('handles invalid dates gracefully', () => {
        const result = formatPeriod('bad', 'dates');
        expect(result).toBe('bad – dates');
    });
});

describe('calculateDuration', () => {
    it('returns hours and minutes for durations > 60min', () => {
        expect(calculateDuration(
            '2026-01-15T10:00:00Z',
            '2026-01-15T11:30:00Z',
        )).toBe('1t 30min');
    });

    it('returns just hours for even durations', () => {
        expect(calculateDuration(
            '2026-01-15T10:00:00Z',
            '2026-01-15T12:00:00Z',
        )).toBe('2 timer');
    });

    it('returns minutes for durations < 60min', () => {
        expect(calculateDuration(
            '2026-01-15T10:00:00Z',
            '2026-01-15T10:45:00Z',
        )).toBe('45 min');
    });
});

// ---------------------------------------------------------------------------
// Mapping Helpers
// ---------------------------------------------------------------------------

describe('mapPaymentStatus', () => {
    it('maps "paid" to "paid"', () => {
        expect(mapPaymentStatus('paid')).toBe('paid');
    });

    it('maps "partial" to "partial"', () => {
        expect(mapPaymentStatus('partial')).toBe('partial');
    });

    it('maps "refunded" to "refunded"', () => {
        expect(mapPaymentStatus('refunded')).toBe('refunded');
    });

    it('defaults to "unpaid" for unknown statuses', () => {
        expect(mapPaymentStatus('unknown')).toBe('unpaid');
        expect(mapPaymentStatus('')).toBe('unpaid');
    });
});

describe('getListingTypeLabel', () => {
    it('maps SPACE to Lokaler', () => {
        expect(getListingTypeLabel('SPACE')).toBe('Lokaler');
    });

    it('maps EVENT to Arrangementer', () => {
        expect(getListingTypeLabel('EVENT')).toBe('Arrangementer');
    });

    it('returns "Annet" for undefined', () => {
        expect(getListingTypeLabel(undefined)).toBe('Annet');
    });

    it('falls back to the raw string for unknown types', () => {
        expect(getListingTypeLabel('CUSTOM_TYPE')).toBe('CUSTOM_TYPE');
    });
});

describe('formatPercent', () => {
    it('formats decimal value as percentage', () => {
        const result = formatPercent(0.85);
        expect(result).toContain('85');
        expect(result).toContain('%');
    });

    it('formats whole number as percentage when isDecimal=false', () => {
        const result = formatPercent(85, false);
        expect(result).toContain('85');
        expect(result).toContain('%');
    });

    it('handles zero', () => {
        const result = formatPercent(0);
        expect(result).toContain('0');
        expect(result).toContain('%');
    });
});
