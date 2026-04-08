/**
 * Naming convention utilities.
 */

/** "ReviewMod" or "review_mod" -> "review-mod" */
export function toKebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/** "review-mod" -> "reviewMod" */
export function toCamel(name: string): string {
  return toKebab(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** "review-mod" -> "ReviewMod" */
export function toPascal(name: string): string {
  const camel = toCamel(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** "review-mod" -> "review_mod" */
export function toSnake(name: string): string {
  return toKebab(name).replace(/-/g, '_');
}

/** "review-mod" -> "Review Mod" */
export function toTitle(name: string): string {
  return toKebab(name)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Simple English pluralization */
export function pluralize(name: string): string {
  if (name.endsWith('s') || name.endsWith('x') || name.endsWith('z') || name.endsWith('sh') || name.endsWith('ch')) {
    return name + 'es';
  }
  if (name.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(name.charAt(name.length - 2))) {
    return name.slice(0, -1) + 'ies';
  }
  return name + 's';
}

/** Simple de-pluralization */
export function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses') || name.endsWith('xes') || name.endsWith('zes') || name.endsWith('shes') || name.endsWith('ches')) {
    return name.slice(0, -2);
  }
  if (name.endsWith('s') && !name.endsWith('ss')) return name.slice(0, -1);
  return name;
}
