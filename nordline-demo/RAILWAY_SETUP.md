# NordLine Demo — Railway Deployment Guide

The demo consists of two separate services deployed on Railway: a **Next.js frontend** and a **FastAPI backend**. Each is deployed as its own Railway service from the same repository using a root directory override.

---

## 1. Prerequisites

- A [Railway](https://railway.app) account with a project created.
- The repository pushed to GitHub and connected to Railway.

---

## 2. Create the Two Services

Inside your Railway project, create **two services** from the GitHub repository, one for each subdirectory.

### Backend service
| Setting | Value |
|---|---|
| **Root Directory** | `nordline-demo/backend` |
| **Builder** | Nixpacks (auto-detected) |
| **Start command** | auto-detected from `railway.json` |

### Frontend service
| Setting | Value |
|---|---|
| **Root Directory** | `nordline-demo/frontend` |
| **Builder** | Nixpacks (auto-detected) |
| **Start command** | auto-detected from `railway.json` |

> Railway picks up `railway.json` automatically once the root directory is set correctly.

---

## 3. Environment Variables

Set these in the Railway dashboard under each service's **Variables** tab. Never commit actual values to the repository.

### Backend (`nordline-demo/backend`)

| Variable | Description |
|---|---|
| `PACECTRL_API_URL` | Base URL of the PaceCtrl API (no trailing slash) |
| `PACECTRL_WEBHOOK_SECRET` | Operator webhook secret issued by PaceCtrl |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins — set this to the public URL(s) of the frontend once you know them, e.g. `https://your-frontend.up.railway.app`. Use `*` only for debugging. |

> `PORT` is injected automatically by Railway — do **not** set it manually.

### Frontend (`nordline-demo/frontend`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BOOKING_BACKEND_URL` | **Public** URL of the nordline demo backend service (e.g. `https://nordline-demo-backend-production.up.railway.app`). Must be a public HTTPS URL — Railway internal URLs (`*.railway.internal`) are not reachable from the browser. |

> The `NEXT_PUBLIC_` prefix embeds the value into the browser bundle. Never use Railway private/internal URLs here.
>
> The PaceCtrl widget script URL is hardcoded to `https://pacectrl-production.up.railway.app/widget.js` — no variable needed.

---

## 4. Deployment Order

1. Deploy the **backend** first and wait for it to become healthy (`/health` returns 200).
2. Copy the backend's public URL and set it as `NEXT_PUBLIC_BOOKING_BACKEND_URL` on the frontend service.
3. Deploy the **frontend**.
4. Copy the frontend's public URL and add it to `ALLOWED_ORIGINS` on the backend, then redeploy the backend.

---

## 5. Verifying the Deployment

- `GET https://<backend-url>/health` — should return `{"status": "ok"}`.
- Open `https://<frontend-url>` — the trip list should load and each booking page should show the PaceCtrl widget.
- Open the browser network tab on a booking page and confirm that the widget config request goes to `pacectrl-production.up.railway.app` (not your backend — the widget talks to PaceCtrl directly).

---

## 6. Local Development

```bash
# Backend
cd nordline-demo/backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# Create a .env file with the variables listed in section 3 above
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd nordline-demo/frontend
npm install
# Create a .env.local file with:
#   NEXT_PUBLIC_BOOKING_BACKEND_URL=http://localhost:8000
#   NEXT_PUBLIC_PACECTRL_URL=https://pacectrl-production.up.railway.app
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and the backend on `http://localhost:8000`.
