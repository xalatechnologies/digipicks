/**
 * Template renderer with Handlebars-style variable substitution and conditionals.
 *
 * Supports:
 *   {{path.to.var}}              — Variable replacement (nested paths)
 *   {{#if path.to.var}}...{{/if}} — Conditional blocks (truthy check)
 *   {{{rawHtml}}}                — Raw HTML insertion (no escaping)
 */

/**
 * Resolve a dotted path against a variables object.
 * Returns undefined if the path doesn't exist.
 */
function resolvePath(variables: Record<string, any>, path: string): any {
    const parts = path.split(".");
    let value: any = variables;
    for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return undefined;
    }
    return value;
}

/**
 * Check if a value is "truthy" for template conditionals.
 * Empty strings and "0" are falsy in our template system.
 */
function isTruthy(value: any): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

export function renderTemplate(
    template: string,
    variables: Record<string, any>
): string {
    let result = template;

    // 1. Process {{#if path}}...{{/if}} conditionals (supports nesting)
    //    Regex: non-greedy match for the innermost {{#if}}...{{/if}} pairs
    let maxIterations = 50;
    while (result.includes("{{#if ") && maxIterations-- > 0) {
        result = result.replace(
            /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/,
            (_match, path, content) => {
                const value = resolvePath(variables, path);
                return isTruthy(value) ? content : "";
            }
        );
    }

    // 2. Process {{{rawVar}}} — raw HTML output (triple braces, no escaping)
    result = result.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (_match, path) => {
        const value = resolvePath(variables, path);
        return value !== undefined ? String(value) : "";
    });

    // 3. Process {{var}} — regular variable replacement
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
        const value = resolvePath(variables, path);
        return value !== undefined ? String(value) : _match;
    });

    return result;
}
