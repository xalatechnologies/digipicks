import { execSync } from 'node:child_process';

// Generates starter tokens based on designsystemet.config.json
// Requires: npm i -D @digdir/designsystemet

execSync('npx @digdir/designsystemet@latest tokens create --config designsystemet.config.json', {
  stdio: 'inherit',
});
