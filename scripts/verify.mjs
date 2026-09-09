/**
 * verify.mjs — build + preview + gate, with the preview server owned and
 * killed by this process (the old shell version leaked `vite preview`).
 */
import { spawn, spawnSync } from 'node:child_process';

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const TIMEOUT_MS = 30_000;

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'inherit'
});

try {
  const deadline = Date.now() + TIMEOUT_MS;
  let up = false;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) break; // preview died before answering
    try {
      const res = await fetch(URL);
      if (res.ok) { up = true; break; }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!up) {
    console.error(`verify: preview server did not answer on :${PORT} within ${TIMEOUT_MS / 1000}s`);
    process.exitCode = 1;
  } else {
    const gate = spawnSync('node', ['scripts/gate.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
    process.exitCode = gate.status ?? 1;
  }
} finally {
  preview.kill('SIGTERM');
}
