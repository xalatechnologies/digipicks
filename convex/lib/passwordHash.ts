/**
 * Password Hashing — PBKDF2 with SHA-512
 *
 * Production-grade password hashing following platform security standards.
 * Uses PBKDF2 with 600,000 iterations (OWASP/NIST 2026 recommendation).
 *
 * Storage format: `iterations:salt:hash` (all base64-encoded)
 */

/**
 * Hash a password using PBKDF2-SHA512.
 * Returns a storable string in format: `iterations:salt:hash`
 */
export async function hashPassword(password: string): Promise<string> {
    const iterations = 600_000;
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: saltBytes,
            iterations,
            hash: "SHA-512",
        },
        keyMaterial,
        512 // 64 bytes
    );

    const hashBytes = new Uint8Array(derivedBits);
    const salt64 = uint8ToBase64(saltBytes);
    const hash64 = uint8ToBase64(hashBytes);

    return `${iterations}:${salt64}:${hash64}`;
}

/**
 * Verify a password against a stored hash string.
 * Returns true if the password matches.
 */
export async function verifyPassword(
    password: string,
    storedHash: string
): Promise<boolean> {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;

    const [iterStr, salt64, hash64] = parts;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || iterations < 1) return false;

    const saltBytes = base64ToUint8(salt64);
    const expectedHash = base64ToUint8(hash64);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: saltBytes as unknown as BufferSource,
            iterations,
            hash: "SHA-512",
        },
        keyMaterial,
        expectedHash.length * 8
    );

    const computedHash = new Uint8Array(derivedBits);

    // Constant-time comparison to prevent timing attacks
    if (computedHash.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computedHash.length; i++) {
        diff |= computedHash[i] ^ expectedHash[i];
    }
    return diff === 0;
}

// =============================================================================
// Base64 Helpers (works in Convex runtime which has no Buffer)
// =============================================================================

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
