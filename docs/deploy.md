# Deployment Guide — SolarMoris

This app has two parts that must be deployed separately:

| Part | Technology | Recommended host |
|------|-----------|-----------------|
| **Frontend** | Next.js 14 | Vercel (free) |
| **Backend** | FastAPI + Python | Railway (free tier) |

Vercel cannot run the backend. It has no persistent filesystem for SQLite, no way to install system packages like Tesseract OCR, and no long-running process for SQLAlchemy. The backend must live on a platform that supports Python web services.

---

## Step 1 — Push the repo to GitHub

Both Vercel and Railway pull directly from a Git repository.

```bash
git init
git add .
git commit -m "initial commit"
# create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/solarmoris.git
git push -u origin main
```

---

## Step 2 — Deploy the backend on Railway

### 2a. Create the project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo**.
3. Select your repository.
4. Railway will detect Python automatically. Click **Add service**.

### 2b. Set the root directory

Railway needs to know the backend lives in a subdirectory.

1. Open the service → **Settings → Source**.
2. Set **Root Directory** to `backend`.

### 2c. Set the start command

In **Settings → Deploy**, set the start command to:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 2d. Add a PostgreSQL database

SQLite does not survive Railway's ephemeral filesystem. Add a managed Postgres database:

1. In your Railway project, click **New → Database → PostgreSQL**.
2. Once provisioned, click the Postgres service → **Variables** → copy the `DATABASE_URL` value.

### 2e. Set environment variables

In your backend service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | paste the Postgres URL from step 2d (change `postgresql://` → `postgresql+asyncpg://`) |
| `SECRET_KEY` | run `openssl rand -hex 32` locally and paste the result |
| `APP_ENV` | `production` |
| `ALLOWED_ORIGINS` | `["https://your-app.vercel.app"]` — fill in after Step 3 |

> **DATABASE_URL format:** Railway gives you `postgresql://user:pass@host/db`. You must change the scheme to `postgresql+asyncpg://user:pass@host/db` for the async SQLAlchemy driver.

### 2f. Note your backend URL

Once deployed, Railway gives you a public URL like `https://solarmoris-backend.up.railway.app`. Copy it — you need it in Step 3.

---

## Step 3 — Deploy the frontend on Vercel

### 3a. Import the project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your GitHub repository.

### 3b. Set the root directory

Vercel defaults to the repo root. Change it:

1. Under **Configure Project → Root Directory**, type `frontend`.

Vercel will detect Next.js automatically. Leave Build Command and Output Directory at their defaults.

### 3c. Set environment variables

Under **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app` (your Railway URL from Step 2f) |

### 3d. Deploy

Click **Deploy**. Vercel will run `npm install` and `npm run build` automatically.

Once done, Vercel gives you a URL like `https://solarmoris.vercel.app`.

---

## Step 4 — Wire CORS back to the frontend

Go back to Railway → backend service → **Variables** and update:

```
ALLOWED_ORIGINS=["https://solarmoris.vercel.app"]
```

Redeploy (Railway redeploys automatically on variable changes).

---

## Step 5 — Verify the deployment

Open `https://solarmoris.vercel.app` and check:

- [ ] Landing page loads
- [ ] Register and login work (tokens stored in localStorage)
- [ ] Dashboard → enter 350 kWh → Calculate → see Results page
- [ ] Results → Full Report loads with NPV / IRR populated
- [ ] Bill upload returns a kWh value (see note below about OCR)

---

## Important: Tesseract OCR

The bill upload feature uses Tesseract OCR to parse image files (JPEG/PNG). Railway's default Python environment does **not** include Tesseract as a system package.

**Option A — Disable image upload, keep PDF only**
PDF text extraction (`pdfplumber`) works without any system package. If Tesseract is not installed, image uploads will fail with a 500 error but PDF uploads will still work.

**Option B — Add Tesseract via a Dockerfile**
Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Then in Railway → Settings → Build, set **Builder** to **Dockerfile**. Railway will build the image and Tesseract will be available.

---

## Environment variable reference

### Backend (Railway)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` |
| `SECRET_KEY` | Yes | 32-byte hex, never commit to git |
| `APP_ENV` | Yes | `production` |
| `ALLOWED_ORIGINS` | Yes | JSON array of allowed frontend URLs |
| `APP_DEBUG` | No | Defaults to `false` — leave off in prod |

### Frontend (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | Yes | Full URL of the Railway backend, no trailing slash |

---

## Custom domain (optional)

**Vercel:** Settings → Domains → Add → follow the DNS instructions.

**Railway:** Service → Settings → Networking → Generate Domain, or add a custom domain and follow the CNAME instructions.

After adding a custom domain, update `ALLOWED_ORIGINS` in Railway to include the new domain.

---

## Redeployment

| Change | Action |
|--------|--------|
| Frontend code change | Push to `main` — Vercel redeploys automatically |
| Backend code change | Push to `main` — Railway redeploys automatically |
| New env variable | Add in Vercel/Railway dashboard — triggers redeploy |
| Database schema change | The app uses `SQLModel.metadata.create_all` on startup, which adds new tables/columns but does not drop existing ones — safe for additive migrations |

---

## Alternative backend hosts

If Railway does not suit, the backend deploys identically on:

- **Render** (render.com) — free tier available; set Root Directory to `backend`, start command same as above, add a Postgres database from the Render dashboard.
- **Fly.io** — best for the Dockerfile path (Tesseract included); install the `fly` CLI and run `fly launch` from the `backend/` directory.
