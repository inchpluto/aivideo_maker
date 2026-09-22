import reactHooks from 'eslint-plugin-react-hooks';

const browserGlobals = {
  AbortController: 'readonly', AbortSignal: 'readonly', Audio: 'readonly', Blob: 'readonly', File: 'readonly', FileReader: 'readonly',
  FormData: 'readonly', URL: 'readonly', WebSocket: 'readonly', alert: 'readonly', confirm: 'readonly', crypto: 'readonly',
  cancelAnimationFrame: 'readonly', CustomEvent: 'readonly', document: 'readonly', fetch: 'readonly', indexedDB: 'readonly', localStorage: 'readonly', MutationObserver: 'readonly', navigator: 'readonly',
  performance: 'readonly', requestAnimationFrame: 'readonly', sessionStorage: 'readonly', setInterval: 'readonly', setTimeout: 'readonly',
  clearInterval: 'readonly', clearTimeout: 'readonly', structuredClone: 'readonly', window: 'readonly'
};
const nodeGlobals = { AbortSignal: 'readonly', Blob: 'readonly', Buffer: 'readonly', console: 'readonly', fetch: 'readonly', FormData: 'readonly', process: 'readonly', setImmediate: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', structuredClone: 'readonly', URL: 'readonly' };

export default [
  { ignores: ['dist/**', 'node_modules/**', '.audit-build/**', '.local-baseline-*/**'] },
  { files: ['src/**/*.{js,jsx}'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: browserGlobals }, plugins: { 'react-hooks': reactHooks }, rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'warn', 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } },
  { files: ['server/**/*.mjs', 'shared/**/*.mjs', 'scripts/**/*.mjs', 'vite.config.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: nodeGlobals }, rules: { 'no-undef': 'error', 'no-unreachable': 'error', 'no-constant-condition': 'warn' } }
];
