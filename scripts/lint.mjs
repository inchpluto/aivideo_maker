import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['node_modules/eslint/bin/eslint.js', 'src', 'server', 'shared', 'scripts', 'vite.config.js', '--max-warnings', '19'], { stdio: 'inherit', shell: false });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', code => { process.exitCode = code ?? 1; });
