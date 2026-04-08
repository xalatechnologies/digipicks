/**
 * Interactive prompts using Node's readline (no external deps).
 */

import * as readline from 'node:readline';

let rl: readline.Interface | null = null;

function getRL(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
}

export function closeRL(): void {
  rl?.close();
  rl = null;
}

/** Ask a question, return the answer (or defaultValue if empty) */
export function ask(question: string, defaultValue?: string): Promise<string> {
  const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
  return new Promise((resolve) => {
    getRL().question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/** Ask user to pick from a list of options */
export async function choose(question: string, options: string[]): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  const answer = await ask('Choose', '1');
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) return options[idx];
  return options[0];
}

/** Yes/no confirmation */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await ask(`${question} ${hint}`);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

/** Parse CLI flags from argv */
export function parseFlags(argv: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}
