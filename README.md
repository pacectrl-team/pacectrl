# PaceCtrl

PaceCtrl helps ferry operators offer greener, slower voyages by surfacing speed/emissions tradeoffs to passengers at the point of booking. Passengers see a slider showing how much they can reduce the ship's speed (and emissions) on their trip; operators see aggregated intent data in a portal dashboard.

## Repository Structure

### `backend/`
FastAPI service — the core of the platform. Serves:
- **Public widget endpoints** (`/api/v1/public`) — no auth required; used by the embeddable widget to fetch voyage config and record passenger speed-reduction intents.
- **Operator API** (`/api/v1/operator`) — JWT-secured endpoints for managing voyages, ships, routes, widget configs, users, and viewing analytics.
- **Static widget bundle** — `GET /widget.js` serves the compiled widget script directly from the backend so operators only need one embed URL.

Built with FastAPI + SQLAlchemy + PostgreSQL. Deployed on Railway; migrations run automatically via Alembic on each deploy.

See [`backend/Documentation.md`](backend/Documentation.md) for local setup instructions.

### `portal/`
React + Vite operator dashboard. Lets ferry operators log in, create and manage voyages, configure the widget (speed limits, branding), invite crew, and view passenger intent analytics.

### `widget/`
Embeddable TypeScript/Vite script. This is the passenger-facing slider that operators embed in their booking flow. The compiled bundle is served by the backend at `/widget.js`. Operators customise speed thresholds and branding via the portal; the widget fetches its config at runtime from the public API.

### `nordline-demo/`
A self-contained demo deployment of a fictional ferry operator "NordLine", showing end-to-end PaceCtrl integration. Contains:
- **`nordline-demo/frontend/`** — Next.js app listing hardcoded ferry trips and embedding the PaceCtrl widget on the booking page. Captures `intent_id` from the widget's `onIntentCreated` callback and submits it on checkout.
- **`nordline-demo/backend/`** — Minimal FastAPI service that receives the checkout call, generates a booking reference, and forwards the intent to the PaceCtrl confirmed-choices webhook. Serves as a reference implementation for operator backends.

See [`nordline-demo/RAILWAY_SETUP.md`](nordline-demo/RAILWAY_SETUP.md) for Railway deployment instructions.
