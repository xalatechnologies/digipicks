import { execSync } from 'node:child_process';

// Builds CSS themes into packages/ds/generated (output dir from designsystemet.config.json)
// Requires: npm i -D @digdir/designsystemet

execSync('npx @digdir/designsystemet@latest tokens build --config designsystemet.config.json', {
  stdio: 'inherit',
});
