/**
 * Ticket Crypto — ECDSA P-256 JWT signing for QR ticket verification.
 *
 * Uses Web Crypto API (crypto.subtle), which is available in the Convex runtime.
 * Pattern follows convex/billing/webhooks.ts and convex/domain/integrationDispatch.ts.
 *
 * JWT payload: { tid, eid, pid, bar, ver, iat, exp }
 *   tid = ticket ID, eid = event resource ID, pid = performance ID,
 *   bar = barcode (DB lookup key), ver = barcode version, iat = issued at, exp = expires at
 */

// =============================================================================
// Helpers
// =============================================================================

function base64UrlEncode(data: Uint8Array): string {
    const binary = Array.from(data)
        .map((b) => String.fromCharCode(b))
        .join("");
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const binary = atob(base64);
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// =============================================================================
// Key Generation
// =============================================================================

export interface JwkKeyPair {
    publicKeyJwk: string;
    privateKeyJwk: string;
}

/**
 * Generate an ECDSA P-256 key pair, exported as JWK strings.
 */
export async function generateKeyPair(): Promise<JwkKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true, // extractable
        ["sign", "verify"]
    );

    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
        publicKeyJwk: JSON.stringify(publicKeyJwk),
        privateKeyJwk: JSON.stringify(privateKeyJwk),
    };
}

// =============================================================================
// JWT Signing
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
    /** Barcode version (incremented on rotation) */
    ver: number;
    /** Issued at (epoch seconds) */
    iat: number;
    /** Expires at (epoch seconds) */
    exp: number;
}

/**
 * Sign a ticket JWT using the private key.
 * Returns the full JWT string (header.payload.signature).
 */
export async function signTicketJwt(
    privateKeyJwk: string,
    payload: TicketJwtPayload
): Promise<string> {
    const privateKey = await crypto.subtle.importKey(
        "jwk",
        JSON.parse(privateKeyJwk),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const header = { alg: "ES256", typ: "JWT" };
    const encoder = new TextEncoder();

    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const signingInput = `${headerB64}.${payloadB64}`;

    const signature = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        encoder.encode(signingInput)
    );

    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    return `${signingInput}.${signatureB64}`;
}

// =============================================================================
// JWT Verification
// =============================================================================

/**
 * Verify a ticket JWT using the public key.
 * Returns the decoded payload or throws on invalid signature/expired token.
 */
export async function verifyTicketJwt(
    publicKeyJwk: string,
    jwt: string
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
