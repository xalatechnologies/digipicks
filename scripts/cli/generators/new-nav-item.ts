/**
 * Generator: xala new nav-item <app> <name>
 *
 * Prints exact code to add a navigation item to the sidebar.
 */

import { printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, choose } from '../lib/prompts';
import { toKebab, toTitle } from '../lib/naming';
import { APPS, ROLES } from '../lib/constants';

const ICONS = [
  'home', 'building', 'calendar', 'bookOpen', 'clock', 'chart',
  'creditCard', 'users', 'settings', 'message', 'search', 'shield',
  'checkCircle', 'ticket', 'shoppingCart', 'repeat', 'fileText', 'headset',
  'sparkles', 'organization',
] as const;

export async function newNavItem(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New Navigation Item');

  const app = (args[0] as string) || (await choose('Which app?', ['backoffice', 'minside']));
  if (app !== 'backoffice' && app !== 'minside') {
    console.error('Only backoffice and minside have sidebar navigation.');
    process.exit(1);
  }

  const id = toKebab(args[1] || (await ask('Nav item ID (kebab-case, e.g. "waitlists")')));
  const href = await ask('Route path', `/${id}`);
  const icon = await choose('Icon?', [...ICONS]);
  const labelNb = await ask('Norwegian label', toTitle(id));
  const labelEn = await ask('English label', toTitle(id));
  const description = await ask('Description (Norwegian)', '');
  const nameKey = `${app === 'backoffice' ? 'backoffice.nav' : 'minside'}.${id.replace(/-/g, '')}`;
  const module = await ask('Feature module (or empty for none)', '');

  let rolesStr = '';
  if (app === 'backoffice') {
    const rolesInput = await ask('Roles (comma-separated: admin,case_handler,arranger,user)', 'admin');
    const roles = rolesInput.split(',').map((r) => r.trim()).filter(Boolean);
    rolesStr = `, roles: [${roles.map((r) => `'${r}'`).join(', ')}]`;
  }

  let contextsStr = '';
  if (app === 'minside') {
    const contextsInput = await ask('Contexts (comma-separated: personal,organization)', 'personal');
    const contexts = contextsInput.split(',').map((c) => c.trim()).filter(Boolean);
    contextsStr = `, contexts: [${contexts.map((c) => `'${c}'`).join(', ')}]`;
  }

  const moduleStr = module ? `, module: '${module}'` : '';

  const navItemCode = `{ id: '${id}', nameKey: '${nameKey}', description: '${description}', href: '${href}', icon: '${icon}'${rolesStr}${contextsStr}${moduleStr} },`;

  printManualStep(
    `Add to DASHBOARD_NAV_CONFIG.${app}.sections[N].items in packages/shared/src/navigation.ts:`,
    navItemCode,
  );

  printManualStep(
    'Add i18n key to packages/i18n/locales/nb.json:',
    `"${nameKey}": "${labelNb}"`,
  );

  printManualStep(
    'Add i18n key to packages/i18n/locales/en.json:',
    `"${nameKey}": "${labelEn}"`,
  );

  printSuccess(`Navigation item "${id}" ready to add.`);
}
