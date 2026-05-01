# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`/workspace/backend/`)
```bash
make venv        # Create Python 3.11 venv
make install     # Install dependencies
make dev         # Run dev server at localhost:8000 (auto-reload)
make clean       # Remove venv, __pycache__, solar_dev.db
```
Or directly:
```bash
venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (`/workspace/frontend/`)
```bash
npm run dev          # Start Next.js dev server at localhost:3000
npm run build        # Production build
npm run type-check   # TypeScript check without emit
npm run lint         # ESLint
```

### Environment setup
- Backend: copy `backend/.env.example` → `backend/.env`. Generate `SECRET_KEY` with `openssl rand -hex 32`.
- Frontend: copy `frontend/.env.local.example` → `frontend/.env.local`. Default `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Architecture

This is a **SolarIQ** hybrid solar feasibility tool for Mauritius (CEB 2026 tariffs), with a FastAPI backend and Next.js 14 frontend.

### Backend (`/workspace/backend/app/`)

**Entry point:** `main.py` — creates the FastAPI app, configures CORS for `localhost:3000`, runs `init_db()` on startup via lifespan, and mounts routers.

**Router mounting pattern:**
```python
app.include_router(health_router)                                  # GET /health
app.include_router(health_router, prefix=settings.api_v1_prefix)  # GET /api/v1/health/ready
app.include_router(auth_router, prefix=f"{settings.api_v1_prefix}/auth")  # POST /api/v1/auth/*
```

**Layers:**
- `models/` — SQLModel table definitions. `base.py` has `TimestampMixin` (auto `created_at`/`updated_at`) used by all models. **All models must be imported in `models/__init__.py`** — `init_db()` only creates tables for models Python has already imported.
- `schemas/` — Pydantic v2 request/response schemas (separate from SQLModel table classes).
- `core/security.py` — bcrypt hashing + JWT utilities. Access tokens expire in 60 min, refresh in 7 days. Uses `settings.secret_key`.
- `core/deps.py` — `get_current_user` / `get_current_active_user` FastAPI dependencies for protected routes.
- `routers/` — one file per feature area.
- `config.py` — single `Settings` class (pydantic-settings), loaded once as `settings` singleton. Contains CEB tariff bands, solar irradiance constants, and financial assumptions.
- `database.py` — async SQLAlchemy engine. Dev uses SQLite (`aiosqlite`); prod switches to PostgreSQL via `DATABASE_URL`. SQLite FK enforcement is added via a `connect` event listener.

**Adding a new router:**
1. Create `app/routers/<name>.py`
2. Import and `app.include_router(...)` in `main.py`

**Adding a new model:**
1. Define in `app/models/<name>.py`, inherit `TimestampMixin`
2. Import it in `app/models/__init__.py` (critical for table creation)

### Frontend (`/workspace/frontend/src/`)

**Framework:** Next.js 14 App Router (all pages under `app/`). Client components require `"use client"` at the top.

**API calls:** All backend requests go through a Next.js rewrite proxy:
- Frontend calls `/api/backend/api/v1/...`
- Next.js rewrites it to `http://localhost:8000/api/v1/...`
- This avoids CORS issues in the browser. The typed client is in `lib/api.ts`.

**Auth state:** `contexts/auth-context.tsx` stores JWT tokens in `localStorage` and exposes `login()`, `register()`, `logout()`, and `isAuthenticated`. Wrap pages needing auth state with `useAuth()`. The `AuthProvider` is mounted in `app/layout.tsx`.

**UI components:** Shadcn/ui pattern — components live in `components/ui/`. Theme uses CSS variables (teal primary `#0d9488`, solar gold accent `#eab308`). Icons from `lucide-react`.

**Auth pages** (`/login`, `/register`, `/forgot-password`) are standalone — no Navbar/Footer, just a centered card with the logo linking back to `/`.

### Auth flow (dev mode)
The forgot-password endpoint returns the reset token directly in the response body (no email service). A `# TODO: email this in production` comment marks the spot. Use `POST /api/v1/auth/reset-password` with that token to complete the reset.

### Database
- Dev: SQLite at `backend/solar_dev.db` (auto-created on first run)
- Prod: set `DATABASE_URL=postgresql+asyncpg://...` in `.env`
- No migration runner is wired up yet — schema is created fresh via `SQLModel.metadata.create_all`
