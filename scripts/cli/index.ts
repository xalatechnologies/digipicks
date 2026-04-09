#!/usr/bin/env tsx
/**
 * DigilistSaaS CLI Scaffolding Tool
 *
 * Usage:
 *   pnpm xala new app <name>              — Scaffold a new thin app
 *   pnpm xala new route <app> <path>      — Add a route/page to an app
 *   pnpm xala new component <name>        — Add a DS component
 *   pnpm xala new convex-component <name> — Add a Convex component (schema + functions + contract)
 *   pnpm xala new facade <name>           — Add a domain facade
 *   pnpm xala new hook <name>             — Add SDK hooks
 *   pnpm xala new nav-item <app> <name>   — Add a navigation item
 *
 * Flags:
 *   --dry-run    Preview files without writing
 *   --help       Show usage
 */

import { parseFlags, closeRL } from './lib/prompts';
import { newApp } from './generators/new-app';
import { newRoute } from './generators/new-route';
import { newComponent } from './generators/new-component';
import { newConvexComponent } from './generators/new-convex-component';
import { newFacade } from './generators/new-facade';
import { newHook } from './generators/new-hook';
import { newNavItem } from './generators/new-nav-item';

const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const GENERATORS: Record<string, (args: string[], flags: Record<string, string | boolean>) => Promise<void>> = {
  app: newApp,
  route: newRoute,
  component: newComponent,
  'convex-component': newConvexComponent,
  facade: newFacade,
  hook: newHook,
  'nav-item': newNavItem,
};

function printUsage(): void {
  console.log(`
${BOLD}${CYAN}xala${RESET} — DigilistSaaS CLI Scaffolding Tool

${BOLD}Usage:${RESET}
  pnpm xala new <generator> [args...] [--dry-run]

${BOLD}Generators:${RESET}
  ${CYAN}app${RESET} <name>                  Scaffold a new thin app (provider chain, routing, layout)
  ${CYAN}route${RESET} <app> <path>           Add a route page (list, detail, or form)
  ${CYAN}component${RESET} <name>             Add a @digipicks/ds component (primitives/composed/blocks)
  ${CYAN}convex-component${RESET} <name>      Add a Convex component (schema, functions, contract)
  ${CYAN}facade${RESET} <name>                Add a domain facade (delegates to component)
  ${CYAN}hook${RESET} <name>                  Add SDK hooks (query + mutation wrappers)
  ${CYAN}nav-item${RESET} <app> <name>        Add a sidebar navigation item

${BOLD}Flags:${RESET}
  --dry-run                     Preview generated files without writing
  --help                        Show this help message

${BOLD}Examples:${RESET}
  ${DIM}pnpm xala new app kiosk${RESET}
  ${DIM}pnpm xala new route backoffice invoices list${RESET}
  ${DIM}pnpm xala new convex-component waitlists${RESET}
  ${DIM}pnpm xala new facade waitlists${RESET}
  ${DIM}pnpm xala new hook waitlists${RESET}
  ${DIM}pnpm xala new component StatusDot${RESET}
  ${DIM}pnpm xala new nav-item backoffice waitlists${RESET}
  ${DIM}pnpm xala new route backoffice invoices list --dry-run${RESET}

${BOLD}Full stack scaffold:${RESET}
  ${DIM}pnpm xala new convex-component waitlists   # Backend component${RESET}
  ${DIM}pnpm xala new facade waitlists              # Domain facade${RESET}
  ${DIM}pnpm xala new hook waitlists                # SDK hooks${RESET}
  ${DIM}pnpm xala new route backoffice waitlists    # UI page${RESET}
  ${DIM}pnpm xala new nav-item backoffice waitlists # Sidebar link${RESET}
`);
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const { positional, flags } = parseFlags(rawArgs);

  if (flags.help || positional.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = positional[0];
  if (command !== 'new') {
    console.error(`Unknown command: "${command}". Use "pnpm xala new <generator>".`);
    printUsage();
    process.exit(1);
  }

  const generatorName = positional[1];
  if (!generatorName || !GENERATORS[generatorName]) {
    console.error(`Unknown generator: "${generatorName}". Available: ${Object.keys(GENERATORS).join(', ')}`);
    printUsage();
    process.exit(1);
  }

  const generator = GENERATORS[generatorName];
  const generatorArgs = positional.slice(2);

  try {
    await generator(generatorArgs, flags);
  } catch (err) {
    if (err instanceof Error && err.message.includes('readline was closed')) {
      // User cancelled with Ctrl+C
      console.log('\nCancelled.');
      process.exit(0);
    }
    throw err;
  } finally {
    closeRL();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
