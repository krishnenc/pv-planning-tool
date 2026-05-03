# SolarMoris 🇲🇺

### Hybrid Solar Feasibility & ROI Planning Tool — CEB 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SolarMoris was built in response to the launch of the [CEB Solar Photovoltaic Scheme for Households 2026](https://ceb.mu/projects/solar-photovoltaic-scheme-for-households-2026) — a free tool to help Mauritian households understand whether the scheme makes financial sense for their home, before committing to an installation.

Enter your monthly electricity consumption (or upload a CEB bill), and the app produces a complete investment report covering system sizing, payback period, NPV, IRR, and CO₂ savings.

**Authors**

- Krishnen Chedambarum — [krishnen.chedambarum@valid.com](mailto:krishnen.chedambarum@valid.com)
- Sundeepsingh Neerunjun — [sundeepsingh.neerunjun@valid.com](mailto:sundeepsingh.neerunjun@valid.com)

Developed as part of the MSc IIoT programme at **Université des Mascareignes**, Mauritius.

Special thanks to **Dr Jay Doorga** ([LinkedIn](https://mu.linkedin.com/in/jay-doorga-23a8a91b8)) for his invaluable support and guidance.

---

## Features

- **Three-step wizard** — Energy inputs → System sizing summary → Full investment report
- **CEB bill upload** — PDF text extraction (pdfplumber) or image OCR (Tesseract) auto-fills the kWh field
- **Appliance calculator** — Build your consumption estimate from a catalogue of 22 appliance presets (AC, geyser, fridge, induction hob, pool pump, …) with auto-filled wattages
- **CEB 2026 progressive tariff** — Accurate four-band marginal-rate calculation, not a flat average
- **Roof feasibility check** — Sizes panel count against available roof area; caps the system if the roof is too small
- **Optional battery storage** — One-day autonomy sizing with Rs cost
- **25-year cash-flow model** — NPV, IRR, discounted payback, annual savings with 4.5% inflation and 0.5%/yr panel degradation, all computed in the browser
- **Financing calculator** — Adjustable loan term and interest rate with live EMI vs monthly savings comparison
- **CO₂ impact** — Annual and lifetime CO₂ offset, equivalent trees planted, km not driven
- **Print / PDF export** — Native browser print dialog
- **Per-session config overrides** — Adjust tariff rates, irradiance, and system costs from the Settings page
- **Authentication** — Register, login, forgot password, reset password (JWT, bcrypt)

---

## Quick Start — Docker (recommended)

Docker Compose starts both services, wires the network between them, and handles all dependencies (including Tesseract OCR). You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd solarmoris
```

### 2. Start everything

```bash
docker compose up --build
```

The first build takes a few minutes (npm install + `next build` + Python deps + Tesseract). Subsequent starts are fast.

### 3. Open the app

| Service      | URL                        |
| ------------ | -------------------------- |
| App          | http://localhost:3000      |
| Backend API  | http://localhost:8000      |
| Swagger docs | http://localhost:8000/docs |

---

### Common Docker commands

```bash
# Start in the background (detached)
docker compose up --build -d

# View logs
docker compose logs -f

# View logs for one service only
docker compose logs -f backend
docker compose logs -f frontend

# Stop all containers
docker compose down

# Stop and delete volumes (wipes the SQLite database)
docker compose down -v

# Rebuild a single service after code changes
docker compose up --build frontend
docker compose up --build backend

# Open a shell inside a running container
docker compose exec backend bash
docker compose exec frontend sh
```

### Backend hot reload

The `./backend/app` directory is volume-mounted into the backend container, and uvicorn runs with `--reload`. Any change to a Python file is picked up automatically — no rebuild needed.

### Frontend changes

The frontend is a production build baked at `docker compose up --build` time. After editing frontend code, rebuild with:

```bash
docker compose up --build frontend
```

> **Tip:** For active frontend development, run `npm run dev` locally (outside Docker) and keep only the backend in Docker:
>
> ```bash
> docker compose up backend        # backend on :8000
> npm run dev --prefix frontend    # frontend on :3000 with hot reload
> ```

---

## Quick Start — Manual

### Backend

```bash
cd backend
python3.11 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY at minimum
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> Tesseract must be installed on the host for image-based bill parsing:
> `sudo apt install tesseract-ocr` (Debian/Ubuntu) or `brew install tesseract` (macOS)

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open http://localhost:3000.

---

## Three-Step Wizard

```
Step 1 — /dashboard
  ├── Enter monthly kWh  OR  upload CEB bill (PDF / image)
  ├── Optionally add appliances from the preset catalogue
  ├── Toggle battery storage
  └── Enter roof area (optional)

Step 2 — /results
  ├── PV system size (kW) and panel count
  ├── Roof feasibility status
  ├── Monthly bill, monthly savings, simple payback
  └── → Full Report & Action Plan

Step 3 — /report
  ├── 25-year cash-flow table (amber row = payback year)
  ├── NPV · IRR · Discounted payback · Lifetime net gain
  ├── Dual-axis chart (annual net cash flow bars + cumulative line)
  ├── Financing scenarios (loan term + interest rate sliders, live EMI)
  ├── CO₂ environmental impact
  └── Action checklist (installer quotes, CEB net metering, DBM green loan, MRA VAT)
```

---

## CEB 2026 Tariff Bands

| Consumption   | Rate (Rs/kWh) |
| ------------- | ------------- |
| 0 – 100 kWh   | 5.40          |
| 101 – 300 kWh | 8.10          |
| 301 – 600 kWh | 11.35         |
| > 600 kWh     | 16.20         |

Net metering export rate: **Rs 5.10 / kWh**

---

## Project Structure

```
solarmoris/
├── docker-compose.yml          ← start everything with one command
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             FastAPI app factory, CORS, lifespan
│       ├── config.py           Pydantic Settings — all CEB & solar constants
│       ├── database.py         Async SQLAlchemy engine + session dependency
│       ├── models/
│       │   ├── base.py         TimestampMixin
│       │   └── user.py         User + PasswordResetToken tables
│       ├── schemas/
│       │   ├── auth.py         Register / Login / ForgotPassword DTOs
│       │   └── calculation.py  CalculationRequest/Response, ConfigOverrides
│       ├── routers/
│       │   ├── auth.py         POST /auth/register|login|forgot-password|reset-password
│       │   ├── calculations.py POST /calculate · GET /config
│       │   ├── bill.py         POST /bill/upload
│       │   └── health.py       GET /health · GET /health/ready
│       ├── core/
│       │   ├── security.py     JWT + bcrypt
│       │   └── deps.py         get_current_user dependency
│       └── services/
│           ├── load_engine.py      Monthly → daily/annual kWh
│           ├── tariff_engine.py    CEB 4-band progressive tariff
│           ├── solar_engine.py     PV kW sizing (5.2 kWh/m²/day irradiance)
│           ├── surface_area.py     Roof feasibility + panel count
│           ├── battery_engine.py   One-day battery sizing + Rs cost
│           ├── roi_engine.py       System cost, savings, payback, 25-yr ROI
│           ├── explainability.py   Step-by-step formula explanations
│           └── bill_parser.py      pdfplumber + Tesseract OCR
└── frontend/
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── page.tsx            Landing page
        │   ├── dashboard/page.tsx  Step 1 — Energy inputs
        │   ├── results/page.tsx    Step 2 — System sizing & savings
        │   ├── report/page.tsx     Step 3 — 25-year investment report
        │   ├── settings/page.tsx   Config overrides
        │   ├── login/page.tsx
        │   ├── register/page.tsx
        │   └── forgot-password/page.tsx
        ├── components/ui/          Shadcn/ui components
        ├── contexts/
        │   └── auth-context.tsx    JWT state (login / register / logout)
        └── lib/
            ├── api.ts              Typed fetch client + Next.js rewrite proxy
            └── finance.ts          25-yr cash-flow, NPV, IRR, EMI, CO₂ (browser-only)
```

---

## API Endpoints

| Method | Path                           | Auth | Description                   |
| ------ | ------------------------------ | ---- | ----------------------------- |
| GET    | `/health`                      | No   | Liveness probe                |
| GET    | `/api/v1/health/ready`         | No   | Readiness probe (DB ping)     |
| POST   | `/api/v1/auth/register`        | No   | Create account → JWT tokens   |
| POST   | `/api/v1/auth/login`           | No   | Authenticate → JWT tokens     |
| POST   | `/api/v1/auth/forgot-password` | No   | Generate reset token          |
| POST   | `/api/v1/auth/reset-password`  | No   | Set new password with token   |
| GET    | `/api/v1/config`               | No   | Current server constants      |
| POST   | `/api/v1/calculate`            | No   | Solar feasibility calculation |
| POST   | `/api/v1/bill/upload`          | No   | Parse bill → monthly kWh      |

Interactive docs: http://localhost:8000/docs

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Default                              | Notes                                         |
| ----------------- | ------------------------------------ | --------------------------------------------- |
| `SECRET_KEY`      | `insecure-dev-key`                   | **Change this.** Run `openssl rand -hex 32`   |
| `DATABASE_URL`    | `sqlite+aiosqlite:///./solar_dev.db` | Switch to `postgresql+asyncpg://...` for prod |
| `APP_ENV`         | `development`                        |                                               |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]`          | JSON array of allowed frontend URLs           |

### Frontend (`frontend/.env.local`)

| Variable              | Default                 | Notes                                      |
| --------------------- | ----------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL — baked into the Next.js build |

---

## Testing

```bash
cd frontend
npm test          # 22 Vitest + React Testing Library tests
npm run type-check
```

```bash
cd backend
venv/bin/pytest
```

---

## Deployment

See [`docs/deploy.md`](docs/deploy.md) for a step-by-step guide to deploying the application on **Google Cloud**.

---

## Docs

| Document                                       | Description                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | Full system architecture, request flows, DB schema, design decisions |
| [`docs/deploy.md`](docs/deploy.md)             | Vercel + Railway deployment guide                                    |
