import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileWriter } from '../lib/fs-helpers.js';

describe('FileWriter', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('dry-run mode', () => {
    it('records create operations without writing', async () => {
      const writer = new FileWriter(true, '/tmp/test-root');
      writer.create('apps/web/src/routes/test.tsx', '<div>test</div>');

      expect(writer.getOps()).toHaveLength(1);
      expect(writer.getOps()[0]).toEqual({
        relativePath: 'apps/web/src/routes/test.tsx',
        content: '<div>test</div>',
        action: 'create',
      });

      // Execute should not throw in dry-run mode
      await writer.execute();
    });

    it('records append operations without writing', async () => {
      const writer = new FileWriter(true, '/tmp/test-root');
      writer.append('apps/web/src/App.tsx', '\nimport { Test } from "./test";');

      expect(writer.getOps()).toHaveLength(1);
      expect(writer.getOps()[0].action).toBe('append');
    });

    it('records multiple operations in order', () => {
      const writer = new FileWriter(true, '/tmp/test-root');
      writer.create('file1.tsx', 'content1');
      writer.create('file2.tsx', 'content2');
      writer.append('file3.tsx', 'content3');

      const ops = writer.getOps();
      expect(ops).toHaveLength(3);
      expect(ops[0].relativePath).toBe('file1.tsx');
      expect(ops[1].relativePath).toBe('file2.tsx');
      expect(ops[2].relativePath).toBe('file3.tsx');
      expect(ops[2].action).toBe('append');
    });
  });

  describe('printSummary', () => {
    it('counts creates and appends separately', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const writer = new FileWriter(true, '/tmp/test-root');
      writer.create('a.tsx', '');
      writer.create('b.tsx', '');
      writer.append('c.tsx', '');

      writer.printSummary();

      const summaryCall = logSpy.mock.calls.find((call) =>
        typeof call[0] === 'string' && call[0].includes('Summary'),
      );
      expect(summaryCall).toBeDefined();
      // Should mention 2 created and 1 modified
      expect(summaryCall![0]).toContain('2');
      expect(summaryCall![0]).toContain('1');
    });
  });

  describe('empty operations', () => {
    it('handles execute with no operations', async () => {
      const writer = new FileWriter(true, '/tmp/test-root');
      // Should not throw
      await writer.execute();
      expect(writer.getOps()).toHaveLength(0);
    });
  });
});
