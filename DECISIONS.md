# Architecture & Tooling Decisions

## Pinned Versions (Verified 2026-09-09)
- **gsap**: `3.15.0` — Core timeline API, `seek`, `pause`, `play`, `kill`. All plugins free since April 2025.
- **vite**: `8.2.2` — Vanilla TypeScript template, ES module bundling, static output to `dist/`.
- **vitest**: `5.0.0` — Fast pure algorithm unit test runner.
- **typescript**: `7.0.2` — Strict type checking (`strict: true`, no `any`).

## Netlify Configuration
- Static publish directory: `dist`
- Build command: `npm run build`
- SPA redirect: `/* /index.html 200` in `public/_redirects` and `netlify.toml`
