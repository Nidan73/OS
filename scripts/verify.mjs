/**
 * verify.mjs — build + preview + gate, with the preview server owned and
 * killed by this process (the old shell version leaked `vite preview`).
 *
 * Port: pass PORT or GATE_PORT to move the preview; the gate is pointed at
 * it via GATE_BASE, so parallel gate runs on different ports never collide
 * (vite preview --strictPort refuses an occupied port).
 *
 * This script ALWAYS builds first. A stale dist/ is a silent wrong result —
 * the gate would approve whatever was last built, not what is in src/.
 * Skipping is opt-in, not opt-out: pass --no-build to gate an existing
 * dist/ deliberately (e.g. re-running flakes after a green build).
 */
import { spawn, spawnSync } from 'node:child_process';

const PORT = Number(process.env.GATE_PORT ?? process.env.PORT ?? 4173);
const URL = `http://localhost:${PORT}/`;
const TIMEOUT_MS = 30_000;

const args = process.argv.slice(2).filter(a => a !== '--no-build');
const skipBuild = process.argv.includes('--no-build');

if (!skipBuild) {
  const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if ((build.status ?? 1) !== 0) {
    console.error('verify: build failed — nothing to gate.');
    process.exit(build.status ?? 1);
  }
} else {
  console.error('verify: --no-build given — gating the existing dist/ as-is.');
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'inherit'
});

async function waitForPreview() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) {
      return `preview server exited with code ${preview.exitCode} before answering on :${PORT} — with --strictPort this usually means the port was already occupied. Pick another with GATE_PORT=<n>.`;
    }
    try {
      // A non-HTTP listener on the port accepts TCP but never answers, so the
      // fetch itself must not be allowed to hang past one poll interval.
      const res = await fetch(URL, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return null;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return `preview server did not answer on :${PORT} within ${TIMEOUT_MS / 1000}s`;
}

try {
  const failure = await waitForPreview();
  if (failure) {
    console.error(`verify: ${failure}`);
    process.exitCode = 1;
  } else {
    const gate = spawnSync('node', ['scripts/gate.mjs', ...args], {
      stdio: 'inherit',
      env: { ...process.env, GATE_BASE: `http://localhost:${PORT}` }
    });
    process.exitCode = gate.status ?? 1;
  }
} finally {
  preview.kill('SIGTERM');
}
