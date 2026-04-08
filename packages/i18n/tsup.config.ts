import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  esbuildOptions(options) {
    options.alias = { '@': path.resolve(__dirname, 'src') };
  },
});
