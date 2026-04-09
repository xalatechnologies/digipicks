/**
 * useCreatorBranding — Inject creator-level brand CSS into the document head.
 *
 * Reads the creator's brand CSS from the public getCreatorThemeCSS query
 * and injects it as a <style> tag. Cleans up on unmount or creator change.
 * This layer sits on top of tenant branding to allow per-creator white-labeling.
 *
 * @example
 * function CreatorProfilePage() {
 *   useCreatorBranding(tenantId, creatorId);
 *   return <Layout />;
 * }
 */

import { useEffect } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../convex-api";

const STYLE_ELEMENT_ID = "creator-branding";

/**
 * Inject creator brand CSS custom properties into the document head.
 * The CSS is generated server-side by the getCreatorThemeCSS query.
 *
 * @param tenantId - The resolved tenant ID (string). Pass undefined to skip.
 * @param creatorId - The creator ID (string). Pass undefined to skip.
 */
export function useCreatorBranding(
    tenantId: string | undefined,
    creatorId: string | undefined
): void {
    const themeCSS = useConvexQuery(
        api.tenants.index.getCreatorThemeCSS,
        tenantId && creatorId ? { tenantId, creatorId } : "skip"
    );

    useEffect(() => {
        if (!themeCSS || themeCSS === ":root {\n}") return;

        let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = STYLE_ELEMENT_ID;
            styleEl.setAttribute("data-creator-branding", "true");
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = themeCSS;

        return () => {
            const el = document.getElementById(STYLE_ELEMENT_ID);
            if (el) el.remove();
        };
    }, [themeCSS]);
}
