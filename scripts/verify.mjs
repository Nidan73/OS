/**
 * verify.mjs — build + preview + gate, with the preview server owned and
 * killed by this process (the old shell version leaked `vite preview`).
 *
 * Port: pass PORT or GATE_PORT to move the preview; the gate is pointed at
 * it via GATE_BASE, so parallel gate runs on different ports never collide
 * (vite preview --strictPort refuses an occupied port).
 *
 * Run-scoped build dir (Task E): the gated copy is built into
 * dist-verify-<pid>-<ts>/ and previewed from there, NEVER into dist/.
 * Two concurrent verifies (owner + agent, two lesson branches) each get
 * their own dir, so a build in one can no longer clobber the other mid-gate
 * — the exact failure seen when a shared-tree build overwrote dist/ during
 * a gate run. Chosen over a lock file because a lock serialises the two
 * runs (one refuses); isolation lets both proceed. The dir is removed in
 * `finally`; stale ones (>2h, e.g. after a SIGKILL) are swept at startup.
 *
 * NOTE: `npm run verify` (package.json) still runs `npm run build` first,
 * so dist/ keeps getting refreshed as a side effect. This script's gated
 * copy is separate from that.
 *
 * This script ALWAYS builds first. A stale dist/ is a silent wrong result —
 * the gate would approve whatever was last built, not what is in src/.
 * Skipping is opt-in, not opt-out: pass --no-build to gate an existing
 * dist/ deliberately (e.g. re-running flakes after a green build).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.GATE_PORT ?? process.env.PORT ?? 4173);
const URL = `http://localhost:${PORT}/`;
const TIMEOUT_MS = 30_000;

const args = process.argv.slice(2).filter(a => a !== '--no-build');
const skipBuild = process.argv.includes('--no-build');

// Sweep leftovers from killed runs (SIGKILL skips `finally`). Best-effort:
// anything matching our prefix older than 2h goes; our own dir is brand new.
function sweepStaleBuildDirs() {
  let entries = [];
  try {
    entries = fs.readdirSync(process.cwd());
  } catch {
    return;
  }
  const now = Date.now();
  for (const name of entries) {
    if (!/^dist-verify-\d+-\d+$/.test(name)) continue;
    try {
      const mtime = fs.statSync(path.join(process.cwd(), name)).mtimeMs;
      if (now - mtime > 2 * 60 * 60 * 1000) {
        fs.rmSync(path.join(process.cwd(), name), { recursive: true, force: true });
        console.error(`verify: swept stale build dir ${name}`);
      }
    } catch { /* best-effort */ }
  }
}

let outDir = 'dist';
let ownsOutDir = false;
let preview = null;

if (!skipBuild) {
  sweepStaleBuildDirs();
  outDir = `dist-verify-${process.pid}-${Date.now()}`;
  ownsOutDir = true;
  const tsc = spawnSync('npx', ['tsc'], { stdio: 'inherit' });
  if ((tsc.status ?? 1) !== 0) {
    console.error('verify: build failed — nothing to gate.');
    process.exit(tsc.status ?? 1);
  }
  const build = spawnSync('npx', ['vite', 'build', '--outDir', outDir], { stdio: 'inherit' });
  if ((build.status ?? 1) !== 0) {
    console.error('verify: build failed — nothing to gate.');
    fs.rmSync(path.join(process.cwd(), outDir), { recursive: true, force: true });
    process.exit(build.status ?? 1);
  }
} else {
  console.error('verify: --no-build given — gating the existing dist/ as-is.');
}

// A previous verify killed by SIGKILL/SIGTERM can leave its preview holding
// the port; --strictPort then exits immediately and the gate times out on
// every lesson. Retry once on a nearby port instead of failing the run.
async function startPreview() {
  for (const port of [PORT, PORT + 1, PORT + 2]) {
    const server = spawn('npx', ['vite', 'preview', '--outDir', outDir, '--port', String(port), '--strictPort'], {
      stdio: 'ignore'
    });
    const failure = await waitForPreview(server, port);
    if (failure === null) return { server, port };
    server.kill('SIGTERM');
    if (!/already occupied|did not answer/.test(failure)) return { server: null, port, failure };
    console.error(`verify: :${port} unavailable (${failure.split(' — ')[0]}), trying :${port + 1}…`);
  }
  return { server: null, port: PORT, failure: 'no free preview port found' };
}

async function waitForPreview(server, port) {
  const base = `http://localhost:${port}/`;
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      return `preview server exited with code ${server.exitCode} before answering on :${port} — with --strictPort this usually means the port was already occupied. Pick another with GATE_PORT=<n>.`;
    }
    try {
      // A non-HTTP listener on the port accepts TCP but never answers, so the
      // fetch itself must not be allowed to hang past one poll interval.
      const res = await fetch(base, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return null;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return `preview server did not answer on :${port} within ${TIMEOUT_MS / 1000}s`;
}

function cleanupBuildDir() {
  if (!ownsOutDir) return;
  try {
    fs.rmSync(path.join(process.cwd(), outDir), { recursive: true, force: true });
  } catch { /* best-effort */ }
}

try {
  const started = await startPreview();
  preview = started.server;
  if (!preview) {
    console.error(`verify: ${started.failure}`);
    process.exitCode = 1;
  } else {
    const gate = spawnSync('node', ['scripts/gate.mjs', ...args], {
      stdio: 'inherit',
      env: { ...process.env, GATE_BASE: `http://localhost:${started.port}` }
    });
    process.exitCode = gate.status ?? 1;
  }
} finally {
  preview?.kill('SIGTERM');
  cleanupBuildDir();
}
