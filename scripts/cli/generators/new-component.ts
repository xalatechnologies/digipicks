/**
 * Generator: xala new component <name>
 *
 * Creates a new @digipicks/ds design system component.
 */

import { FileWriter, printManualStep, printSuccess, printHeader } from '../lib/fs-helpers';
import { ask, choose, confirm } from '../lib/prompts';
import { toPascal, toKebab } from '../lib/naming';
import { DS_LEVELS, ROOT_DIR, type DSLevel } from '../lib/constants';

export async function newComponent(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  printHeader('New DS Component');

  const rawName = args[0] || (await ask('Component name (PascalCase, e.g. "StatusDot")'));
  const pascal = toPascal(rawName);
  const level = (await choose('Component level?', [...DS_LEVELS])) as DSLevel;
  const hasStyles = await confirm('Create CSS module?');
  const description = await ask('Brief description', `${pascal} component`);

  const dryRun = flags['dry-run'] === true;
  const writer = new FileWriter(dryRun, ROOT_DIR);

  const base = `packages/ds/src/${level}`;
  const cssImport = hasStyles ? `import styles from './${pascal}.module.css';` : '';
  const rootClass = hasStyles ? `className={styles.root}` : '';

  // Component file
  writer.create(
    `${base}/${pascal}.tsx`,
    `/**
 * ${pascal}
 *
 * ${description}
 */

import * as React from 'react';
${cssImport}

export interface ${pascal}Props {
    /** Content to render */
    children?: React.ReactNode;
    /** Additional CSS class */
    className?: string;
}

export function ${pascal}({ children, className, ...rest }: ${pascal}Props) {
    return (
        <div ${rootClass} {...rest}>
            {children}
        </div>
    );
}
`,
  );

  // CSS module
  if (hasStyles) {
    writer.create(
      `${base}/${pascal}.module.css`,
      `.root {
    /* Use --ds-* design tokens for all values */
}
`,
    );
  }

  // Append to level index.ts
  writer.append(
    `${base}/index.ts`,
    `\nexport { ${pascal} } from './${pascal}';\nexport type { ${pascal}Props } from './${pascal}';\n`,
  );

  await writer.execute();
  writer.printSummary();

  printManualStep(
    `Verify the re-export in packages/ds/src/index.ts.`,
    `The ${level}/index.ts is already re-exported via "export * from './${level}';" in the main index.`,
  );

  printSuccess(`DS component "${pascal}" created in ${level}/.`);
}
