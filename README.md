# Hybrid Solar Feasibility & ROI Planning Tool
### Mauritius — CEB 2026 Tariff Schedule

Full-stack web application for sizing hybrid solar+battery systems, calculating financial returns, and quantifying environmental impact for properties in Mauritius.

## Architecture

| Layer    | Technology                                     | Port |
|----------|------------------------------------------------|------|
| Backend  | FastAPI 0.115, SQLModel, SQLite (dev) / PgSQL  | 8000 |
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui | 3000 |

## Quick Start

### Backend

```bash
cd /workspace/backend
python3.11 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
cp .env.example .env
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs:   http://localhost:8000/docs
- Health:     http://localhost:8000/health
- Readiness:  http://localhost:8000/api/v1/health/ready

### Frontend

```bash
cd /workspace/frontend
npm install
cp .env.local.example .env.local
npm run dev
```

- Landing page: http://localhost:3000

## CEB 2026 Domestic Tariff Bands

| Consumption  | Rate (Rs/kWh) |
|-------------|---------------|
| 0–100 kWh   | 5.40          |
| 101–300 kWh | 8.10          |
| 301–600 kWh | 11.35         |
| > 600 kWh   | 16.20         |

Net metering export rate: Rs 5.10/kWh

## Project Structure

```
backend/app/
  main.py          — FastAPI app, CORS, lifespan, dual router inclusion
  config.py        — pydantic-settings + all CEB 2026 constants
  database.py      — async SQLAlchemy engine + session dependency
  models/base.py   — TimestampMixin + SolarProject placeholder model
  routers/health.py — /health (liveness) + /health/ready (readiness)

frontend/src/
  app/layout.tsx                  — Root layout (Inter font, metadata)
  app/page.tsx                    — Landing page composition
  app/globals.css                 — Tailwind + shadcn HSL CSS variables
  components/ui/                  — shadcn Card, Button, Badge (vendored)
  components/navbar.tsx
  components/hero-section.tsx
  components/stats-bar.tsx
  components/feature-cards.tsx
  components/recharts-placeholder.tsx
  components/footer.tsx
  lib/utils.ts                    — cn() helper
```

## Environment Variables

See `backend/.env.example` and `frontend/.env.local.example`.

To switch to PostgreSQL in production, change `DATABASE_URL` in `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/solar_db
```
