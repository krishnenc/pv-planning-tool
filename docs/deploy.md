# Deployment Guide — GCP Compute Engine (from scratch)

Single-VM deployment on Google Cloud. Both the FastAPI backend and Next.js frontend run on one **e2-small** instance behind nginx with TLS. Estimated cost: ~$15/month (e2-small, 10 GB disk, standard egress).

---

## Architecture

```
Internet → nginx (443/80) → Next.js :3000 → FastAPI :8000
                                           → SQLite (file on disk)
```

nginx terminates TLS and reverse-proxies everything to Next.js. Next.js rewrites `/api/backend/*` requests to the local FastAPI process. SQLite runs as a file on the same VM — no separate database service required.

---

## Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- A domain name pointed at the VM's external IP (needed for TLS — skip the certbot steps if you only want HTTP)
- The repository cloned or available to copy to the server

---

## 1. Create the VM

```bash
gcloud compute instances create solarmoris \
  --project=solarmoris \
  --zone=europe-west1-b \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-standard \
  --tags=http-server,https-server
```

**Zone choice:** Pick the zone closest to your users. For Mauritius, `europe-west1-b` (Belgium) gives the lowest latency.

---

## 2. Open firewall ports

```bash
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 --target-tags=http-server --direction=INGRESS

gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 --target-tags=https-server --direction=INGRESS
```

These rules only need to be created once per project. Skip if they already exist.

---

## 3. Assign a static external IP (recommended)

```bash
# Reserve a static IP
gcloud compute addresses create solarmoris-ip --region=europe-west1

# Attach it to the VM
gcloud compute instances delete-access-config solarmoris \
  --access-config-name="External NAT" --zone=europe-west1-b

gcloud compute instances add-access-config solarmoris \
  --access-config-name="External NAT" \
  --address=$(gcloud compute addresses describe solarmoris-ip \
              --region=europe-west1 --format='value(address)') \
  --zone=europe-west1-b
```

Point your domain's A record at this IP before proceeding with TLS setup.

---

## 4. SSH into the VM

```bash
gcloud compute ssh solarmoris --zone=europe-west1-b
```

All remaining commands run **on the VM** unless noted otherwise.

---

## 5. System setup

```bash
sudo apt-get update && sudo apt-get upgrade -y

# Runtime dependencies
sudo apt-get install -y \
  git nginx certbot python3-certbot-nginx \
  python3.11 python3.11-venv python3.11-dev \
  tesseract-ocr tesseract-ocr-eng \
  build-essential

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify versions:

```bash
python3.11 --version   # Python 3.11.x
node --version         # v20.x.x
```

---

## 6. Create an app user and clone the repository

```bash
sudo useradd -m -s /bin/bash solarmoris
sudo -i -u solarmoris

# As the solarmoris user:
git clone https://github.com/YOUR_USERNAME/solarmoris.git /home/solarmoris/app
cd /home/solarmoris/app
```

If the repository is private, use a deploy key or a personal access token in the clone URL.

---

## 7. Backend setup

### 7a. Install dependencies

```bash
cd /home/solarmoris/app/backend
python3.11 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt
```

### 7b. Create the environment file

```bash
SECRET_KEY=$(openssl rand -hex 32)

cat > /home/solarmoris/app/backend/.env <<EOF
APP_NAME=SolarMoris
APP_ENV=production
APP_DEBUG=false
SECRET_KEY=${SECRET_KEY}
ALLOWED_ORIGINS=["https://yourdomain.com"]
DATABASE_URL=sqlite+aiosqlite:////home/solarmoris/app/backend/solar.db
API_V1_PREFIX=/api/v1

# Contact form — email notifications (optional)
# If omitted, messages are saved to the database only.
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=you@gmail.com
# SMTP_PASSWORD=your-app-password
# CONTACT_EMAIL=you@gmail.com
EOF
```

Replace `yourdomain.com` with your domain. If you have no domain yet, set `ALLOWED_ORIGINS=["http://YOUR_VM_IP"]`.

The SQLite database file (`solar.db`) is created automatically on first startup — no setup needed. It lives alongside the backend code and is owned by the `solarmoris` user.

To enable email notifications from the contact form, uncomment the `SMTP_*` lines and fill in your credentials. For Gmail, generate an **App Password** under Google Account → Security → 2-Step Verification → App passwords (requires 2FA to be enabled). The `CONTACT_EMAIL` address is where contact submissions will be forwarded.

### 7c. Create the systemd service

Exit back to your sudo-capable user first:

```bash
exit   # back to your login user
```

```bash
sudo tee /etc/systemd/system/solarmoris-backend.service > /dev/null <<'EOF'
[Unit]
Description=SolarMoris FastAPI backend
After=network.target

[Service]
Type=simple
User=solarmoris
WorkingDirectory=/home/solarmoris/app/backend
ExecStart=/home/solarmoris/app/backend/venv/bin/uvicorn \
    app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1
Restart=on-failure
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable solarmoris-backend
sudo systemctl start solarmoris-backend
```

> **Note:** SQLite does not support concurrent writes, so `--workers 1` is required. For a low-traffic public tool this is fine.

Check it started:

```bash
sudo systemctl status solarmoris-backend
# Should show: Active: active (running)
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

---

## 8. Frontend setup

### 8a. Install dependencies and build

```bash
sudo -i -u solarmoris
cd /home/solarmoris/app/frontend

cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
# Google Analytics 4 — leave blank to disable tracking
NEXT_PUBLIC_GA_MEASUREMENT_ID=
EOF

npm install
npm run build
```

Replace `G-XXXXXXXXXX` with your GA4 Measurement ID (found in Google Analytics → Admin → Data Streams → your stream → Measurement ID). If you don't have one yet or want to skip tracking, leave the value blank — the analytics component is a no-op when the variable is unset.

> **Important:** `NEXT_PUBLIC_*` variables are embedded at build time. If you add or change the GA ID after building, you must re-run `npm run build` and restart the frontend service for it to take effect.

The build takes 1–2 minutes. A successful build ends with `✓ Compiled successfully`.

### 8b. Create the systemd service

```bash
exit   # back to your login user
```

```bash
sudo tee /etc/systemd/system/solarmoris-frontend.service > /dev/null <<'EOF'
[Unit]
Description=SolarMoris Next.js frontend
After=network.target solarmoris-backend.service

[Service]
Type=simple
User=solarmoris
WorkingDirectory=/home/solarmoris/app/frontend
ExecStart=/home/solarmoris/app/frontend/node_modules/.bin/next start
Restart=on-failure
RestartSec=5
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable solarmoris-frontend
sudo systemctl start solarmoris-frontend
```

Check it started:

```bash
sudo systemctl status solarmoris-frontend
curl http://localhost:3000
# Should return HTML (302 redirect to /dashboard)
```

---

## 9. nginx reverse proxy

### 9a. Write the site config

```bash
sudo tee /etc/nginx/sites-available/solarmoris > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    # Increase body size limit for bill uploads (PDFs / images)
    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/solarmoris /etc/nginx/sites-enabled/solarmoris
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Replace `yourdomain.com` with your actual domain (or the VM's external IP if no domain).

---

## 10. TLS with Let's Encrypt

**Skip this section if you have no domain name.** HTTP-only still works — just use `http://YOUR_VM_IP`.

Make sure your domain's A record is pointing at the VM's external IP and has propagated, then:

```bash
sudo certbot --nginx -d yourdomain.com
```

Certbot will:

- Obtain a certificate from Let's Encrypt
- Automatically update the nginx config with TLS directives
- Set up automatic renewal via a systemd timer

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

After certbot runs, nginx will listen on 443 and redirect port 80 to HTTPS automatically.

---

## 11. Verify the deployment

Open `https://yourdomain.com` in a browser and check:

- [ ] Root URL (`/`) redirects immediately to `/dashboard`
- [ ] Assessment form loads — enter 350 kWh and click **Calculate**
- [ ] Results page shows system sizing and payback period
- [ ] Full Report loads with NPV / IRR / CO₂ tables
- [ ] `/settings` page loads, modify a value, Save — check localStorage in DevTools
- [ ] Bill upload (PDF) returns a kWh value
- [ ] `/faq` loads and accordions expand correctly
- [ ] `/contact` form submits successfully — check the database for the record:
  ```bash
  sqlite3 /home/solarmoris/app/backend/solar.db \
    "SELECT id, name, email, subject, created_at FROM contactmessage ORDER BY created_at DESC LIMIT 5;"
  ```

Check service health directly:

```bash
curl https://yourdomain.com/api/backend/api/v1/health/ready
# {"status":"ready"}

curl https://yourdomain.com/api/backend/api/v1/config
# Returns JSON with CEB tariff defaults
```

---

## 12. Redeployment (updating the app)

After pushing changes to git:

```bash
sudo -i -u solarmoris
cd /home/solarmoris/app
git pull origin main

# If backend changed:
cd backend
venv/bin/pip install -r requirements.txt
exit
sudo systemctl restart solarmoris-backend

# If frontend changed:
sudo -i -u solarmoris
cd /home/solarmoris/app/frontend
npm install
npm run build
exit
sudo systemctl restart solarmoris-frontend
```

Database schema is managed by `SQLModel.metadata.create_all` on startup — additive changes (new tables, new nullable columns) apply automatically. Destructive migrations require manual SQL via `sqlite3`.

---

## Environment variable reference

### Backend (`backend/.env`)

| Variable          | Required | Notes                                                                                                                 |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| `SECRET_KEY`      | Yes      | 32-byte hex — generate with `openssl rand -hex 32`                                                                    |
| `DATABASE_URL`    | Yes      | `sqlite+aiosqlite:////home/solarmoris/app/backend/solar.db`                                                           |
| `APP_ENV`         | Yes      | `production`                                                                                                          |
| `ALLOWED_ORIGINS` | Yes      | JSON array: `["https://yourdomain.com"]`                                                                              |
| `APP_DEBUG`       | No       | Leave unset (defaults to `false`)                                                                                     |
| `SMTP_HOST`       | No       | SMTP server for contact form email notifications (e.g. `smtp.gmail.com`)                                              |
| `SMTP_PORT`       | No       | SMTP port — defaults to `587` (STARTTLS)                                                                              |
| `SMTP_USERNAME`   | No       | SMTP login — usually your email address                                                                               |
| `SMTP_PASSWORD`   | No       | SMTP password or app password                                                                                         |
| `CONTACT_EMAIL`   | No       | Destination address for contact form notifications; if unset email is disabled and messages are stored in the DB only |

### Frontend (`frontend/.env.local`)

| Variable                        | Required | Notes                                                                                                           |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`           | Yes      | `http://localhost:8000` — Next.js rewrites proxy this server-side, so `localhost` is correct even in production |
| `NEXT_PUBLIC_SITE_URL`          | Yes      | Production domain e.g. `https://yourdomain.com` — used for sitemap, canonical URLs and OG tags. Must be set before `npm run build`. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No       | GA4 Measurement ID (`G-XXXXXXXXXX`). Leave blank to disable analytics. Must be set before `npm run build`.      |

---

## Troubleshooting

**502 Bad Gateway from nginx**
One of the services is not running. Check `sudo systemctl status solarmoris-backend` and `sudo systemctl status solarmoris-frontend`. View logs with `sudo journalctl -u solarmoris-backend -n 50`.

**Frontend builds but shows blank page**
Check `sudo journalctl -u solarmoris-frontend -n 50` for runtime errors. A common cause is `NEXT_PUBLIC_API_URL` not being set at build time (it must exist in `.env.local` before `npm run build`).

**Bill upload returns 500 on image files**
Tesseract is not installed or not on `PATH`. Verify with `which tesseract`. Re-run `sudo apt-get install -y tesseract-ocr tesseract-ocr-eng` if missing. PDF uploads work without Tesseract.

**SQLite "database is locked" error**
This means more than one uvicorn worker is trying to write simultaneously. Ensure `--workers 1` is set in the systemd `ExecStart`. SQLite supports only one writer at a time.

**Certbot fails: "Domain not yet pointing at this server"**
DNS propagation can take up to 48 hours. Check with `dig +short yourdomain.com` — it should return the VM's external IP before running certbot.

---

## Scaling beyond a single VM

When the single VM becomes a bottleneck:

1. **Database** — Migrate to Cloud SQL (PostgreSQL). Update `DATABASE_URL` to `postgresql+asyncpg://...` and increase `--workers`; no application code changes needed.
2. **Backend** — Move to Cloud Run using the existing `backend/Dockerfile`. Cloud Run scales to zero and handles traffic spikes automatically. Switch to PostgreSQL first (SQLite is not suitable for multi-instance deployments).
3. **Frontend** — Deploy to Vercel (free tier) or Cloud Run. Set `NEXT_PUBLIC_API_URL` to the Cloud Run backend URL.
4. **File uploads** — The bill upload endpoint currently processes files in memory. For multi-instance deployments, move temporary storage to Cloud Storage.
