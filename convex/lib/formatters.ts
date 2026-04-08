/**
 * Shared formatters — used across domain facades for consistent output.
 * Centralised here to avoid duplication between bookings.ts, messaging.ts, etc.
 */

/**
 * Format a number as Norwegian currency (e.g. "1 500 NOK").
 * @param amount - Amount in major units (kroner, not øre)
 * @param currency - ISO 4217 currency code (default "NOK")
 */
export function formatNOK(amount: number, currency = "NOK"): string {
    return `${amount.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}
