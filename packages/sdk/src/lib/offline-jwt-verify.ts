/**
 * Offline JWT Verification — Browser-side ECDSA P-256 JWT verify.
 *
 * Uses Web Crypto API (crypto.subtle), available in modern browsers.
 * Mirrors the server-side verify in convex/lib/ticketCrypto.ts.
 */

// =============================================================================
// Helpers
// =============================================================================

function base64UrlDecode(str: string): Uint8Array {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const binary = atob(base64);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// =============================================================================
// Types
// =============================================================================

export interface TicketJwtPayload {
    /** Ticket ID */
    tid: string;
    /** Event resource ID */
    eid: string;
    /** Performance ID */
    pid: string;
    /** Barcode (DB lookup key) */
    bar: string;
    /** Barcode version */
    ver: number;
    /** Issued at (epoch seconds) */
    iat: number;
    /** Expires at (epoch seconds) */
    exp: number;
}

// =============================================================================
// Verification
// =============================================================================

/**
 * Verify a ticket JWT using the public key (browser-side, offline-capable).
 * Returns the decoded payload or throws on invalid/expired.
 */
export async function verifyTicketOffline(
    jwt: string,
    publicKeyJwk: string
): Promise<TicketJwtPayload> {
    const parts = jwt.split(".");
    if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify header
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerJson);
    if (header.alg !== "ES256") {
        throw new Error(`Unsupported algorithm: ${header.alg}`);
    }

    // Import public key
    const publicKey = await crypto.subtle.importKey(
        "jwk",
        JSON.parse(publicKeyJwk),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
    );

    // Verify signature
    const encoder = new TextEncoder();
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = base64UrlDecode(signatureB64);

    const sigBytes = new Uint8Array(signature);
    const dataBytes = new Uint8Array(encoder.encode(signingInput));
    const isValid = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        sigBytes,
        dataBytes
    );

    if (!isValid) {
        throw new Error("Invalid JWT signature");
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload: TicketJwtPayload = JSON.parse(payloadJson);

    // Check expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
        throw new Error("JWT expired");
    }

    return payload;
}
