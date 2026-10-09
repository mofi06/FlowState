# flowstate frontend

A responsive, dependency-free supply-chain control room built from the supplied PRD and technical architecture, with a local-only account creation / sign-in experience adapted from the pasted auth-section prompt.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm start
```

Open http://127.0.0.1:4173. The first screen is the flowstate account gate. Use the demo form or Google/Apple buttons to enter the control room. Run the model checks with `npm test`.

## Included

- Control room with disruption exposure, KPI cards, clickable three-echelon network, agent evidence, and recovery actions.
- Flowstate auth gate with sign-up/sign-in mode, Google and Apple demo buttons, terms/privacy dialogs, validation, and responsive dark grain-gradient style artwork.
- Four scenario fixtures and a reproducible seed input.
- Recovery alternatives, quantity editing, six local validation checks, and explicit planner approval or rejection.
- Browser-local decision history and JSON exports.
- Three-planner comparison across eight metrics.
- Responsive navigation and modal dialogs, semantic controls, reduced-motion support.

## Scope and document alignment

The PDFs differ on network size, planning horizon, scenario count, and evaluation protocol. This implementation uses the PRD MVP: four suppliers, two plants, five DCs, six SKUs, four scenarios (SC1–SC4), 60 days, and a seven-day shutdown starting on day 10. The architecture informs the agent proposal, evidence, validation, and approval interactions.

This is a **frontend prototype**. Metrics, confidence, agent messages, network utilisation, and exposure are illustrative fixtures, not measured optimisation or simulation results. The animated pipeline is a demo. No backend, LLM API, ERP, real supplier, or order execution is connected. Local validation demonstrates the interaction but does not implement the full independent backend validator. Browser storage is not an authenticated, immutable, or secure audit log.

The PRD prototype uses USD as an explicit demo currency. Dynamic metrics come from `dist/model.js`; static node and exposure snapshot examples live in `dist/app.js`. Fixture comparisons are not evidence that a planner performs better.

## Source layout

- `dist/index.html`: page shell and metadata
- `dist/styles.css`: responsive design system
- `dist/app.js`: screens, interactions, dialogs, decision persistence
- `dist/model.js`: deterministic fixtures and local validation
- `server.mjs`: loopback-only static preview
- `tests/model.test.mjs`: approval and constraint regression checks

## Backend handoff

Replace the local auth gate with an authenticated session provider. The current account form is deliberately a browser-only demo: it does not create an account, send credentials, or call Google/Apple. Replace it with your identity provider and server session before production. Then replace `makeRun` and demo progress with coordinator API calls, and replace `metrics` with shared simulator results. Use server-side proposal and recommendation schemas. All quantity edits should request backend validation and resimulation, returning a new plan version. Approval must submit an authenticated identity and exact version to a server-side endpoint that validates again and prevents duplicate commits. Replace localStorage with server audit events. Display solver errors, timeouts, stale data, and fallback states using the existing notice patterns.

The suggested API boundaries are `POST /runs`, run progress events, `GET /runs/:id/recommendation`, `POST /plans/:id/validate`, `POST /plans/:id/decisions`, and `GET /comparisons?scenario=&seed=`. These are integration suggestions; endpoints are not implemented.

Google Fonts is optional; the UI falls back to system sans-serif when offline. All icons and charts are inline SVG and require no asset service.
