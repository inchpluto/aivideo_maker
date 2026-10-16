import { readFileSync } from 'node:fs';

// One source of truth for runtime health responses and release tooling.
const packageInfo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const APP_VERSION = packageInfo.version;
