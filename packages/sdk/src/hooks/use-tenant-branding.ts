/**
 * useTenantBranding — Inject tenant brand CSS into the document head.
 *
 * Reads the tenant's brand CSS from the public getThemeCSS query
 * and injects it as a <style> tag. Cleans up on unmount or tenant change.
 *
 * @example
 * function App() {
 *   useTenantBranding(tenantId);
 *   return <Layout />;
 * }
 */

import { useEffect } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";

const STYLE_ELEMENT_ID = "tenant-branding";

/**
 * Inject tenant brand CSS custom properties into the document head.
 * The CSS is generated server-side by the getThemeCSS query.
 *
 * @param tenantId - The resolved tenant ID (string). Pass undefined to skip.
 */
export function useTenantBranding(
    tenantId: string | undefined
): void {
    // Query the public wrapper for the tenant-config component's getThemeCSS
    const themeCSS = useConvexQuery(
        api.tenants.index.getThemeCSS,
        tenantId ? { tenantId } : "skip"
    );

    useEffect(() => {
        if (!themeCSS || themeCSS === ":root {\n}") return;

        // Find or create the style element
        let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = STYLE_ELEMENT_ID;
            styleEl.setAttribute("data-tenant-branding", "true");
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = themeCSS;

        return () => {
            // Clean up when tenant changes or component unmounts
            const el = document.getElementById(STYLE_ELEMENT_ID);
            if (el) el.remove();
        };
    }, [themeCSS]);
}
