/**
 * Ticket Lifecycle Email Templates
 *
 * Pre-rendered HTML email templates for ticketing events:
 *   - Order confirmation
 *   - Ticket issued
 *   - Event reminder
 *   - Ticket cancelled
 *
 * Each function returns { subject, html } ready for the email service.
 * Templates are bilingual (nb/en) and use inline styles for email client
 * compatibility. The HTML is the body content — wrap with
 * `wrapInEmailLayout()` from `convex/email/baseLayout.ts` before sending.
 *
 * These templates are used when no tenant-specific email template exists
 * in the notifications component. They serve as the built-in fallback.
 */

import { bookingDetailsCard, ctaButton, noticeBox } from "../email/baseLayout";

// =============================================================================
// TYPES
// =============================================================================

export type EmailLocale = "nb" | "en";

interface OrderConfirmationInput {
    orderNumber: string;
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
    }>;
    total: number;
    currency?: string;
    customerName: string;
    tenantName?: string;
    locale?: EmailLocale;
}

interface TicketIssuedInput {
    ticketNumber: string;
    eventName: string;
    date: string;
    startTime?: string;
    venue: string;
    barcode: string;
    ticketTypeName?: string;
    ownerName?: string;
    tenantName?: string;
    ticketUrl?: string;
    locale?: EmailLocale;
}

interface EventReminderInput {
    eventName: string;
    date: string;
    startTime?: string;
    doorsOpen?: string;
    venue: string;
    ticketCount: number;
    tenantName?: string;
    eventUrl?: string;
    locale?: EmailLocale;
}

interface TicketCancelledInput {
    ticketNumber: string;
    eventName: string;
    refundAmount?: number;
    currency?: string;
    reason?: string;
    tenantName?: string;
    locale?: EmailLocale;
}

// =============================================================================
// TRANSLATION HELPERS
// =============================================================================

const translations = {
    nb: {
        orderConfirmation: {
            subject: (orderNumber: string) =>
                `Ordrebekreftelse - ${orderNumber}`,
            greeting: (name: string) => `Hei ${name},`,
            intro: "Takk for din bestilling! Her er en oversikt over ordren din:",
            orderNumberLabel: "Ordrenummer",
            itemsHeader: "Varer",
            quantityLabel: "Antall",
            priceLabel: "Pris",
            totalLabel: "Totalt",
            ticketsReady:
                "Billettene dine vil bli utstedt snart. Du mottar en egen e-post med billettdetaljer.",
            contactNote:
                "Har du sporsmal om bestillingen? Ta kontakt med oss.",
        },
        ticketIssued: {
            subject: (eventName: string) =>
                `Din billett til ${eventName}`,
            greeting: (name: string) =>
                name ? `Hei ${name},` : "Hei,",
            intro: "Her er din billett:",
            eventLabel: "Arrangement",
            dateLabel: "Dato",
            timeLabel: "Tid",
            venueLabel: "Sted",
            ticketNumberLabel: "Billettnummer",
            ticketTypeLabel: "Billettype",
            barcodeLabel: "Strekkode",
            barcodeNote:
                "Vis denne strekkoden/QR-koden ved inngangen for innslipp.",
            viewTicket: "Se billett",
            enjoyNote: "Vi gleder oss til a se deg!",
        },
        eventReminder: {
            subject: (eventName: string) =>
                `Paaminnelse: ${eventName} i morgen`,
            greeting: "Hei,",
            intro: (eventName: string) =>
                `Dette er en paaminnelse om at ${eventName} finner sted i morgen.`,
            eventLabel: "Arrangement",
            dateLabel: "Dato",
            timeLabel: "Tid",
            doorsOpenLabel: "Dorene apner",
            venueLabel: "Sted",
            ticketCountLabel: "Antall billetter",
            rememberTickets:
                "Husk a ha billettene klare (digital eller utskrift) ved inngangen.",
            viewEvent: "Se arrangement",
            lookForward: "Vi gleder oss til a se deg!",
        },
        ticketCancelled: {
            subject: (ticketNumber: string) =>
                `Billett kansellert - ${ticketNumber}`,
            greeting: "Hei,",
            intro: "Vi bekrefter at folgende billett er kansellert:",
            ticketNumberLabel: "Billettnummer",
            eventLabel: "Arrangement",
            reasonLabel: "Arsak",
            refundLabel: "Refusjonsbelop",
            refundNote:
                "Refusjonen vil bli behandlet i lopet av 5-10 virkedager.",
            noRefund: "Ingen refusjon for denne kanselleringen.",
            contactNote:
                "Har du sporsmal? Ta kontakt med oss.",
        },
    },
    en: {
        orderConfirmation: {
            subject: (orderNumber: string) =>
                `Order Confirmation - ${orderNumber}`,
            greeting: (name: string) => `Hi ${name},`,
            intro: "Thank you for your order! Here is your order summary:",
            orderNumberLabel: "Order Number",
            itemsHeader: "Items",
            quantityLabel: "Qty",
            priceLabel: "Price",
            totalLabel: "Total",
            ticketsReady:
                "Your tickets will be issued shortly. You will receive a separate email with ticket details.",
            contactNote:
                "If you have questions about your order, please contact us.",
        },
        ticketIssued: {
            subject: (eventName: string) =>
                `Your ticket for ${eventName}`,
            greeting: (name: string) =>
                name ? `Hi ${name},` : "Hi,",
            intro: "Here is your ticket:",
            eventLabel: "Event",
            dateLabel: "Date",
            timeLabel: "Time",
            venueLabel: "Venue",
            ticketNumberLabel: "Ticket Number",
            ticketTypeLabel: "Ticket Type",
            barcodeLabel: "Barcode",
            barcodeNote:
                "Show this barcode/QR code at the entrance for admission.",
            viewTicket: "View Ticket",
            enjoyNote: "We look forward to seeing you!",
        },
        eventReminder: {
            subject: (eventName: string) =>
                `Reminder: ${eventName} is tomorrow`,
            greeting: "Hi,",
            intro: (eventName: string) =>
                `This is a reminder that ${eventName} is taking place tomorrow.`,
            eventLabel: "Event",
            dateLabel: "Date",
            timeLabel: "Time",
            doorsOpenLabel: "Doors Open",
            venueLabel: "Venue",
            ticketCountLabel: "Tickets",
            rememberTickets:
                "Remember to have your tickets ready (digital or print) at the entrance.",
            viewEvent: "View Event",
            lookForward: "We look forward to seeing you!",
        },
        ticketCancelled: {
            subject: (ticketNumber: string) =>
                `Ticket Cancelled - ${ticketNumber}`,
            greeting: "Hi,",
            intro: "We confirm that the following ticket has been cancelled:",
            ticketNumberLabel: "Ticket Number",
            eventLabel: "Event",
            reasonLabel: "Reason",
            refundLabel: "Refund Amount",
            refundNote:
                "The refund will be processed within 5-10 business days.",
            noRefund: "No refund is applicable for this cancellation.",
            contactNote:
                "Have questions? Please contact us.",
        },
    },
} as const;

function t(locale: EmailLocale) {
    return translations[locale] || translations.nb;
}

function formatCurrency(amount: number, currency: string = "NOK"): string {
    return `${amount.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Order confirmation email.
 * Sent when an order is confirmed (all payments completed).
 */
export function orderConfirmationEmail(
    input: OrderConfirmationInput
): { subject: string; html: string } {
    const locale = input.locale ?? "nb";
    const i = t(locale).orderConfirmation;
    const currency = input.currency ?? "NOK";

    const itemRows = input.items
        .map(
            (item) => `
            <tr>
                <td style="padding:8px 12px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">${item.name}</td>
                <td style="padding:8px 12px;font-size:14px;color:#666;text-align:center;border-bottom:1px solid #f0f0f0;">${item.quantity}</td>
                <td style="padding:8px 12px;font-size:14px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0;">${formatCurrency(item.unitPrice * item.quantity, currency)}</td>
            </tr>`
        )
        .join("");

    const html = `
        <p style="margin:0 0 16px;font-size:15px;color:#333;">${i.greeting(input.customerName)}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;">${i.intro}</p>

        ${bookingDetailsCard({
            items: [{ label: i.orderNumberLabel, value: input.orderNumber }],
        })}

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
            <thead>
                <tr>
                    <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:left;border-bottom:2px solid #e8e8e8;">${i.itemsHeader}</th>
                    <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:center;border-bottom:2px solid #e8e8e8;">${i.quantityLabel}</th>
                    <th style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;text-align:right;border-bottom:2px solid #e8e8e8;">${i.priceLabel}</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <tr>
                    <td colspan="2" style="padding:12px;font-size:15px;font-weight:700;color:#333;text-align:right;border-top:2px solid #e8e8e8;">${i.totalLabel}</td>
                    <td style="padding:12px;font-size:15px;font-weight:700;color:#333;text-align:right;border-top:2px solid #e8e8e8;">${formatCurrency(input.total, currency)}</td>
                </tr>
            </tbody>
        </table>

        ${noticeBox({ text: i.ticketsReady, type: "info" })}

        <p style="margin:24px 0 0;font-size:13px;color:#999;">${i.contactNote}</p>
    `;

    return {
        subject: i.subject(input.orderNumber),
        html,
    };
}

/**
 * Ticket issued email.
 * Sent when tickets are generated for a confirmed order.
 */
export function ticketIssuedEmail(
    input: TicketIssuedInput
): { subject: string; html: string } {
    const locale = input.locale ?? "nb";
    const i = t(locale).ticketIssued;

    const detailItems: Array<{ label: string; value: string }> = [
        { label: i.eventLabel, value: input.eventName },
        { label: i.dateLabel, value: input.date },
    ];

    if (input.startTime) {
        detailItems.push({ label: i.timeLabel, value: input.startTime });
    }

    detailItems.push({ label: i.venueLabel, value: input.venue });
    detailItems.push({ label: i.ticketNumberLabel, value: input.ticketNumber });

    if (input.ticketTypeName) {
        detailItems.push({ label: i.ticketTypeLabel, value: input.ticketTypeName });
    }

    detailItems.push({ label: i.barcodeLabel, value: input.barcode });

    const cta = input.ticketUrl
        ? ctaButton({ text: i.viewTicket, url: input.ticketUrl })
        : "";

    const html = `
        <p style="margin:0 0 16px;font-size:15px;color:#333;">${i.greeting(input.ownerName ?? "")}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;">${i.intro}</p>

        ${bookingDetailsCard({ items: detailItems })}

        ${noticeBox({ text: i.barcodeNote, type: "info" })}

        ${cta}

        <p style="margin:24px 0 0;font-size:15px;color:#555;">${i.enjoyNote}</p>
    `;

    return {
        subject: i.subject(input.eventName),
        html,
    };
}

/**
 * Event reminder email.
 * Sent 24 hours before a performance to all ticket holders.
 */
export function eventReminderEmail(
    input: EventReminderInput
): { subject: string; html: string } {
    const locale = input.locale ?? "nb";
    const i = t(locale).eventReminder;

    const detailItems: Array<{ label: string; value: string }> = [
        { label: i.eventLabel, value: input.eventName },
        { label: i.dateLabel, value: input.date },
    ];

    if (input.startTime) {
        detailItems.push({ label: i.timeLabel, value: input.startTime });
    }

    if (input.doorsOpen) {
        detailItems.push({ label: i.doorsOpenLabel, value: input.doorsOpen });
    }

    detailItems.push({ label: i.venueLabel, value: input.venue });
    detailItems.push({
        label: i.ticketCountLabel,
        value: String(input.ticketCount),
    });

    const cta = input.eventUrl
        ? ctaButton({ text: i.viewEvent, url: input.eventUrl })
        : "";

    const html = `
        <p style="margin:0 0 16px;font-size:15px;color:#333;">${i.greeting}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;">${i.intro(input.eventName)}</p>

        ${bookingDetailsCard({ items: detailItems })}

        ${noticeBox({ text: i.rememberTickets, type: "info" })}

        ${cta}

        <p style="margin:24px 0 0;font-size:15px;color:#555;">${i.lookForward}</p>
    `;

    return {
        subject: i.subject(input.eventName),
        html,
    };
}

/**
 * Ticket cancelled email.
 * Sent when a ticket is cancelled (by user, admin, or system).
 */
export function ticketCancelledEmail(
    input: TicketCancelledInput
): { subject: string; html: string } {
    const locale = input.locale ?? "nb";
    const i = t(locale).ticketCancelled;
    const currency = input.currency ?? "NOK";

    const detailItems: Array<{ label: string; value: string }> = [
        { label: i.ticketNumberLabel, value: input.ticketNumber },
        { label: i.eventLabel, value: input.eventName },
    ];

    if (input.reason) {
        detailItems.push({ label: i.reasonLabel, value: input.reason });
    }

    const refundHtml =
        input.refundAmount !== undefined && input.refundAmount > 0
            ? `
        ${bookingDetailsCard({
            items: [
                ...detailItems,
                {
                    label: i.refundLabel,
                    value: formatCurrency(input.refundAmount, currency),
                },
            ],
        })}
        ${noticeBox({ text: i.refundNote, type: "info" })}
    `
            : `
        ${bookingDetailsCard({ items: detailItems })}
        ${noticeBox({ text: i.noRefund, type: "warning" })}
    `;

    const html = `
        <p style="margin:0 0 16px;font-size:15px;color:#333;">${i.greeting}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;">${i.intro}</p>

        ${refundHtml}

        <p style="margin:24px 0 0;font-size:13px;color:#999;">${i.contactNote}</p>
    `;

    return {
        subject: i.subject(input.ticketNumber),
        html,
    };
}
