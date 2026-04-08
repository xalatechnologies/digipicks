/**
 * Formatting utilities for platform apps.
 *
 * Used across web, backoffice, and minside for date/time/currency display.
 */

// ---------------------------------------------------------------------------
// Date / Time Formatters
// ---------------------------------------------------------------------------

const NB_LOCALE = 'nb-NO';

/**
 * Format a date string or Date to a locale-friendly date string.
 * @example formatDate('2026-01-15T10:00:00Z') → '15. jan. 2026'
 */
export function formatDate(input: string | number | Date): string {
    if (!input && input !== 0) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (isNaN(date.getTime())) return String(input);
    return date.toLocaleDateString(NB_LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format a date string or Date to a time string (HH:mm).
 * @example formatTime('2026-01-15T10:30:00Z') → '10:30'
 */
export function formatTime(input: string | Date): string {
    if (!input) return '';
    const date = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(date.getTime())) return String(input);
    return date.toLocaleTimeString(NB_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a date string or Date to a full date+time string.
 * @example formatDateTime('2026-01-15T10:30:00Z') → '15. jan. 2026, 10:30'
 */
export function formatDateTime(input: string | number | Date): string {
    if (!input && input !== 0) return '';
    const date = input instanceof Date ? input : new Date(input);
    if (isNaN(date.getTime())) return String(input);
    return date.toLocaleDateString(NB_LOCALE, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Format a currency amount.
 * @example formatCurrency(1500, 'NOK') → 'kr 1 500,00'
 */
export function formatCurrency(amount: number, currency = 'NOK'): string {
    return new Intl.NumberFormat(NB_LOCALE, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a week range label from a start date.
 * @example formatWeekRange('2026-01-13') → 'Uke 3, 13. jan – 19. jan 2026'
 */
export function formatWeekRange(startDate: string | Date, _endDate?: string | Date): string {
    if (!startDate) return '';
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    if (isNaN(start.getTime())) return String(startDate);

    // Calculate ISO week number
    const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    // Calculate end of week (Sunday)
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startStr = start.toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });

    return `Uke ${weekNo}, ${startStr} – ${endStr}`;
}

// ---------------------------------------------------------------------------
// Weekday / Period / Time Slot Formatters
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS: Record<string, string> = {
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    sunday: 'Søndag',
    mon: 'Man',
    tue: 'Tir',
    wed: 'Ons',
    thu: 'Tor',
    fri: 'Fre',
    sat: 'Lør',
    sun: 'Søn',
};

/**
 * Convert weekday identifiers to Norwegian labels.
 * @example formatWeekdays(['monday', 'wednesday']) → ['Mandag', 'Onsdag']
 */
export function formatWeekdays(weekdays: string[] | undefined): string[] {
    if (!weekdays?.length) return [];
    return weekdays.map(d => WEEKDAY_LABELS[d.toLowerCase()] ?? d);
}

/**
 * Format a date period as a human-readable range.
 * @example formatPeriod('2026-06-01', '2026-08-31') → '1. jun. 2026 – 31. aug. 2026'
 */
export function formatPeriod(start: string | Date, end: string | Date): string {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return `${start} – ${end}`;
    const fmt = (d: Date) =>
        d.toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(s)} – ${fmt(e)}`;
}

/**
 * Format a time slot range.
 * @example formatTimeSlot('08:00', '16:00') → '08:00 – 16:00'
 */
export function formatTimeSlot(start: string, end: string): string {
    return `${start} – ${end}`;
}

/**
 * Format time range from two ISO strings.
 * @example formatTimeRange('2026-01-15T10:00:00Z', '2026-01-15T11:30:00Z') → '10:00 – 11:30'
 */
export function formatTimeRange(startIso: string, endIso: string): string {
    const fmt = (d: Date) => d.toLocaleTimeString(NB_LOCALE, { hour: '2-digit', minute: '2-digit' });
    return `${fmt(new Date(startIso))} – ${fmt(new Date(endIso))}`;
}

/**
 * Calculate duration between two ISO timestamps.
 * @example calculateDuration('2026-01-15T10:00:00Z', '2026-01-15T11:30:00Z') → '1t 30min'
 */
export function calculateDuration(startIso: string, endIso: string): string {
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    const minutes = Math.round((endMs - startMs) / (1000 * 60));
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return remainingMins > 0 ? `${hours}t ${remainingMins}min` : `${hours} timer`;
    }
    return `${minutes} min`;
}

/**
 * Future-relative date: "I dag", "I morgen", "Om 3 dager", or "14. jan."
 */
export function formatRelativeDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I morgen';
    if (diffDays < 7) return `Om ${diffDays} dager`;
    return date.toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short' });
}

/**
 * Compact past-relative time: "Nå", "5 min", "2 t", "I går", "3 d", or "14. jan."
 */
export function formatRelativeTimeCompact(isoOrTimestamp: string | number): string {
    const timestamp = typeof isoOrTimestamp === 'string' ? new Date(isoOrTimestamp).getTime() : isoOrTimestamp;
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Nå';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} t`;
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} d`;
    return new Date(timestamp).toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short' });
}

/**
 * i18n-aware "time ago" formatter for messaging and request UIs.
 *
 * When `t` is provided, uses i18n keys:
 *   - `timeAgo.justNow`, `timeAgo.minutesAgo`, `timeAgo.hoursAgo`, `timeAgo.daysAgo`
 * When `t` is omitted, returns compact Norwegian strings (Nå, 5m, 2t, 3d).
 *
 * @example formatTimeAgo('2026-01-15T10:00:00Z')       → '3d'
 * @example formatTimeAgo('2026-01-15T10:00:00Z', t)     → t('timeAgo.daysAgo', { count: 3 })
 */
export function formatTimeAgo(
    dateStr: string,
    t?: (key: string, opts?: Record<string, unknown>) => string,
): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (t) {
        if (diffMins < 1) return t('timeAgo.justNow');
        if (diffMins < 60) return t('timeAgo.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('timeAgo.hoursAgo', { count: diffHours });
        if (diffDays < 7) return t('timeAgo.daysAgo', { count: diffDays });
    } else {
        if (diffMins < 1) return 'Nå';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}t`;
        if (diffDays < 7) return `${diffDays}d`;
    }
    return date.toLocaleDateString(NB_LOCALE, { day: 'numeric', month: 'short' });
}

/**
 * i18n-aware date grouping formatter for messaging UIs.
 *
 * When `t` is provided, uses i18n keys:
 *   - `messageDate.today`, `messageDate.yesterday`
 * When `t` is omitted, returns Norwegian strings (I dag, I går).
 *
 * @example formatMessageDate('2026-01-15T10:00:00Z')     → 'I dag'
 * @example formatMessageDate('2026-01-15T10:00:00Z', t)   → t('messageDate.today')
 */
export function formatMessageDate(
    dateStr: string,
    t?: (key: string) => string,
): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return t ? t('messageDate.today') : 'I dag';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return t ? t('messageDate.yesterday') : 'I går';
    }
    return date.toLocaleDateString(NB_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Map invoice/payment status to PaymentStatusBadge-compatible value.
 */
export function mapPaymentStatus(status: string): 'paid' | 'partial' | 'refunded' | 'unpaid' {
    switch (status) {
        case 'paid':
            return 'paid';
        case 'partial':
            return 'partial';
        case 'refunded':
            return 'refunded';
        default:
            return 'unpaid';
    }
}

// ---------------------------------------------------------------------------
// Listing Helpers
// ---------------------------------------------------------------------------

const LISTING_TYPE_LABEL_MAP: Record<string, string> = {
    // ListingType enum values -> Norwegian labels
    SPACE: 'Lokaler',
    RESOURCE: 'Sport',
    SERVICE: 'Torget',
    VEHICLE: 'Kjøretøy',
    EVENT: 'Arrangementer',
    OTHER: 'Annet',
    // Category keys -> Norwegian labels
    LOKALER: 'Lokaler',
    SPORT: 'Sport',
    ARRANGEMENTER: 'Arrangementer',
    TORGET: 'Torget',
    // Legacy keys
    boat: 'Båt',
    cabin: 'Hytte',
    equipment: 'Utstyr',
    facility: 'Lokale',
    vehicle: 'Kjøretøy',
    other: 'Annet',
};

/**
 * Get a human-readable Norwegian label for a listing type.
 * @example getListingTypeLabel('SPACE') → 'Lokale'
 */
export function getListingTypeLabel(type: string | undefined): string {
    if (!type) return 'Annet';
    return LISTING_TYPE_LABEL_MAP[type] ?? type;
}

/**
 * Format a number as a percentage string.
 * @example formatPercent(0.85) → '85 %'
 * @example formatPercent(85, false) → '85 %'
 */
export function formatPercent(value: number, isDecimal = true): string {
    return new Intl.NumberFormat(NB_LOCALE, {
        style: 'percent',
        maximumFractionDigits: 1,
    }).format(isDecimal ? value : value / 100);
}
