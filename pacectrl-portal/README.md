# PaceCtrl Prototype Portal

A modern, desktop-first operator portal for PaceCtrl built with **Next.js 16**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Dashboard** – KPI cards, confirmed-choice analytics (bar charts, pie charts, timeline), voyage status breakdown
- **Voyages** – Drag-and-drop interface: drag ships, routes, and widget configs from the palette onto voyage cards to assign them. Create/edit voyages inline
- **Ships** – CRUD management with card-based layout
- **Routes** – CRUD with port-to-port visual presentation
- **Speed & Emissions** – Configure slow/standard/fast emission anchors per route-ship combination with expandable inline editors
- **Widget Editor** – Full WYSIWYG live editor with split-panel layout: controls on the left, live widget preview (iframe) on the right. Edit colours, typography, layout, and labels in real time. Save/load configs from the backend

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Drag & Drop | @dnd-kit/core |
| Charts | Recharts |
| Icons | Lucide React |
| State | Zustand |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your operator credentials.

## Backend

Connected to the production backend at `https://pacectrl-production.up.railway.app`. All API calls go through JWT-authenticated endpoints under `/api/v1/operator/`.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Login page (root)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles + Tailwind theme
│   └── dashboard/
│       ├── layout.tsx              # Sidebar navigation wrapper
│       ├── page.tsx                # Dashboard overview
│       ├── voyages/page.tsx        # Drag-and-drop voyage management
│       ├── ships/page.tsx          # Ship fleet management
│       ├── routes/page.tsx         # Route management
│       ├── emissions/page.tsx      # Speed & emission anchors
│       └── widgets/page.tsx        # Live widget theme editor
├── components/
│   └── LoginPage.tsx               # Full-page login component
└── lib/
    ├── api.ts                      # API client (all fetch calls)
    ├── auth-store.ts               # Zustand auth state
    └── types.ts                    # TypeScript types matching backend schemas
```
