/**
 * Messaging Templates — SMS + Email
 *
 * Bilingual (Norwegian/English) message templates for all notification types.
 * SMS templates are plain text; email templates are HTML with inline styles.
 *
 * Template categories:
 *   - verification: Phone/email verification codes
 *   - mfa: Login MFA codes
 *   - order: Order confirmations
 *   - reminder: Event reminders
 *   - ticket: Ticket issued, cancelled, transferred
 *   - password: Password reset
 */

// =============================================================================
// TYPES
// =============================================================================

export type Locale = "nb" | "en";
export type Channel = "sms" | "email";

export interface TemplateResult {
    /** SMS: plain text body / Email: HTML body */
    body: string;
    /** Email only: subject line */
    subject?: string;
}

export interface TemplateVars {
    code?: string;
    tenantName?: string;
    customerName?: string;
    orderNumber?: string;
    ticketCount?: number;
    eventName?: string;
    date?: string;
    startTime?: string;
    doorsOpen?: string;
    venue?: string;
    ticketNumber?: string;
    senderName?: string;
    refundAmount?: number;
    currency?: string;
    reason?: string;
    minutes?: number;
    link?: string;
}

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

type TemplateKey =
    | "verification_code"
    | "mfa_code"
    | "order_confirmation"
    | "event_reminder"
    | "ticket_issued"
    | "ticket_cancelled"
    | "ticket_transfer"
    | "password_reset";

type TemplateRenderer = (vars: TemplateVars) => TemplateResult;

const templates: Record<TemplateKey, Record<Locale, Record<Channel, TemplateRenderer>>> = {
    // =========================================================================
    // VERIFICATION CODE
    // =========================================================================
    verification_code: {
        nb: {
            sms: (v) => ({
                body: `${v.code} er din verifiseringskode for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Gyldig i ${v.minutes ?? 10} min. Del aldri denne koden.`,
            }),
            email: (v) => ({
                subject: `${v.code} — Verifiseringskode`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Din verifiseringskode</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Bruk denne koden for å verifisere kontoen din:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">Koden er gyldig i ${v.minutes ?? 10} minutter.</p>
                    <p style="${mutedStyle}">Hvis du ikke har bedt om denne koden, kan du ignorere denne meldingen.</p>
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `${v.code} is your verification code for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Valid for ${v.minutes ?? 10} min. Never share this code.`,
            }),
            email: (v) => ({
                subject: `${v.code} — Verification Code`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Your verification code</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Use this code to verify your account:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">This code is valid for ${v.minutes ?? 10} minutes.</p>
                    <p style="${mutedStyle}">If you didn't request this code, you can safely ignore this message.</p>
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // MFA CODE
    // =========================================================================
    mfa_code: {
        nb: {
            sms: (v) => ({
                body: `${v.code} er din innloggingskode for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Gyldig i 5 min.`,
            }),
            email: (v) => ({
                subject: `${v.code} — Innloggingskode`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Innloggingskode</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Skriv inn denne koden for å logge inn:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">Koden utløper om 5 minutter.</p>
                    <p style="${mutedStyle}">Hvis du ikke prøvde å logge inn, bør du endre passordet ditt umiddelbart.</p>
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `${v.code} is your login code for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Valid for 5 min.`,
            }),
            email: (v) => ({
                subject: `${v.code} — Login Code`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Login code</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Enter this code to complete your login:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">This code expires in 5 minutes.</p>
                    <p style="${mutedStyle}">If you didn't try to log in, please change your password immediately.</p>
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // ORDER CONFIRMATION
    // =========================================================================
    order_confirmation: {
        nb: {
            sms: (v) => ({
                body: `Takk for din bestilling! Ordrenr: ${v.orderNumber}. ${v.ticketCount ?? ""} billett(er) til ${v.eventName ?? "arrangementet"}. Se e-post for detaljer.`,
            }),
            email: (v) => ({
                subject: `Ordrebekreftelse — ${v.orderNumber}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Ordrebekreftelse</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Takk for din bestilling!</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Ordrenummer</td><td style="${tdValueStyle}">${v.orderNumber}</td></tr>
                        ${v.eventName ? `<tr><td style="${tdLabelStyle}">Arrangement</td><td style="${tdValueStyle}">${v.eventName}</td></tr>` : ""}
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Dato</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.ticketCount ? `<tr><td style="${tdLabelStyle}">Antall billetter</td><td style="${tdValueStyle}">${v.ticketCount}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Billettene dine vil bli utstedt snart.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">Se bestilling</a>` : ""}
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `Thank you for your order! Order #${v.orderNumber}. ${v.ticketCount ?? ""} ticket(s) for ${v.eventName ?? "the event"}. Check email for details.`,
            }),
            email: (v) => ({
                subject: `Order Confirmation — ${v.orderNumber}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Order Confirmation</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Thank you for your order!</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Order Number</td><td style="${tdValueStyle}">${v.orderNumber}</td></tr>
                        ${v.eventName ? `<tr><td style="${tdLabelStyle}">Event</td><td style="${tdValueStyle}">${v.eventName}</td></tr>` : ""}
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Date</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.ticketCount ? `<tr><td style="${tdLabelStyle}">Tickets</td><td style="${tdValueStyle}">${v.ticketCount}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Your tickets will be issued shortly.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">View Order</a>` : ""}
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // EVENT REMINDER
    // =========================================================================
    event_reminder: {
        nb: {
            sms: (v) => ({
                body: `Påminnelse: ${v.eventName} ${v.date ? `${v.date} ` : ""}kl ${v.startTime ?? ""} på ${v.venue ?? "stedet"}. ${v.doorsOpen ? `Dørene åpner kl ${v.doorsOpen}.` : ""} Husk billettene!`,
            }),
            email: (v) => ({
                subject: `Påminnelse: ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Arrangementspåminnelse</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Bare en påminnelse om at arrangementet nærmer seg!</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Arrangement</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Dato</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.startTime ? `<tr><td style="${tdLabelStyle}">Tid</td><td style="${tdValueStyle}">${v.startTime}</td></tr>` : ""}
                        ${v.doorsOpen ? `<tr><td style="${tdLabelStyle}">Dørene åpner</td><td style="${tdValueStyle}">${v.doorsOpen}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Sted</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Husk å ha billettene klare ved inngangen.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">Se arrangement</a>` : ""}
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `Reminder: ${v.eventName} ${v.date ? `on ${v.date} ` : ""}at ${v.startTime ?? ""}, ${v.venue ?? "venue"}. ${v.doorsOpen ? `Doors open at ${v.doorsOpen}.` : ""} Don't forget your tickets!`,
            }),
            email: (v) => ({
                subject: `Reminder: ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Event Reminder</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Just a reminder that your event is coming up!</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Event</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Date</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.startTime ? `<tr><td style="${tdLabelStyle}">Time</td><td style="${tdValueStyle}">${v.startTime}</td></tr>` : ""}
                        ${v.doorsOpen ? `<tr><td style="${tdLabelStyle}">Doors Open</td><td style="${tdValueStyle}">${v.doorsOpen}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Venue</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Remember to have your tickets ready at the entrance.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">View Event</a>` : ""}
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // TICKET ISSUED
    // =========================================================================
    ticket_issued: {
        nb: {
            sms: (v) => ({
                body: `Din billett til ${v.eventName} er klar! Billettnr: ${v.ticketNumber}. Sjekk e-post for QR-kode og detaljer.`,
            }),
            email: (v) => ({
                subject: `Billett klar — ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Din billett er klar!</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Her er din billett:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Arrangement</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        <tr><td style="${tdLabelStyle}">Billettnummer</td><td style="${tdValueStyle}">${v.ticketNumber}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Dato</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Sted</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Vis QR-koden ved inngangen for innslipp.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">Se billett</a>` : ""}
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `Your ticket to ${v.eventName} is ready! Ticket #${v.ticketNumber}. Check email for QR code and details.`,
            }),
            email: (v) => ({
                subject: `Ticket Ready — ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Your ticket is ready!</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Here is your ticket:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Event</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        <tr><td style="${tdLabelStyle}">Ticket Number</td><td style="${tdValueStyle}">${v.ticketNumber}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Date</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Venue</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    <p style="${pStyle}">Show the QR code at the entrance for admission.</p>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">View Ticket</a>` : ""}
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // TICKET CANCELLED
    // =========================================================================
    ticket_cancelled: {
        nb: {
            sms: (v) => ({
                body: `Billett ${v.ticketNumber} til ${v.eventName} er kansellert.${v.refundAmount ? ` Refusjon: ${v.refundAmount} ${v.currency ?? "NOK"}.` : ""}`,
            }),
            email: (v) => ({
                subject: `Billett kansellert — ${v.ticketNumber}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Billett kansellert</h2>
                    <p style="${pStyle}">Vi bekrefter at følgende billett er kansellert:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Billettnummer</td><td style="${tdValueStyle}">${v.ticketNumber}</td></tr>
                        <tr><td style="${tdLabelStyle}">Arrangement</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.reason ? `<tr><td style="${tdLabelStyle}">Årsak</td><td style="${tdValueStyle}">${v.reason}</td></tr>` : ""}
                        ${v.refundAmount ? `<tr><td style="${tdLabelStyle}">Refusjon</td><td style="${tdValueStyle}">${v.refundAmount} ${v.currency ?? "NOK"}</td></tr>` : ""}
                    </table>
                    <p style="${mutedStyle}">Har du spørsmål? Ta kontakt med oss.</p>
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `Ticket ${v.ticketNumber} for ${v.eventName} has been cancelled.${v.refundAmount ? ` Refund: ${v.refundAmount} ${v.currency ?? "NOK"}.` : ""}`,
            }),
            email: (v) => ({
                subject: `Ticket Cancelled — ${v.ticketNumber}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Ticket Cancelled</h2>
                    <p style="${pStyle}">We confirm that the following ticket has been cancelled:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Ticket Number</td><td style="${tdValueStyle}">${v.ticketNumber}</td></tr>
                        <tr><td style="${tdLabelStyle}">Event</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.reason ? `<tr><td style="${tdLabelStyle}">Reason</td><td style="${tdValueStyle}">${v.reason}</td></tr>` : ""}
                        ${v.refundAmount ? `<tr><td style="${tdLabelStyle}">Refund</td><td style="${tdValueStyle}">${v.refundAmount} ${v.currency ?? "NOK"}</td></tr>` : ""}
                    </table>
                    <p style="${mutedStyle}">Questions? Please contact us.</p>
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // TICKET TRANSFER
    // =========================================================================
    ticket_transfer: {
        nb: {
            sms: (v) => ({
                body: `${v.senderName ?? "Noen"} har overført en billett til ${v.eventName} til deg. Sjekk e-post for detaljer.`,
            }),
            email: (v) => ({
                subject: `Billett overført — ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Billett overført til deg</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">${v.senderName ?? "Noen"} har overført en billett til deg:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Arrangement</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Dato</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Sted</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">Se billett</a>` : ""}
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `${v.senderName ?? "Someone"} has transferred a ticket to ${v.eventName} to you. Check email for details.`,
            }),
            email: (v) => ({
                subject: `Ticket Transferred — ${v.eventName}`,
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Ticket transferred to you</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">${v.senderName ?? "Someone"} has transferred a ticket to you:</p>
                    <table style="${tableStyle}">
                        <tr><td style="${tdLabelStyle}">Event</td><td style="${tdValueStyle}">${v.eventName}</td></tr>
                        ${v.date ? `<tr><td style="${tdLabelStyle}">Date</td><td style="${tdValueStyle}">${v.date}</td></tr>` : ""}
                        ${v.venue ? `<tr><td style="${tdLabelStyle}">Venue</td><td style="${tdValueStyle}">${v.venue}</td></tr>` : ""}
                    </table>
                    ${v.link ? `<a href="${v.link}" style="${ctaStyle}">View Ticket</a>` : ""}
                `, v.tenantName),
            }),
        },
    },

    // =========================================================================
    // PASSWORD RESET
    // =========================================================================
    password_reset: {
        nb: {
            sms: (v) => ({
                body: `${v.code} er din kode for tilbakestilling av passord for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Gyldig i ${v.minutes ?? 10} min.`,
            }),
            email: (v) => ({
                subject: "Tilbakestill passord",
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Tilbakestill passord</h2>
                    <p style="${pStyle}">Hei${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">Vi mottok en forespørsel om å tilbakestille passordet ditt. Bruk denne koden:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">Koden er gyldig i ${v.minutes ?? 10} minutter.</p>
                    <p style="${mutedStyle}">Hvis du ikke ba om dette, kan du trygt ignorere denne meldingen.</p>
                `, v.tenantName),
            }),
        },
        en: {
            sms: (v) => ({
                body: `${v.code} is your password reset code for ${v.tenantName ?? (process.env.PLATFORM_NAME || "Xala")}. Valid for ${v.minutes ?? 10} min.`,
            }),
            email: (v) => ({
                subject: "Reset Password",
                body: wrapEmailHtml(`
                    <h2 style="${h2Style}">Reset Password</h2>
                    <p style="${pStyle}">Hi${v.customerName ? ` ${v.customerName}` : ""},</p>
                    <p style="${pStyle}">We received a request to reset your password. Use this code:</p>
                    <div style="${codeBoxStyle}">${v.code}</div>
                    <p style="${pStyle}">This code is valid for ${v.minutes ?? 10} minutes.</p>
                    <p style="${mutedStyle}">If you didn't request this, you can safely ignore this message.</p>
                `, v.tenantName),
            }),
        },
    },
};

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Render a template with the given variables.
 *
 * @param template — Template key (e.g. "verification_code")
 * @param channel — "sms" or "email"
 * @param locale — "nb" (Norwegian) or "en" (English), defaults to "nb"
 * @param vars — Template variables
 */
export function renderTemplate(
    template: TemplateKey,
    channel: Channel,
    locale: Locale = "nb",
    vars: TemplateVars
): TemplateResult {
    const tmpl = templates[template]?.[locale]?.[channel];
    if (!tmpl) {
        // Fallback to Norwegian if requested locale not found
        const fallback = templates[template]?.nb?.[channel];
        if (!fallback) {
            throw new Error(`Template "${template}" not found for channel "${channel}"`);
        }
        return fallback(vars);
    }
    return tmpl(vars);
}

/** All available template keys */
export function getTemplateKeys(): TemplateKey[] {
    return Object.keys(templates) as TemplateKey[];
}

// =============================================================================
// EMAIL HTML HELPERS
// =============================================================================

const h2Style = "color: #1a1a2e; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; font-family: 'Inter', -apple-system, sans-serif;";
const pStyle = "color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0; font-family: 'Inter', -apple-system, sans-serif;";
const mutedStyle = "color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 16px 0 0 0; font-family: 'Inter', -apple-system, sans-serif;";
const codeBoxStyle = "background: #f0f4ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; margin: 24px 0; font-family: 'SF Mono', 'Fira Code', monospace;";
const tableStyle = "width: 100%; border-collapse: collapse; margin: 16px 0;";
const tdLabelStyle = "padding: 10px 12px; color: #6b7280; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f3f4f6; font-family: 'Inter', -apple-system, sans-serif;";
const tdValueStyle = "padding: 10px 12px; color: #1a1a2e; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f3f4f6; text-align: right; font-family: 'Inter', -apple-system, sans-serif;";
const ctaStyle = "display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin: 16px 0; font-family: 'Inter', -apple-system, sans-serif;";

function wrapEmailHtml(content: string, tenantName?: string): string {
    const brandName = tenantName ?? (process.env.PLATFORM_NAME || "Xala");
    return `<!DOCTYPE html>
<html lang="nb" dir="ltr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb;">
        <tr><td align="center" style="padding: 40px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
                <tr><td style="padding: 8px 32px 0 32px;">
                    <p style="font-size: 14px; font-weight: 600; color: #6366f1; margin: 0; font-family: 'Inter', -apple-system, sans-serif;">${brandName}</p>
                </td></tr>
                <tr><td style="padding: 24px 32px 32px 32px;">
                    ${content}
                </td></tr>
                <tr><td style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center; font-family: 'Inter', -apple-system, sans-serif;">© ${new Date().getFullYear()} ${brandName}</p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}
