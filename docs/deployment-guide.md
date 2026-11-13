# Deployment Guide — Smart CRM, flow L8 "CSAT/NPS satisfaction survey" (track SE), tag v1.0

Author: Hà Gia Thiên Bảo (2374802010032). The whole system — PostgreSQL, the Node.js API and the React web app — runs from **two commands** with Docker Compose. No Node.js or PostgreSQL installation is needed on the host.

## 1. Requirements

| Item | Version / value | Check with |
|---|---|---|
| OS | Windows 10/11 (Docker Desktop with WSL 2), macOS 13+, or Linux x86-64 / arm64 | — |
| Docker Engine + Docker Compose v2 | Docker 24+ · Compose 2.20+ (Docker Desktop 4.25+ has both) | `docker --version` · `docker compose version` |
| Git | 2.30+ | `git --version` |
| Free disk / RAM | about 2 GB disk for images, 2 GB RAM for Docker | — |
| Free host ports | **8080** (web), **3000** (API). PostgreSQL is **not** published to the host | `netstat -ano \| findstr ":8080 :3000"` (Windows) · `lsof -i :8080 -i :3000` |
| Internet | first build only (pulls `postgres:16-alpine`, `node:20-alpine`, `nginx:1.27-alpine` and npm packages) | — |

## 2. Setup steps

Run in an **empty folder**. Commands are the same in PowerShell, Git Bash and Linux/macOS shells, except step 2 on PowerShell (`copy` instead of `cp`).

1. `git clone --branch v1.0 https://github.com/ThienBao19/cdtn1-hagiathienbao-l8.git && cd cdtn1-hagiathienbao-l8`
2. `cp .env.example .env` — PowerShell: `copy .env.example .env`. The sample values work as-is for a local test.
3. `docker compose up -d --build` — the first build takes about 3–5 minutes.

What happens automatically on step 3 (no extra command needed): the `db` service starts and becomes healthy (`pg_isready`); the `api` service waits for it, runs all migrations (`migrations/*.sql`), loads the sample data (`seeds/*.sql`), then starts the API on port 3000; the `web` service (React build served by nginx) waits until the API is healthy and opens on port 8080. `nginx` forwards `/api/*` to the API, so the browser uses a single origin.

To stop: `docker compose down` (keeps data) · to reset everything including the database: `docker compose down -v`.

## 3. Environment variables

All variables live in `.env` (copied from `.env.example`, never committed). Docker Compose reads them; inside Compose `DB_HOST` is forced to `db` (the service name), so the value in `.env` only matters when you run the API without Docker.

| Name | Meaning | Sample value | Required |
|---|---|---|---|
| `DB_NAME` | PostgreSQL database name (created automatically) | `smartcrm` | yes |
| `DB_USER` | PostgreSQL user (becomes the superuser of the `db` container) | `postgres` | yes |
| `DB_PASSWORD` | PostgreSQL password | `your_password` | yes — **change for a real deployment** |
| `DB_HOST`, `DB_PORT` | Database host/port when running **without** Docker | `localhost`, `5432` | no (Compose uses `db:5432`) |
| `DB_NAME_TEST` | Separate database used by the integration tests; must end in `_test` | `smartcrm_test` | no |
| `SECRET_KEY` | Key that signs login tokens (JWT); the API refuses to start if missing or shorter than 16 characters | `doi-thanh-chuoi-ngau-nhien-cua-ban` | yes — **generate a random value for a real deployment**, e.g. `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Login session lifetime | `8h` | no |
| `INVITATION_VALID_DAYS` | Days a survey link stays valid (business rule BR-L8-01) | `7` | no |
| `LOG_LEVEL` | `debug` · `info` · `warn` · `error` | `info` | no |
| `API_PORT` | Host port of the API | `3000` | no |
| `WEB_PORT` | Host port of the web app | `8080` | no |
| `APP_PORT`, `FRONTEND_URL` | Used only when running without Docker (API port, base URL of survey links) | `3000`, `http://localhost:5173` | no |

## 4. Sample data

Loaded automatically by the `api` service on every start (`node scripts/migrate.js && node scripts/seed.js`). Every insert uses fixed keys and `ON CONFLICT DO NOTHING`, so restarting never duplicates rows. After the first start the database contains:

| Table | Rows | Notes |
|---|---|---|
| `service_center` | 6 | 3 in Ho Chi Minh City, 2 in Can Tho, 1 in Hanoi |
| `technician` | 24 | |
| `customer` | 1,206 | phone numbers are masked in API responses for staff |
| `ticket` | 2,409 | simulated history Jan–Oct 2026, generated with seed 42 |
| `survey_invitation` | 2,230 | |
| `survey_response` | 1,476 | |
| `app_user` | 4 | demo accounts below; passwords are stored as scrypt hashes |

Demo accounts (sample data, not real secrets) — password for all: **`Matkhau@123`**

| Username | Role | Service centre |
|---|---|---|
| `nv.q10` | Staff (`NHAN_VIEN`) – sees masked phone numbers | District 10 (id 1) |
| `ql.q10` | Centre manager (`QUAN_LY`) – sees full phone numbers and the dashboard | District 10 (id 1) |
| `nv.tb`, `ql.tb` | Staff / manager | Tan Binh (id 2) |

Sample survey links (each token is one letter repeated 64 times): `aaaa…` and `eeee…` open (waiting for an answer), `bbbb…` expired, `cccc…`, `dddd…` already answered. Example: `http://localhost:8080/khao-sat/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

## 5. Verify it works

On Windows PowerShell type `curl.exe`, not `curl` (in PowerShell `curl` is an alias of `Invoke-WebRequest`).

| # | Command / action | Expected result |
|---|---|---|
| 1 | `docker compose ps` | three services `db`, `api`, `web`, each with status `Up … (healthy)` |
| 2 | `curl.exe -s http://localhost:3000/health` | `{"status":"ok","db":"up"}` |
| 3 | `docker compose exec api npm test` | ends with `Test Suites: 15 passed, 15 total` · `Tests: 83 passed, 83 total` (the integration tests create and use the `smartcrm_test` database inside the `db` container) |
| 4 | `docker compose exec db psql -U postgres -d smartcrm -c "SELECT COUNT(*) FROM survey_response"` | `1476` (fresh database) |
| 5 | Browser: `http://localhost:8080/khao-sat/` + `a` × 64 | survey page for ticket `BH-000101/2026`; choose CSAT 2, NPS 5, click **Gửi đánh giá** → thank-you message. Opening the link again → "Bạn đã gửi đánh giá cho phiếu này" |
| 6 | Browser: `http://localhost:8080/dang-nhap`, log in as `nv.q10` / `Matkhau@123` → **Danh sách phản hồi**, CSAT max ≤ 2, **Tìm** | the response from step 5 is on top with the label "Cần chăm sóc" and a masked phone number `090****567` |
| 7 | Log out, log in as `ql.q10` → **Dashboard CSAT/NPS** | monthly indicators with comparison to the previous month and to the whole system |
| 8 | Re-run check (C8): `docker compose restart api`, wait until healthy, repeat command 4 | still `1477` (1476 + the response from step 5) – the seed does not duplicate data |

Logs: `docker compose logs api --tail 50` — one JSON line per event; 500/503 errors show a "Mã tra cứu" (lookup code) equal to the `requestId` in the log.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Bind for 0.0.0.0:3000 failed: port is already allocated` (or 8080) | another program uses the port (e.g. a local `npm start`) | set `API_PORT=3001` / `WEB_PORT=8081` in `.env`, then `docker compose up -d` |
| `api` keeps restarting, log says `Thiếu SECRET_KEY` | `.env` missing or `SECRET_KEY` shorter than 16 characters | `cp .env.example .env` again, or set a longer key |
| `api` log: `password authentication failed` after changing `DB_PASSWORD` | the database volume was created with the old password | `docker compose down -v` then `docker compose up -d --build` (this deletes the data) |
| `docker compose ps` shows `api` as `unhealthy` | `/health` returns 503 because the database is unreachable | `docker compose logs db --tail 30`; `docker compose restart db`, then check `/health` again |
| Build fails at `npm ci` | no internet access during the first build | retry with internet access; later builds reuse the cache |

## 7. Monitoring & alerts

Monitoring already in place: every log line is JSON with a `requestId` (also returned in the `X-Request-Id` header and in error messages); `GET /health` checks the API and the database; Docker marks a service `unhealthy` when its health check fails.

**ALERT-01 – API cannot reach the database (technical)**
- Measure: result of `GET /health`, checked every minute (`docker compose ps` health status).
- Threshold: 503 / `"db":"down"` on 3 consecutive checks.
- Notify: on-duty operator, chat message.
- Action: 1) `docker compose logs api --tail 50`, find lines `"không kết nối được cơ sở dữ liệu"`; 2) `docker compose restart db`, wait for `healthy`; 3) `curl.exe -s http://localhost:3000/health` must return `{"status":"ok","db":"up"}`; 4) still failing after 10 minutes → escalate to the developer with the `requestId` values.

**ALERT-02 – Rising number of unhappy customers (business)**
- Measure: number of survey responses with CSAT ≤ 2 ("Cần chăm sóc") per service centre, counted daily from `GET /api/survey-responses?csat_max=2`.
- Threshold: more than 5 in one day for one centre, or twice the same weekday last week.
- Notify: manager of that service centre (e-mail).
- Action: open **Danh sách phản hồi**, filter CSAT ≤ 2 for the day, call back each customer within 24 hours; check the **Dashboard** for a technician whose CSAT dropped versus last month.
