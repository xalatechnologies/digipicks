import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/index.ts', 'src/types.ts', 'src/types/index.ts', 'src/constants.ts', 'src/navigation.ts'],
  format: ['esm'],
  dts: true,
  esbuildOptions(options) {
    options.alias = { '@': path.resolve(__dirname, 'src') };
  },
});
