/**
 * Professional HTML Email Base Layout
 *
 * Table-based responsive email wrapper compatible with all major email clients
 * (Gmail, Outlook, Apple Mail, Yahoo). Uses inline styles for maximum compatibility.
 *
 * The template system stores only the body content — this layout wraps it
 * with branded header, container, and footer.
 */

export interface EmailLayoutOptions {
    body: string;
    subject: string;
    preheader?: string;
    tenantName?: string;
    tenantUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    footerText?: string;
    year?: number;
}

const DEFAULT_PRIMARY = "#1C362D";
const DEFAULT_ACCENT = "#E2B76D";

export function wrapInEmailLayout(options: EmailLayoutOptions): string {
    const {
        body,
        preheader,
        tenantName = process.env.PLATFORM_NAME || "Platform",
        tenantUrl = process.env.WEB_APP_URL || "http://localhost:5190",
        primaryColor = DEFAULT_PRIMARY,
        accentColor = DEFAULT_ACCENT,
        logoUrl,
        footerText,
        year = new Date().getFullYear(),
    } = options;

    const preheaderHtml = preheader
        ? `<div style="display:none;font-size:1px;color:#f5f5f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
        : "";

    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${tenantName}" width="160" style="display:block;margin:0 auto;max-width:160px;height:auto;" />`
        : `<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">${tenantName}</span>`;

    return `<!DOCTYPE html>
<html lang="nb" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${options.subject}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
        /* Responsive */
        @media only screen and (max-width: 620px) {
            .email-container { width: 100% !important; max-width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .mobile-stack { display: block !important; width: 100% !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    ${preheaderHtml}

    <!-- Outer wrapper -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f0f0f0;">
        <tr>
            <td align="center" style="padding:24px 12px;">

                <!-- Email container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width:600px;width:100%;margin:0 auto;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color:${primaryColor};padding:28px 40px;text-align:center;border-radius:12px 12px 0 0;" class="mobile-padding">
                            ${logoHtml}
                        </td>
                    </tr>

                    <!-- Accent bar -->
                    <tr>
                        <td style="background-color:${accentColor};height:4px;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="background-color:#ffffff;padding:40px 40px 32px;font-size:15px;line-height:1.6;color:#333333;" class="mobile-padding">
                            ${body}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e8e8e8;border-radius:0 0 12px 12px;" class="mobile-padding">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="font-size:12px;line-height:1.5;color:#999999;text-align:center;">
                                        ${footerText ? `<p style="margin:0 0 8px;">${footerText}</p>` : ""}
                                        <p style="margin:0 0 4px;">
                                            <a href="${tenantUrl}" style="color:${primaryColor};text-decoration:none;font-weight:500;">${tenantName}</a>
                                        </p>
                                        <p style="margin:0;color:#bbbbbb;font-size:11px;">
                                            &copy; ${year} ${tenantName}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End email container -->

            </td>
        </tr>
    </table>
    <!-- End outer wrapper -->
</body>
</html>`;
}

/**
 * Build a styled detail card for booking information.
 * Used inside email body content to present booking details consistently.
 */
export function bookingDetailsCard(details: {
    items: Array<{ label: string; value: string }>;
    accentColor?: string;
}): string {
    const accent = details.accentColor || DEFAULT_ACCENT;
    const rows = details.items
        .map(
            (item) => `
                <tr>
                    <td style="padding:8px 16px;font-size:13px;color:#888888;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f0f0f0;">${item.label}</td>
                    <td style="padding:8px 16px;font-size:14px;color:#333333;font-weight:500;border-bottom:1px solid #f0f0f0;">${item.value}</td>
                </tr>`
        )
        .join("");

    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#fafafa;border-radius:8px;border-left:4px solid ${accent};margin:20px 0;">
            ${rows}
        </table>`;
}

/**
 * Build a styled notice/alert box.
 */
export function noticeBox(options: {
    text: string;
    type?: "info" | "warning" | "success" | "error";
}): string {
    const colors = {
        info: { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF" },
        warning: { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E" },
        success: { bg: "#F0FDF4", border: "#22C55E", text: "#166534" },
        error: { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B" },
    };
    const c = colors[options.type || "info"];

    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
            <tr>
                <td style="background-color:${c.bg};border-left:4px solid ${c.border};border-radius:6px;padding:14px 18px;font-size:14px;line-height:1.5;color:${c.text};">
                    ${options.text}
                </td>
            </tr>
        </table>`;
}

/**
 * A styled CTA button for emails.
 */
export function ctaButton(options: {
    text: string;
    url: string;
    color?: string;
}): string {
    const color = options.color || DEFAULT_PRIMARY;
    return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
            <tr>
                <td style="border-radius:8px;background-color:${color};">
                    <a href="${options.url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        ${options.text}
                    </a>
                </td>
            </tr>
        </table>`;
}
