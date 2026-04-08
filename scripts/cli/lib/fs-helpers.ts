/**
 * File system helpers with dry-run support.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ANSI colors (no chalk dependency)
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

interface FileOp {
  relativePath: string;
  content: string;
  action: 'create' | 'append';
}

export class FileWriter {
  private ops: FileOp[] = [];

  constructor(
    private dryRun: boolean,
    private rootDir: string,
  ) {}

  /** Queue a file creation */
  create(relativePath: string, content: string): void {
    this.ops.push({ relativePath, content, action: 'create' });
  }

  /** Queue an append operation */
  append(relativePath: string, content: string): void {
    this.ops.push({ relativePath, content, action: 'append' });
  }

  /** Execute all queued operations */
  async execute(): Promise<void> {
    if (this.ops.length === 0) {
      console.log(`${YELLOW}No files to generate.${RESET}`);
      return;
    }

    console.log('');

    for (const op of this.ops) {
      const fullPath = path.join(this.rootDir, op.relativePath);

      if (this.dryRun) {
        const label = op.action === 'create' ? 'CREATE' : 'APPEND';
        console.log(`${YELLOW}[DRY-RUN]${RESET} ${label}: ${CYAN}${op.relativePath}${RESET}`);
        if (op.action === 'append') {
          console.log(`${DIM}${op.content}${RESET}`);
        }
        continue;
      }

      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (op.action === 'create') {
        if (fs.existsSync(fullPath)) {
          console.log(`${YELLOW}SKIP${RESET} (exists): ${op.relativePath}`);
          continue;
        }
        fs.writeFileSync(fullPath, op.content, 'utf-8');
        console.log(`${GREEN}CREATE${RESET}: ${CYAN}${op.relativePath}${RESET}`);
      } else {
        fs.appendFileSync(fullPath, op.content, 'utf-8');
        console.log(`${GREEN}APPEND${RESET}: ${CYAN}${op.relativePath}${RESET}`);
      }
    }
  }

  /** Print summary */
  printSummary(): void {
    const creates = this.ops.filter((o) => o.action === 'create').length;
    const appends = this.ops.filter((o) => o.action === 'append').length;
    console.log(`\n${BOLD}Summary:${RESET} ${creates} file(s) created, ${appends} file(s) modified`);
  }
}

/** Print a manual step instruction */
export function printManualStep(step: string, code?: string): void {
  console.log(`\n${YELLOW}Manual step:${RESET} ${step}`);
  if (code) {
    console.log(`${DIM}${code}${RESET}`);
  }
}

/** Print a success message */
export function printSuccess(message: string): void {
  console.log(`\n${GREEN}${BOLD}Done!${RESET} ${message}`);
}

/** Print a section header */
export function printHeader(title: string): void {
  console.log(`\n${BOLD}${CYAN}=== ${title} ===${RESET}`);
}
