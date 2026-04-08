/**
 * iCal Generator — .ics file creation for calendar events
 *
 * Pure utility functions to generate iCalendar (RFC 5545) format strings.
 * No external dependencies.
 *
 * Usage:
 *   import { generateICalEvent, generateICalMultiEvent } from "../lib/ical";
 *   const icsString = generateICalEvent({ ... });
 */

// =============================================================================
// TYPES
// =============================================================================

export interface ICalEventInput {
    /** Unique identifier for the event (e.g. orderId + performanceId) */
    uid: string;
    /** Event title, e.g. "Concert: Artist Name" */
    title: string;
    /** ISO 8601 date string for event start, e.g. "2026-03-15" */
    date: string;
    /** Start time in HH:mm format, e.g. "19:00" */
    startTime: string;
    /** End time in HH:mm format, e.g. "21:00" */
    endTime: string;
    /** Door open time in HH:mm format (optional) */
    doorsOpen?: string;
    /** Venue name, e.g. "Main Hall" */
    location: string;
    /** Optional address for the venue */
    address?: string;
    /** Optional description for the event */
    description?: string;
    /** Optional organizer name, e.g. "Platform" */
    organizerName?: string;
    /** Optional organizer email */
    organizerEmail?: string;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Generate an iCal (.ics) string for a single event.
 * Returns a complete VCALENDAR with one VEVENT.
 */
export function generateICalEvent(input: ICalEventInput): string {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${process.env.PLATFORM_NAME || "Xala"}//Ticketing//NO`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        ...generateVEvent(input),
        "END:VCALENDAR",
    ];

    // iCal spec requires CRLF line endings
    return lines.join("\r\n") + "\r\n";
}

/**
 * Generate an iCal (.ics) string for multiple events (e.g. multi-day pass).
 * Returns a single VCALENDAR with multiple VEVENTs.
 */
export function generateICalMultiEvent(events: ICalEventInput[]): string {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${process.env.PLATFORM_NAME || "Xala"}//Ticketing//NO`,
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ];

    for (const event of events) {
        lines.push(...generateVEvent(event));
    }

    lines.push("END:VCALENDAR");
    return lines.join("\r\n") + "\r\n";
}

// =============================================================================
// HELPERS
// =============================================================================

function generateVEvent(input: ICalEventInput): string[] {
    const dtStart = toICalDateTime(input.date, input.startTime);
    const dtEnd = toICalDateTime(input.date, input.endTime);
    const now = toICalTimestamp(new Date());
    const uid = `${input.uid}@${process.env.ICAL_DOMAIN || "saas-platform.local"}`;

    const locationStr = input.address
        ? `${input.location}\\, ${input.address}`
        : input.location;

    const descParts: string[] = [];
    if (input.doorsOpen) {
        descParts.push(`Dorene apner: ${input.doorsOpen}`);
    }
    if (input.description) {
        descParts.push(input.description);
    }
    descParts.push(`Billett kjopt via ${process.env.PLATFORM_NAME || "plattformen"}`);

    const lines = [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Europe/Oslo:${dtStart}`,
        `DTEND;TZID=Europe/Oslo:${dtEnd}`,
        `SUMMARY:${escapeICalText(input.title)}`,
        `LOCATION:${escapeICalText(locationStr)}`,
        `DESCRIPTION:${escapeICalText(descParts.join("\\n"))}`,
    ];

    if (input.organizerName && input.organizerEmail) {
        lines.push(
            `ORGANIZER;CN=${escapeICalText(input.organizerName)}:mailto:${input.organizerEmail}`
        );
    }

    // Add a reminder 1 hour before the event
    lines.push(
        "BEGIN:VALARM",
        "TRIGGER:-PT1H",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeICalText(input.title)} starter snart`,
        "END:VALARM"
    );

    lines.push("END:VEVENT");
    return lines;
}

/**
 * Convert date "2026-03-15" + time "19:00" to iCal local datetime "20260315T190000".
 */
function toICalDateTime(date: string, time: string): string {
    const [year, month, day] = date.split("-");
    const [hour, minute] = time.split(":");
    return `${year}${month}${day}T${hour}${minute}00`;
}

/**
 * Convert a JS Date to iCal UTC timestamp "20260315T180000Z".
 */
function toICalTimestamp(d: Date): string {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hour = String(d.getUTCHours()).padStart(2, "0");
    const minute = String(d.getUTCMinutes()).padStart(2, "0");
    const second = String(d.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/**
 * Escape special characters in iCal text values per RFC 5545 §3.3.11.
 */
function escapeICalText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}
