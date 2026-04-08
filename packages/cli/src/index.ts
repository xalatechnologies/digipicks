#!/usr/bin/env node
/**
 * DigilistSaaS CLI — scaffolding, verification, and code generation.
 *
 * Usage:
 *   pnpm xala create:route dashboard invoices --role admin
 *   pnpm xala create:datatable-page dashboard gift-card --viewModes grid,list,table --columns name,status,amount
 *   pnpm xala create:crud-page dashboard subscription --stats
 *   pnpm xala verify dashboard
 */

import { Command } from 'commander';
import { createAppCommand } from './commands/create-app.js';
import { createRouteCommand } from './commands/create-route.js';
import { createDatatablePageCommand } from './commands/create-datatable-page.js';
import { createCrudPageCommand } from './commands/create-crud-page.js';
import { verifyCommand } from './commands/verify.js';

const program = new Command();

program
  .name('xala')
  .description('DigilistSaaS CLI — scaffolding, verification, and code generation')
  .version('0.1.0');

program.addCommand(createAppCommand());
program.addCommand(createRouteCommand());
program.addCommand(createDatatablePageCommand());
program.addCommand(createCrudPageCommand());
program.addCommand(verifyCommand());

program.parse();
