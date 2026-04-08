/**
 * Shared constants for platform apps.
 *
 * Used across backoffice and minside for listing type filters and labels.
 */

// ---------------------------------------------------------------------------
// Listing Type Options (used in filter UIs)
// ---------------------------------------------------------------------------

export const LISTING_TYPE_OPTIONS: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'Alle typer' },
    { id: 'SPACE', label: 'Lokaler' },
    { id: 'RESOURCE', label: 'Sport' },
    { id: 'EVENT', label: 'Arrangementer' },
    { id: 'SERVICE', label: 'Torget' },
];

// ---------------------------------------------------------------------------
// Listing Type Labels (keyed by type ID)
// ---------------------------------------------------------------------------

export const LISTING_TYPE_LABELS: Record<string, string> = {
    SPACE: 'Lokaler',
    RESOURCE: 'Sport',
    SERVICE: 'Torget',
    EVENT: 'Arrangementer',
    VEHICLE: 'Kjøretøy',
    OTHER: 'Annet',
};
