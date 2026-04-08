/**
 * Vite environment variable types
 * Declared without vite/client reference for standalone SDK builds
 */

interface ImportMetaEnv {
    readonly VITE_CONVEX_URL: string;
    readonly VITE_TENANT_ID: string;
    [key: string]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
