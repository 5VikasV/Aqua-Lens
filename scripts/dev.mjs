import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'dev:web']],
  ['npm', ['run', 'dev'], { cwd: 'backend' }]
];
const children = commands.map(([command, args, options = {}]) => spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options }));
const stop = () => children.forEach(child => child.kill('SIGTERM'));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
