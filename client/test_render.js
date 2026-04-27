import { build } from 'vite';

await build({
  logLevel: 'error',
  build: {
    write: false,
  },
});

console.log('Client compile smoke test succeeded');
