# SolarMoris — System & Architecture Document

**Version:** 1.0  
**Date:** 2026-05-01  
**Product:** SolarMoris — Hybrid Solar Feasibility & ROI Planning Tool for Mauritius

---

## 1. Overview

SolarMoris is a web application that helps Mauritius homeowners evaluate the financial and environmental case for installing a grid-tied solar PV system with optional battery storage. Users enter their monthly electricity consumption (or upload a CEB bill), and the app produces:

- PV system sizing and panel count
- Roof feasibility assessment
- Monthly / annual savings (using CEB 2026 progressive tariffs)
- 25-year cash-flow table with NPV, IRR, and discounted payback
- Optional battery storage sizing and cost
- CO₂ offset and environmental equivalents
- Financing scenario modelling (EMI calculator)

The application is a three-step wizard: **Dashboard → Results → Investment Report**.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                  Next.js 14 App (Port 3000)                      │   │
│  │                                                                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │   │
│  │  │  /dashboard │  │  /results  │  │   /report  │  │  /login  │  │   │
│  │  │  Step 1     │  │  Step 2    │  │  Step 3    │  │ /register│  │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────────┘  │   │
│  │        │               │               │                         │   │
│  │        └───────────────┴───────────────┘                         │   │
│  │                        │                                          │   │
│  │              ┌─────────▼──────────┐                              │   │
│  │              │   lib/api.ts       │  API client                  │   │
│  │              │   (fetch + JWT)    │  (localStorage tokens)       │   │
│  │              └─────────┬──────────┘                              │   │
│  │                        │ /api/backend/**  (Next.js rewrite)      │   │
│  └────────────────────────┼─────────────────────────────────────────┘   │
│                           │                                             │
│             ┌─────────────▼──────────────┐                             │
│             │  Next.js Rewrite Proxy      │                             │
│             │  /api/backend/:path*        │                             │
│             │   → http://localhost:8000/  │                             │
│             └─────────────┬──────────────┘                             │
└───────────────────────────┼─────────────────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────────────────┐
│                    FastAPI Backend (Port 8000)                           │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  /auth/*     │  │  /calculate  │  │ /bill/upload │  │  /health  │  │
│  │  register    │  │  POST        │  │  POST        │  │  /ready   │  │
│  │  login       │  │              │  │              │  │           │  │
│  │  forgot-pwd  │  │  Calculation │  │  Bill parser │  │  Probes   │  │
│  │  reset-pwd   │  │  pipeline    │  │  (PDF/OCR)   │  │           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  └───────────┘  │
│         │                 │                                             │
│  ┌──────▼───────┐  ┌──────▼────────────────────────────────────────┐  │
│  │  core/       │  │  services/                                     │  │
│  │  security.py │  │  load_engine   → daily / annual kWh           │  │
│  │  deps.py     │  │  tariff_engine → CEB 4-band bill               │  │
│  │  JWT + bcrypt│  │  solar_engine  → PV kW sizing                  │  │
│  └──────┬───────┘  │  surface_area  → roof feasibility              │  │
│         │          │  battery_engine→ optional storage              │  │
│  ┌──────▼───────┐  │  roi_engine    → cost / savings / payback      │  │
│  │  SQLite /    │  │  explainability→ formula steps                 │  │
│  │  PostgreSQL  │  │  bill_parser   → pdfplumber + Tesseract OCR   │  │
│  │  (SQLModel)  │  └───────────────────────────────────────────────┘  │
│  └──────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Request Flow

### 3.1 Calculation Request (Happy Path)

```
Browser                  Next.js              FastAPI              SQLite
  │                        │                     │                    │
  │  POST /api/backend/    │                     │                    │
  │  api/v1/calculate      │                     │                    │
  │─────────────────────── ►                     │                    │
  │                        │  POST /api/v1/      │                    │
  │                        │  calculate          │                    │
  │                        │─────────────────── ►                     │
  │                        │                     │ (stateless —       │
  │                        │                     │  no DB access)     │
  │                        │                     │                    │
  │                        │                     │  load_engine       │
  │                        │                     │  tariff_engine     │
  │                        │                     │  solar_engine      │
  │                        │                     │  surface_area      │
  │                        │                     │  battery_engine    │
  │                        │                     │  roi_engine        │
  │                        │                     │                    │
  │                        │◄─────────────────── │                    │
  │◄─────────────────────── │  CalculationResponse                    │
  │                        │                     │                    │
  │  localStorage.setItem  │                     │                    │
  │  "solariq_results"     │                     │                    │
  │  router.push("/results")                      │                    │
```

### 3.2 Auth Flow

```
Browser                  Next.js              FastAPI              SQLite
  │                        │                     │                    │
  │  POST /auth/register   │                     │                    │
  │─────────────────────── ►─────────────────── ►                     │
  │                        │                     │  INSERT users      │
  │                        │                     │─────────────────── ►
  │                        │                     │◄─────────────────── │
  │                        │                     │  access_token       │
  │◄────────────────────────────────────────────  │  refresh_token      │
  │  localStorage:         │                     │                    │
  │  "access_token"        │                     │                    │
  │  "refresh_token"       │                     │                    │
  │                        │                     │                    │
  │  [subsequent requests] │                     │                    │
  │  Authorization:        │                     │                    │
  │  Bearer <access_token> │─────────────────── ►                     │
  │                        │                     │  JWT decode        │
  │                        │                     │  SELECT users      │
```

### 3.3 Bill Upload Flow

```
Browser                  Next.js              FastAPI         bill_parser
  │                        │                     │                 │
  │  POST /bill/upload     │                     │                 │
  │  (multipart/form-data) │                     │                 │
  │─────────────────────── ►─────────────────── ►                  │
  │                        │                     │  pdfplumber     │
  │                        │                     │  or Tesseract   │
  │                        │                     │─────────────── ►│
  │                        │                     │◄─────────────── │
  │                        │                     │  monthly_kwh    │
  │                        │◄─────────────────── │  confidence     │
  │◄─────────────────────── │  { monthly_kwh,     │                 │
  │                        │    estimated }       │                 │
  │  kWh input auto-fills  │                     │                 │
```

---

## 4. Backend Detail

### 4.1 Project Structure

```
backend/
├── app/
│   ├── main.py              FastAPI app factory; CORS; router mounting; lifespan
│   ├── config.py            Pydantic Settings — CEB tariffs, solar constants, costs
│   ├── database.py          Async SQLAlchemy engine; session factory; init_db()
│   ├── models/
│   │   ├── base.py          TimestampMixin; SolarProject placeholder model
│   │   ├── user.py          User + PasswordResetToken SQLModel table definitions
│   │   └── __init__.py      Re-exports all models (required for create_all)
│   ├── schemas/
│   │   ├── auth.py          Register / Login / ForgotPassword / ResetPassword DTOs
│   │   ├── calculation.py   CalculationRequest, CalculationResponse, ConfigOverrides
│   │   └── __init__.py
│   ├── routers/
│   │   ├── auth.py          POST /auth/register|login|forgot-password|reset-password
│   │   ├── calculations.py  POST /calculate; GET /config
│   │   ├── bill.py          POST /bill/upload
│   │   ├── health.py        GET /health; GET /health/ready (DB probe)
│   │   └── __init__.py
│   ├── core/
│   │   ├── security.py      bcrypt hashing; JWT encode/decode; reset token generation
│   │   └── deps.py          get_current_user / get_current_active_user dependencies
│   └── services/
│       ├── load_engine.py   Monthly → daily/annual kWh conversion
│       ├── tariff_engine.py CEB 2026 progressive 4-band tariff calculator
│       ├── solar_engine.py  PV kW sizing from Mauritius irradiance (5.2 kWh/m²/day)
│       ├── surface_area.py  Roof feasibility — required vs available m², panel count
│       ├── battery_engine.py One-day battery storage sizing and Rs cost
│       ├── roi_engine.py    System cost, monthly/annual savings, payback, 25-yr ROI
│       ├── explainability.py Step-by-step formula explanations for all metrics
│       └── bill_parser.py   PDF text extraction (pdfplumber) + OCR (Tesseract/Pillow)
├── requirements.txt
└── .env                     SECRET_KEY, DATABASE_URL, allowed_origins
```

### 4.2 Calculation Pipeline

The `/calculate` endpoint is stateless (no database read or write). The pipeline runs sequentially:

```
monthly_kwh  ──► load_engine.analyse()
                  └─► daily_kwh, annual_kwh

monthly_kwh  ──► tariff_engine.compute_bill()
                  └─► monthly_bill_rs  (4-band progressive CEB tariff)

daily_kwh    ──► solar_engine.size_system()
                  └─► pv_kw  (kW required to generate daily_kwh)
                      formula: pv_kw = daily_kwh / (irradiance × efficiency × (1 - losses))

pv_kw        ──► surface_area.evaluate(roof_area_m2)
                  └─► pv_kw (capped if roof too small), panel_count,
                      required_m2, available_m2, status (ok|limited|unknown)

daily_kwh    ──► battery_engine.size_battery(include_battery)
                  └─► capacity_kwh, cost_rs  (one full day of consumption)

monthly_bill_rs,
pv_kw,
battery.cost_rs ► roi_engine.compute()
                  └─► system_cost_rs, total_cost_rs, monthly_savings_rs,
                      annual_savings_rs, payback_years, roi_25yr_pct
```

### 4.3 CEB 2026 Tariff Bands

| Band | Range (kWh/month) | Rate (Rs/kWh) |
|------|-------------------|---------------|
| 1    | 0 – 100           | 5.40          |
| 2    | 101 – 300         | 8.10          |
| 3    | 301 – 600         | 11.35         |
| 4    | > 600             | 16.20         |

Net metering export tariff: **Rs 5.10/kWh**

### 4.4 Key Solar Constants (Mauritius)

| Parameter                   | Value      | Notes                              |
|-----------------------------|------------|------------------------------------|
| Solar irradiance            | 5.2 kWh/m²/day | Annual average                |
| Panel efficiency            | 20%        | Monocrystalline                    |
| System losses               | 20%        | Inverter + temperature + wiring    |
| Panel degradation           | 0.5%/yr    | Applied to 25-year model           |
| Panel wattage               | 400 Wp     |                                    |
| Panel footprint             | 2.0 m²     | Including spacing                  |
| Grid offset factor          | 85%        | Fraction of bill offset by solar   |
| System cost                 | Rs 55/Wp   | 2026 benchmark                     |
| Battery cost                | Rs 28,000/kWh |                                 |
| Maintenance                 | Rs 1,200/kW/yr |                                |

### 4.5 API Endpoints

| Method | Path                          | Auth | Description                        |
|--------|-------------------------------|------|------------------------------------|
| GET    | `/health`                     | No   | Liveness probe                     |
| GET    | `/api/v1/health/ready`        | No   | Readiness probe (DB ping)          |
| POST   | `/api/v1/auth/register`       | No   | Create account → tokens            |
| POST   | `/api/v1/auth/login`          | No   | Authenticate → tokens              |
| POST   | `/api/v1/auth/forgot-password`| No   | Generate password reset token      |
| POST   | `/api/v1/auth/reset-password` | No   | Consume token, set new password    |
| GET    | `/api/v1/config`              | No   | Read server default constants      |
| POST   | `/api/v1/calculate`           | No   | Full solar feasibility calculation |
| POST   | `/api/v1/bill/upload`         | No   | Parse PDF/image bill → monthly kWh |

> The `/calculate` endpoint accepts an optional `config_overrides` object to override any server constant on a per-request basis (tariff rates, irradiance, system costs, etc.).

### 4.6 Database Schema

```
users
├── id              INTEGER PK
├── email           VARCHAR(255) UNIQUE INDEX
├── full_name       VARCHAR(200)
├── hashed_password VARCHAR
├── is_active       BOOLEAN  DEFAULT TRUE
├── is_verified     BOOLEAN  DEFAULT FALSE
├── created_at      DATETIME
└── updated_at      DATETIME

password_reset_tokens
├── id              INTEGER PK
├── user_id         INTEGER FK → users.id INDEX
├── token           VARCHAR(255) UNIQUE INDEX
├── expires_at      DATETIME
├── used            BOOLEAN  DEFAULT FALSE
├── created_at      DATETIME
└── updated_at      DATETIME

solar_projects          ← placeholder, not yet used by any endpoint
├── id              INTEGER PK
├── name            VARCHAR(200) INDEX
├── location        VARCHAR(200) DEFAULT "Mauritius"
├── monthly_consumption_kwh FLOAT
├── roof_area_m2    FLOAT
├── budget_rs       FLOAT (nullable)
├── include_battery BOOLEAN
├── created_at      DATETIME
└── updated_at      DATETIME
```

### 4.7 Security

- **Passwords:** bcrypt via `passlib` (work factor auto-selected)
- **JWT:** HS256, `python-jose`; access tokens expire 60 min, refresh tokens 7 days
- **Reset tokens:** `secrets.token_urlsafe(32)`, expire 1 hour, single-use (marked `used=True`)
- **CORS:** Restricted to `allowed_origins` (default `http://localhost:3000`)
- **Production note:** The forgot-password endpoint currently returns the reset token in the response body. A `# TODO: email this in production` comment marks the location for email integration.

---

## 5. Frontend Detail

### 5.1 Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx           Root layout — Inter font, AuthProvider, metadata
│   ├── globals.css          Tailwind directives, CSS design tokens, html font-size: 17px
│   ├── page.tsx             Landing page (hero, features, stats)
│   ├── dashboard/
│   │   └── page.tsx         Step 1 — energy input form, bill upload, battery toggle
│   ├── results/
│   │   └── page.tsx         Step 2 — system sizing summary, key financial metrics
│   ├── report/
│   │   └── page.tsx         Step 3 — 25-yr cash flow, NPV/IRR, financing, CO₂, checklist
│   ├── login/
│   │   └── page.tsx         Standalone auth page
│   ├── register/
│   │   └── page.tsx         Standalone auth page
│   ├── forgot-password/
│   │   └── page.tsx         Standalone auth page
│   └── settings/
│       └── page.tsx         User settings (config overrides)
├── components/
│   ├── navbar.tsx           Navigation bar
│   ├── footer.tsx           Footer
│   ├── hero-section.tsx     Landing hero
│   ├── feature-cards.tsx    Feature showcase
│   ├── stats-bar.tsx        Statistics bar
│   └── ui/                  Shadcn/ui components (button, card, input, label, badge, switch)
├── contexts/
│   └── auth-context.tsx     JWT state — login(), register(), logout(), isAuthenticated
├── lib/
│   ├── api.ts               Typed fetch client — all backend calls via /api/backend proxy
│   ├── finance.ts           Pure financial functions (no React) — used by /report
│   └── utils.ts             clsx/tailwind-merge helper
└── __tests__/
    ├── api-client.test.ts   API client unit tests
    └── dashboard-form.test.tsx  Dashboard form integration tests (22 cases)
```

### 5.2 Three-Step Wizard Data Flow

```
Step 1 — /dashboard
  User inputs: monthly_kwh, roof_area_m2 (optional), include_battery
  Bill upload: POST /bill/upload → auto-fill monthly_kwh
  On submit:   POST /calculate → CalculationResponse
               localStorage.setItem("solariq_results", JSON.stringify(response))
               router.push("/results")
                    │
                    ▼
Step 2 — /results
  Read:   localStorage.getItem("solariq_results")
  Shows:  pv_kw, panel_count, battery_kwh, roof status
          monthly_savings_rs, payback_years, roi_25yr_pct, total_cost_rs
  CTA:    router.push("/report")
                    │
                    ▼
Step 3 — /report
  Read:   localStorage.getItem("solariq_results")
  Computes (all in-browser, lib/finance.ts):
    buildCashFlows()     → 25-row CashFlowRow[]
    calcNPV()            → net present value
    calcIRR()            → internal rate of return (bisection)
    calcDiscountedPayback() → fractional-year payback
    calcEMI()            → monthly loan payment
    calcCO2()            → annual/lifetime CO₂ offset, trees, km
  Shows:  cash flow table (amber payback row highlight)
          NPV / IRR / discounted payback metrics
          ComposedChart (bar: net CF + maintenance; line: cumulative)
          Financing scenarios (loan term + interest rate sliders)
          CO₂ environmental impact
          Next-steps checklist
  Actions: Print/PDF (window.print()), New assessment (clear localStorage)
```

### 5.3 Client-Side Financial Model (`lib/finance.ts`)

All 25-year modelling runs entirely in the browser from data already returned by `/calculate`.

**`buildCashFlows(params)`** — generates one row per year:

| Field                    | Formula                                                     |
|--------------------------|-------------------------------------------------------------|
| `degradationFactor`      | `(1 - 0.005)^(year-1)`                                      |
| `inflationMultiplier`    | `(1 + 0.045)^(year-1)`                                      |
| `grossSavingsRs`         | `annual_savings_rs × degradation × inflation`               |
| `maintenanceCostRs`      | `1200 × pv_kw` (flat nominal)                               |
| `netCashFlowRs`          | `gross - maintenance`                                       |
| `cumulativeNetRs`        | running sum of net (no year-0 outflow)                      |
| `discountedCashFlowRs`   | `net / (1 + 0.08)^year`                                     |
| `cumulativeDiscountedRs` | seeded at `-total_cost_rs`, accumulates discounted CF        |

**Financial assumptions:**

| Parameter       | Value  | Source              |
|-----------------|--------|---------------------|
| Inflation rate  | 4.5%   | Mauritius CPI       |
| Discount rate   | 8.0%   | WACC                |
| Panel degradation | 0.5%/yr | Industry average |
| Maintenance     | Rs 1,200/kW/yr | Benchmark   |
| CO₂ factor      | 0.38 kg/kWh | Mauritius grid  |

### 5.4 API Proxy

The Next.js rewrite in `next.config.js` forwards all `/api/backend/**` calls to the backend, avoiding browser CORS restrictions:

```javascript
rewrites: [
  { source: "/api/backend/:path*",
    destination: "http://localhost:8000/:path*" }
]
```

The typed API client (`lib/api.ts`) always prefixes calls with `/api/backend`, attaches the JWT `Authorization: Bearer <token>` header from `localStorage`, and injects any stored `config_overrides` into calculation requests.

### 5.5 Auth Context

`AuthProvider` (mounted in root layout) reads `access_token` from `localStorage` on mount to rehydrate auth state. It exposes:

| Method/Property  | Description                                   |
|------------------|-----------------------------------------------|
| `isAuthenticated` | `true` if `access_token` exists in localStorage |
| `isLoading`      | `true` during initial hydration               |
| `login()`        | POST /auth/login → store tokens               |
| `register()`     | POST /auth/register → store tokens            |
| `logout()`       | Remove tokens, set `isAuthenticated = false`  |

### 5.6 UI Design System

- **Color palette:** Teal primary (`#0d9488`, CSS `--primary: 174 87% 29%`), solar gold accent (`#eab308`, CSS `--accent: 43 96% 56%`), green-tinted background
- **Typography:** Inter (Google Fonts), `html { font-size: 17px }` — all Tailwind rem utilities scale from 17px base
- **Component library:** Shadcn/ui pattern — Radix UI primitives + `class-variance-authority` + `tailwind-merge`
- **Charts:** `recharts` `ComposedChart` (stacked bars + dual-axis line)
- **Icons:** `lucide-react`

### 5.7 Test Suite

22 tests in `src/__tests__/dashboard-form.test.tsx` using Vitest + React Testing Library:

| Suite | Tests |
|-------|-------|
| Form validation | kWh field enables/disables button; `include_battery` toggle; `roof_area_m2` pass-through |
| API error handling | Error message displayed; no navigation on failure; success navigates + stores results |
| Bill upload | Upload error shown; successful upload auto-fills kWh field |

---

## 6. Technology Stack Summary

### Backend

| Layer              | Technology                    | Version    |
|--------------------|-------------------------------|------------|
| Framework          | FastAPI                       | 0.115.12   |
| ASGI server        | Uvicorn                       | 0.34.3     |
| ORM / models       | SQLModel                      | 0.0.22     |
| Database (dev)     | SQLite + aiosqlite            | —          |
| Database (prod)    | PostgreSQL + asyncpg          | —          |
| Auth               | python-jose (JWT) + passlib (bcrypt) | — |
| Validation         | Pydantic v2 + pydantic-settings | 2.11.3  |
| Bill parsing       | pdfplumber + pytesseract + Pillow | —      |
| Email validation   | email-validator               | 2.2.0      |

### Frontend

| Layer              | Technology                    | Version    |
|--------------------|-------------------------------|------------|
| Framework          | Next.js (App Router)          | 14.2.29    |
| Language           | TypeScript                    | 5.7.3      |
| Styling            | Tailwind CSS                  | 3.4.17     |
| UI components      | Radix UI + CVA (Shadcn pattern) | —        |
| Charts             | recharts                      | 2.15.0     |
| Icons              | lucide-react                  | 0.468.0    |
| State management   | React Context API             | —          |
| Testing            | Vitest + React Testing Library | 4.1.5 / 16.3.2 |

---

## 7. Configuration & Environment

### Backend `.env`

```
SECRET_KEY=<openssl rand -hex 32>
DATABASE_URL=sqlite+aiosqlite:///./solar_dev.db   # dev
# DATABASE_URL=postgresql+asyncpg://user:pass@host/db  # prod
APP_ENV=development
ALLOWED_ORIGINS=["http://localhost:3000"]
```

### Frontend `.env.local`

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Starting the Application

```bash
# Backend
cd /workspace/backend
make install          # create venv + pip install
make dev              # uvicorn at localhost:8000

# Frontend
cd /workspace/frontend
npm install
npm run dev           # Next.js at localhost:3000
```

---

## 8. Architecture Diagram (Mermaid)

The following diagram can be rendered by any Mermaid-compatible tool (GitHub, Notion, draw.io import, mermaid.live) to produce an image.

```mermaid
graph TD
    subgraph Browser["Browser"]
        LP[Landing Page<br>/]
        DB[Dashboard<br>/dashboard<br>Step 1]
        RS[Results<br>/results<br>Step 2]
        RP[Report<br>/report<br>Step 3]
        AU[Auth Pages<br>/login /register]
        LC[localStorage<br>access_token<br>solariq_results]
        FIN[lib/finance.ts<br>buildCashFlows<br>calcNPV / calcIRR<br>calcEMI / calcCO2]
        AC[AuthContext<br>isAuthenticated<br>login / logout]
        API[lib/api.ts<br>ApiClient]
    end

    subgraph Next["Next.js Server (port 3000)"]
        PROXY[Rewrite Proxy<br>/api/backend/** → :8000/**]
    end

    subgraph FastAPI["FastAPI Backend (port 8000)"]
        AUTH[/auth/register<br>/auth/login<br>/auth/forgot-password<br>/auth/reset-password]
        CALC[POST /calculate]
        BILL[POST /bill/upload]
        CFG[GET /config]
        HLT[GET /health<br>GET /health/ready]

        subgraph Services["services/"]
            LE[load_engine]
            TE[tariff_engine]
            SE[solar_engine]
            SA[surface_area]
            BE[battery_engine]
            RE[roi_engine]
            BP[bill_parser<br>pdfplumber<br>Tesseract OCR]
            EX[explainability]
        end

        subgraph Core["core/"]
            SEC[security.py<br>JWT + bcrypt]
            DEP[deps.py<br>get_current_user]
        end
    end

    subgraph DB_Layer["Database"]
        SQLITE[(SQLite<br>solar_dev.db)]
        PG[(PostgreSQL<br>production)]
        USERS[users table]
        PRT[password_reset_tokens]
    end

    DB -->|POST monthly_kwh| API
    DB -->|File upload| API
    RS -->|router.push| RP
    DB -->|router.push| RS
    RP --> FIN
    API --> PROXY
    PROXY --> CALC
    PROXY --> AUTH
    PROXY --> BILL
    PROXY --> CFG
    CALC --> LE & TE & SE & SA & BE & RE & EX
    BILL --> BP
    AUTH --> SEC
    AUTH --> USERS
    AUTH --> PRT
    USERS --> SQLITE
    PRT --> SQLITE
    SQLITE -.->|prod switch| PG
    AC --> LC
    API --> LC
    RS --> LC
    RP --> LC

    style Browser fill:#f0fdf4,stroke:#16a34a
    style Next fill:#eff6ff,stroke:#3b82f6
    style FastAPI fill:#fff7ed,stroke:#ea580c
    style DB_Layer fill:#faf5ff,stroke:#9333ea
    style Services fill:#fef9c3,stroke:#ca8a04
    style Core fill:#fee2e2,stroke:#dc2626
```

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Calculation stateless | No DB write on `/calculate` | Faster responses; no auth required; results stored client-side |
| 25-yr model in browser | `lib/finance.ts` client-side | No round-trip needed; data already in localStorage from Step 2 |
| Proxy via Next.js rewrites | `/api/backend/**` rewrite | Avoids browser CORS restrictions without backend changes |
| Config overrides per-request | `ConfigOverrides` schema | Allows power users (Settings page) to adjust tariffs/costs without server restart |
| Progressive tariff accuracy | 4-band CEB 2026 lookup | Correct marginal-rate calculation rather than flat average |
| Bill parsing confidence | Returns `estimated: boolean` | Gives UI a signal to show "estimated" badge when OCR match is low-confidence |
| SQLite dev / PostgreSQL prod | `DATABASE_URL` env switch | Zero-friction local setup; production-grade DB via single env var change |
| Password reset token in response | Dev shortcut, TODO for prod email | No email service dependency during development |

---

*Document generated from codebase state as of 2026-05-01.*
