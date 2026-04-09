import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * The verify command's check functions are not exported individually,
 * so we test them by reproducing the same logic on test fixtures.
 * This validates the patterns and regexes the verify command uses.
 */

// ---------- helpers to create temp files ----------

function createTempFile(content: string, ext = '.tsx'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-verify-'));
  const filePath = path.join(dir, `test${ext}`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ---------- NO_RAW_HTML patterns ----------

const RAW_HTML_TAGS = [
  '<button',
  '<input',
  '<select',
  '<textarea',
  '<table',
  '<h1',
  '<h2',
  '<h3',
  '<h4',
  '<h5',
  '<h6',
  '<p>',
];

function checkNoRawHtml(content: string): string[] {
  const violations: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    for (const tag of RAW_HTML_TAGS) {
      if (line.includes(tag) && !line.includes('// eslint-disable')) {
        violations.push(`Line ${i + 1}: raw HTML tag "${tag.replace('<', '')}"`);
      }
    }
  }
  return violations;
}

describe('NO_RAW_HTML policy', () => {
  it('detects raw <button> usage', () => {
    const v = checkNoRawHtml('<button onClick={handler}>Click</button>');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('button');
  });

  it('detects raw <input> usage', () => {
    const v = checkNoRawHtml('<input type="text" />');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('input');
  });

  it('detects raw <select> usage', () => {
    const v = checkNoRawHtml('<select><option>A</option></select>');
    expect(v).toHaveLength(1);
  });

  it('detects raw <table> usage', () => {
    const v = checkNoRawHtml('<table><tr><td>cell</td></tr></table>');
    expect(v).toHaveLength(1);
  });

  it('detects all heading levels', () => {
    const v = checkNoRawHtml('<h1>Title</h1>\n<h2>Sub</h2>\n<h3>Sub2</h3>');
    expect(v).toHaveLength(3);
  });

  it('detects raw <p> usage', () => {
    const v = checkNoRawHtml('<p>Some paragraph text</p>');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('p>');
  });

  it('ignores lines that are comments', () => {
    const v = checkNoRawHtml('// <button>commented out</button>');
    expect(v).toHaveLength(0);
  });

  it('ignores lines with eslint-disable', () => {
    const v = checkNoRawHtml('<button>ok</button> // eslint-disable');
    expect(v).toHaveLength(0);
  });

  it('passes for DS component usage', () => {
    const v = checkNoRawHtml('<Button onClick={handler}>Click</Button>');
    expect(v).toHaveLength(0);
  });
});

// ---------- DS_IMPORTS_ONLY patterns ----------

const FORBIDDEN_IMPORTS = ['@digdir/designsystemet-react', '@digdir/designsystemet-css', '@radix-ui/', '@mui/', 'antd'];

function checkDsImportsOnly(content: string): string[] {
  const violations: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.includes('import ')) continue;
    for (const lib of FORBIDDEN_IMPORTS) {
      if (line.includes(`'${lib}`) || line.includes(`"${lib}`)) {
        violations.push(`Direct import from "${lib}"`);
      }
    }
  }
  return violations;
}

describe('DS_IMPORTS_ONLY policy', () => {
  it('detects direct @digdir/designsystemet-react import', () => {
    const v = checkDsImportsOnly("import { Button } from '@digdir/designsystemet-react';");
    expect(v).toHaveLength(1);
  });

  it('detects direct @radix-ui import', () => {
    const v = checkDsImportsOnly("import * as Dialog from '@radix-ui/react-dialog';");
    expect(v).toHaveLength(1);
  });

  it('detects @mui import', () => {
    const v = checkDsImportsOnly("import { Button } from '@mui/material';");
    expect(v).toHaveLength(1);
  });

  it('detects antd import', () => {
    const v = checkDsImportsOnly("import { Table } from 'antd';");
    expect(v).toHaveLength(1);
  });

  it('passes for @digipicks/ds import', () => {
    const v = checkDsImportsOnly("import { Button } from '@digipicks/ds';");
    expect(v).toHaveLength(0);
  });
});

// ---------- CSS_MODULE_ONLY patterns ----------

function checkCssModuleOnly(content: string): string[] {
  const violations: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/from\s+['"]([^'"]+\.css)['"]/);
    if (match && !match[1].endsWith('.module.css')) {
      violations.push(`Plain CSS import "${match[1]}"`);
    }
  }
  return violations;
}

describe('CSS_MODULE_ONLY policy', () => {
  it('detects plain .css imports', () => {
    const v = checkCssModuleOnly("import styles from './page.css';");
    expect(v).toHaveLength(1);
  });

  it('passes for .module.css imports', () => {
    const v = checkCssModuleOnly("import styles from './page.module.css';");
    expect(v).toHaveLength(0);
  });
});

// ---------- NO_HARDCODED_COLORS patterns ----------

function checkNoHardcodedColors(content: string): string[] {
  const violations: string[] = [];
  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
  const rgbPattern = /\brgba?\s*\(/;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('//')) continue;

    if (hexPattern.test(line)) {
      const inVarFallback = /var\([^)]*,\s*#[0-9a-fA-F]{3,8}/.test(line);
      violations.push(inVarFallback ? `Line ${i + 1}: hex in var() fallback` : `Line ${i + 1}: hardcoded hex`);
    }

    if (rgbPattern.test(line) && !line.includes('var(--ds-')) {
      violations.push(`Line ${i + 1}: hardcoded rgb/rgba`);
    }
  }
  return violations;
}

describe('NO_HARDCODED_COLORS policy', () => {
  it('detects hardcoded hex colors', () => {
    const v = checkNoHardcodedColors('color: #ff0000;');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('hardcoded hex');
  });

  it('detects hex inside var() fallback', () => {
    const v = checkNoHardcodedColors('color: var(--ds-color-danger, #ff0000);');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('var() fallback');
  });

  it('detects hardcoded rgba', () => {
    const v = checkNoHardcodedColors('background: rgba(0, 0, 0, 0.5);');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('rgb/rgba');
  });

  it('passes for token-only values', () => {
    const v = checkNoHardcodedColors('color: var(--ds-color-accent-text);');
    expect(v).toHaveLength(0);
  });

  it('ignores CSS comments', () => {
    const v = checkNoHardcodedColors('/* color: #ff0000; */');
    expect(v).toHaveLength(0);
  });
});

// ---------- TOKEN_SPACING_ONLY patterns ----------

function checkTokenSpacingOnly(content: string): string[] {
  const violations: string[] = [];
  const spacingProps = /^[^:]*\b(padding|margin|gap|row-gap|column-gap|font-size|border-radius)\b[^:]*:/;
  const pxValue = /\d+px/;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('//')) continue;
    if (spacingProps.test(line) && pxValue.test(line)) {
      if (line.includes('var(--ds-')) continue;
      if (line.includes('calc(')) continue;
      if (/:\s*0(?:px)?[;\s]/.test(line)) continue;
      if (/:\s*1px/.test(line) && line.includes('border')) continue;
      violations.push(`Line ${i + 1}: hardcoded px`);
    }
  }
  return violations;
}

describe('TOKEN_SPACING_ONLY policy', () => {
  it('detects hardcoded px padding', () => {
    const v = checkTokenSpacingOnly('padding: 16px;');
    expect(v).toHaveLength(1);
  });

  it('detects hardcoded px margin', () => {
    const v = checkTokenSpacingOnly('margin: 8px 12px;');
    expect(v).toHaveLength(1);
  });

  it('detects hardcoded px gap', () => {
    const v = checkTokenSpacingOnly('gap: 24px;');
    expect(v).toHaveLength(1);
  });

  it('passes for token-based spacing', () => {
    const v = checkTokenSpacingOnly('padding: var(--ds-size-4);');
    expect(v).toHaveLength(0);
  });

  it('passes for calc() expressions', () => {
    const v = checkTokenSpacingOnly('margin: calc(100% - 16px);');
    expect(v).toHaveLength(0);
  });

  it('passes for zero values', () => {
    const v = checkTokenSpacingOnly('padding: 0;');
    expect(v).toHaveLength(0);
  });
});

// ---------- I18N_REQUIRED patterns ----------

function checkI18nRequired(content: string): string[] {
  const violations: string[] = [];
  const attrPatterns = [/\baria-label="([^"]+)"/, /\bplaceholder="([^"]+)"/, /\btitle="([^"]+)"/, /\balt="([^"]+)"/];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    for (const pattern of attrPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = match[1];
        if (/^[^a-zA-Z\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5]*$/.test(value)) continue;
        violations.push(`Hardcoded "${value}"`);
      }
    }
  }
  return violations;
}

describe('I18N_REQUIRED policy', () => {
  it('detects hardcoded aria-label strings', () => {
    const v = checkI18nRequired('<Button aria-label="Close dialog">X</Button>');
    expect(v).toHaveLength(1);
    expect(v[0]).toContain('Close dialog');
  });

  it('detects hardcoded placeholder strings', () => {
    const v = checkI18nRequired('<Textfield placeholder="Search..." />');
    expect(v).toHaveLength(1);
  });

  it('passes for non-word values like "..."', () => {
    const v = checkI18nRequired('<Textfield placeholder="..." />');
    expect(v).toHaveLength(0);
  });

  it('ignores commented lines', () => {
    const v = checkI18nRequired('// <Button aria-label="Close">X</Button>');
    expect(v).toHaveLength(0);
  });
});
