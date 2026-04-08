/**
 * Platform Admin Email Templates
 *
 * Pre-rendered HTML email templates for admin actions:
 *   - Account suspended
 *   - Account activated
 *   - Account terminated (abonnement avsluttet)
 *   - Account deleted
 *   - User invited
 *   - Application submitted (owner application)
 *   - Application approved
 *   - Application rejected
 *
 * Each function returns { subject, html } — wrap with wrapInEmailLayout()
 * from convex/email/baseLayout.ts before sending.
 */

import { ctaButton, noticeBox } from "../email/baseLayout";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:5180";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@example.com";
const PLATFORM_NAME = process.env.PLATFORM_NAME || "Xala";

// =============================================================================
// TYPES
// =============================================================================

interface AdminActionInput {
    recipientName: string;
    tenantName?: string;
    reason?: string;
    dashboardUrl?: string;
}

interface InviteUserInput {
    recipientName: string;
    recipientEmail: string;
    inviterName?: string;
    role: string;
    tenantName?: string;
    loginUrl?: string;
}

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Account suspended — sent to tenant owner when their account is suspended.
 */
export function accountSuspendedEmail(input: AdminActionInput): { subject: string; html: string } {
    const { recipientName, tenantName, reason, dashboardUrl = DASHBOARD_URL } = input;

    const subject = `Kontoen din er midlertidig suspendert — ${tenantName || PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Kontoen din er suspendert</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Vi informerer om at kontoen din${tenantName ? ` for <strong>${tenantName}</strong>` : ""}
            har blitt midlertidig suspendert av plattformadministrator.
        </p>
        ${reason ? noticeBox({ type: "warning", text: `Grunn: ${reason}` }) : ""}
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Mens kontoen er suspendert:
        </p>
        <ul style="margin:0 0 16px; padding-left:20px; color:#444; font-size:15px; line-height:1.8;">
            <li>Du har ikke tilgang til kontrollpanelet</li>
            <li>Dine lokaler og annonser er skjult fra søkeresultater</li>
            <li>Eksisterende bookinger er ikke påvirket</li>
        </ul>
        ${noticeBox({ type: "info", text: `Ta kontakt med oss på ${SUPPORT_EMAIL} dersom du har spørsmål.` })}
        ${ctaButton({ text: "Kontakt support", url: `mailto:${SUPPORT_EMAIL}`, color: "#1C362D" })}
    `;

    return { subject, html };
}

/**
 * Account activated — sent when a suspended account is reactivated.
 */
export function accountActivatedEmail(input: AdminActionInput): { subject: string; html: string } {
    const { recipientName, tenantName, dashboardUrl = DASHBOARD_URL } = input;

    const subject = `Kontoen din er aktivert igjen — ${tenantName || PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Kontoen din er aktiv igjen</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Kontoen din${tenantName ? ` for <strong>${tenantName}</strong>` : ""}
            har blitt aktivert igjen. Du har nå full tilgang til plattformen.
        </p>
        ${noticeBox({ type: "success", text: "Dine lokaler er synlige igjen og nye bookinger kan mottas." })}
        ${ctaButton({ text: "Gå til kontrollpanelet", url: dashboardUrl, color: "#1C362D" })}
    `;

    return { subject, html };
}

/**
 * Account terminated — sent when the subscription is ended (avslutt abonnement).
 */
export function accountTerminatedEmail(input: AdminActionInput): { subject: string; html: string } {
    const { recipientName, tenantName, reason } = input;

    const subject = `Abonnementet ditt er avsluttet — ${tenantName || PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Abonnementet er avsluttet</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Abonnementet${tenantName ? ` for <strong>${tenantName}</strong>` : ""}
            har blitt avsluttet.
        </p>
        ${reason ? noticeBox({ type: "warning", text: `Grunn: ${reason}` }) : ""}
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hva dette betyr:
        </p>
        <ul style="margin:0 0 16px; padding-left:20px; color:#444; font-size:15px; line-height:1.8;">
            <li>Alle lokaler og annonser er arkivert</li>
            <li>Eksisterende data beholdes i 90 dager</li>
            <li>Du kan kontakte oss for å reaktivere</li>
        </ul>
        ${noticeBox({ type: "info", text: `Vi takker for samarbeidet. Kontakt ${SUPPORT_EMAIL} ved spørsmål.` })}
    `;

    return { subject, html };
}

/**
 * Account deleted — sent when an account is permanently deleted.
 */
export function accountDeletedEmail(input: AdminActionInput): { subject: string; html: string } {
    const { recipientName, tenantName } = input;

    const subject = `Kontoen din er slettet — ${tenantName || PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Kontoen er slettet</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Kontoen din${tenantName ? ` for <strong>${tenantName}</strong>` : ""}
            har blitt permanent slettet fra plattformen.
        </p>
        ${noticeBox({ type: "error", text: "All data knyttet til kontoen er fjernet permanent. Denne handlingen kan ikke angres." })}
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Dersom du mener dette er en feil, ta kontakt med oss umiddelbart pa
            <a href="mailto:${SUPPORT_EMAIL}" style="color:#1C362D; font-weight:600;">${SUPPORT_EMAIL}</a>.
        </p>
    `;

    return { subject, html };
}

/**
 * User invited — sent when a platform admin invites a new user.
 */
export function userInvitedEmail(input: InviteUserInput): { subject: string; html: string } {
    const { recipientName, recipientEmail, inviterName, role, tenantName, loginUrl = `${DASHBOARD_URL}/login` } = input;

    const roleLabels: Record<string, string> = {
        user: "Bruker",
        owner: "Eier",
        admin: "Admin",
        super_admin: "Plattformadmin",
    };
    const roleLabel = roleLabels[role] || role;

    const subject = `Du er invitert til ${PLATFORM_NAME}${tenantName ? ` — ${tenantName}` : ""}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Velkommen til ${PLATFORM_NAME}</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei${recipientName ? ` ${recipientName}` : ""},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            ${inviterName ? `<strong>${inviterName}</strong> har` : "Du har blitt"}
            invitert deg til ${PLATFORM_NAME}${tenantName ? ` som del av <strong>${tenantName}</strong>` : ""}.
        </p>
        <table style="width:100%; border-collapse:collapse; margin:0 0 20px;">
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; color:#888; font-size:14px; width:100px;">Rolle</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:14px; font-weight:600;">${roleLabel}</td>
            </tr>
            <tr>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; color:#888; font-size:14px;">E-post</td>
                <td style="padding:8px 12px; border-bottom:1px solid #eee; font-size:14px;">${recipientEmail}</td>
            </tr>
        </table>
        ${ctaButton({ text: "Logg inn og kom i gang", url: loginUrl, color: "#1C362D" })}
        <p style="margin:16px 0 0; color:#888; font-size:13px;">
            Dersom du ikke forventet denne invitasjonen, kan du se bort fra denne e-posten.
        </p>
    `;

    return { subject, html };
}

/**
 * User suspended — sent when a user account is suspended by admin.
 */
export function userSuspendedEmail(input: AdminActionInput): { subject: string; html: string } {
    const { recipientName, reason } = input;

    const subject = `Brukerkontoen din er suspendert — ${PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Brukerkontoen din er suspendert</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Brukerkontoen din har blitt midlertidig suspendert av en administrator.
        </p>
        ${reason ? noticeBox({ type: "warning", text: `Grunn: ${reason}` }) : ""}
        ${noticeBox({ type: "info", text: `Kontakt ${SUPPORT_EMAIL} dersom du har spørsmål.` })}
    `;

    return { subject, html };
}

// =============================================================================
// OWNER APPLICATION TEMPLATES
// =============================================================================

/**
 * Application submitted — sent to the applicant when their owner application is received.
 */
export function applicationSubmittedEmail(input: {
    recipientName: string;
    tenantName: string;
    planLabel: string;
}): { subject: string; html: string } {
    const { recipientName, tenantName, planLabel } = input;

    const subject = `Vi har mottatt søknaden din — ${PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Søknad mottatt</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Takk for at du har søkt om å bli partner. Vi har mottatt søknaden
            for <strong>${tenantName}</strong> med partnernivå <strong>${planLabel}</strong>.
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Vi behandler søknaden innen 1–2 virkedager. Du vil motta en e-post når søknaden er behandlet.
        </p>
        ${noticeBox({ type: "info", text: `Har du spørsmål i mellomtiden? Ta kontakt på ${SUPPORT_EMAIL}.` })}
    `;

    return { subject, html };
}

/**
 * Application approved — sent to the applicant when their owner application is approved.
 */
export function applicationApprovedEmail(input: {
    recipientName: string;
    tenantName: string;
    dashboardUrl?: string;
}): { subject: string; html: string } {
    const { recipientName, tenantName, dashboardUrl = DASHBOARD_URL } = input;

    const subject = `Velkommen! Søknaden din er godkjent — ${PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Søknaden er godkjent!</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Gratulerer! Søknaden for <strong>${tenantName}</strong> er godkjent.
            Du kan nå logge inn og begynne å legge inn dine lokaler.
        </p>
        ${noticeBox({ type: "success", text: "Kontoen din er klar til bruk. Velkommen som partner!" })}
        ${ctaButton({ text: "Gå til kontrollpanelet", url: dashboardUrl, color: "#1C362D" })}
    `;

    return { subject, html };
}

/**
 * Application rejected — sent to the applicant when their owner application is rejected.
 */
export function applicationRejectedEmail(input: {
    recipientName: string;
    tenantName: string;
    reason?: string;
}): { subject: string; html: string } {
    const { recipientName, tenantName, reason } = input;

    const subject = `Oppdatering om søknaden din — ${PLATFORM_NAME}`;

    const html = `
        <h2 style="margin:0 0 8px; font-size:20px; color:#1C362D;">Oppdatering om søknaden</h2>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Hei ${recipientName},
        </p>
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Vi har dessverre ikke kunnet godkjenne søknaden for <strong>${tenantName}</strong>
            på dette tidspunktet.
        </p>
        ${reason ? noticeBox({ type: "warning", text: `Begrunnelse: ${reason}` }) : ""}
        <p style="margin:0 0 16px; color:#444; font-size:15px; line-height:1.6;">
            Du kan sende en ny søknad dersom forholdene endrer seg. Ta gjerne kontakt med oss
            på <a href="mailto:${SUPPORT_EMAIL}" style="color:#1C362D; font-weight:600;">${SUPPORT_EMAIL}</a>
            dersom du har spørsmål.
        </p>
    `;

    return { subject, html };
}
