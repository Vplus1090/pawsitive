#!/usr/bin/env node

import { execSync, fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Check if frontend build exists; if not, build it automatically
const distPath = path.join(rootDir, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('📦 First-time run detected: Building frontend assets with Vite...');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    console.log('✓ Build completed successfully!\n');
  } catch (err) {
    console.error('Failed to build frontend:', err);
    process.exit(1);
  }
}

// Discover network LAN IPs for phone port access
const networkInterfaces = os.networkInterfaces();
let lanIp = 'localhost';
for (const ifaceName of Object.keys(networkInterfaces)) {
  for (const iface of networkInterfaces[ifaceName] || []) {
    if (iface.family === 'IPv4' && !iface.internal) {
      lanIp = iface.address;
      break;
    }
  }
}

const PORT = process.env.PORT || 5001;

console.log(`
\x1b[32m  ____                               _ _   _            \x1b[0m
\x1b[32m |  _ \\  __ ___      _____(_) |_(_)_   _____  \x1b[0m
\x1b[32m | |_) |/ _\` \\ \\ /\\ / / __| | __| \\ \\ / / _ \\ \x1b[0m
\x1b[32m |  __/| (_| |\\ V  V /\\__ \\ | |_| |\\ V /  __/ \x1b[0m
\x1b[32m |_|    \\__,_| \\_/\\_/ |___/_|\\__|_| \\_/ \\___| \x1b[0m
                                              
\x1b[1m🐾 Community Animal Welfare & Pokédex Mobile App\x1b[0m
\x1b[90m   Jaypee Institute of Information Technology (JIIT), Sector 62\x1b[0m
\x1b[90m   Database Systems & Web Lab (15B17CI372)\x1b[0m
─────────────────────────────────────────────────────────────
\x1b[36m📱 Phone Ports & Web Access:\x1b[0m
  ➜  \x1b[1mLocal Browser:\x1b[0m   \x1b[32mhttp://localhost:${PORT}\x1b[0m
  ➜  \x1b[1mPhone on Wi-Fi:\x1b[0m  \x1b[32mhttp://${lanIp}:${PORT}\x1b[0m
  ➜  \x1b[1mAPI Endpoint:\x1b[0m   \x1b[32mhttp://localhost:${PORT}/api\x1b[0m
─────────────────────────────────────────────────────────────
\x1b[90mPress Ctrl+C to stop the server\x1b[0m
`);

// Start server
process.env.PORT = String(PORT);
import('../server/index.js');
