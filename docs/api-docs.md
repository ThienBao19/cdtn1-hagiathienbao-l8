# API Documentation — Smart CRM, flow L8 "CSAT/NPS satisfaction survey" (tag v1.0)

Base URL: `http://localhost:3000` (Docker Compose; through the web app the same API is at `http://localhost:8080/api`). Format: JSON, UTF-8. Times are ISO 8601 in UTC. Every response carries an `X-Request-Id` header.

All examples below were copied from real calls against the running system with the sample data (13/11/2026); long values are shortened with `…`. The route list matches `src/backend/routes/index.js` and `src/backend/app.js`: **20 endpoints** (3 system, 1 login, 3 survey, 1 response list, 2 reports, 5 customer, 5 technician).

## 0. Conventions

**Authentication.** Log in with `POST /api/auth/login`, then send `Authorization: Bearer <token>`. Public endpoints (no token): `GET /`, `GET /health`, `GET /db-check`, `POST /api/auth/login`, `GET /api/surveys/{token}`, `POST /api/surveys/{token}/responses` — the survey endpoints are protected by the 64-character random invitation token itself. Every other endpoint returns `401 UNAUTHORIZED` without a valid token.

**Roles.** `NHAN_VIEN` (staff) and `QUAN_LY` (service-centre manager); each account belongs to one service centre (`center_id`).

**Error format** (same for every endpoint):

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Vui lòng chọn mức hài lòng", "field": "csat_score" } }
```

`field` is present on validation errors; `details` on `ALREADY_RESPONDED`. Messages are Vietnamese because they are shown to end users; clients must branch on `code`, not on `message`.

| HTTP | Codes |
|---|---|
| 400 | `VALIDATION_ERROR` (with `field`), `INVALID_JSON`, `CENTER_NOT_FOUND` |
| 401 | `UNAUTHORIZED` (missing / invalid / expired token), `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` (wrong role or another service centre) |
| 404 | `NOT_FOUND` (unknown route), `TICKET_NOT_FOUND`, `INVITATION_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `TECHNICIAN_NOT_FOUND` |
| 409 | `TICKET_NOT_CLOSED`, `INVITATION_EXISTS`, `ALREADY_RESPONDED`, `PHONE_EXISTS`, `CUSTOMER_INACTIVE`, `TECHNICIAN_INACTIVE` |
| 410 | `INVITATION_EXPIRED` |
| 500 / 503 | `INTERNAL_ERROR` / `DB_UNAVAILABLE` — message ends with "Mã tra cứu: <requestId>"; no stack trace or SQL is returned |

**Global limits.** Request body ≤ 20 kB. No rate limiting in this prototype (see "Limits" of each endpoint).

---

## 1. System

### 1.1 `GET /`
- **Description:** liveness text.
- **Auth:** public. **Parameters:** none.
- **Success:** `200` `Hello Smart CRM – L8 CSAT/NPS`
- **Errors:** none. **Limits:** none.

### 1.2 `GET /health`
- **Description:** health check used by Docker and by the Deployment Guide; checks the API **and** the database (`SELECT 1`).
- **Auth:** public. **Parameters:** none.
- **Success:** `200 {"status":"ok","db":"up"}`
- **Errors:** `503 {"status":"degraded","db":"down"}` when the database does not answer (no error detail is exposed).
- **Limits:** none.

### 1.3 `GET /db-check`
- **Description:** returns the database server time (diagnostics).
- **Auth:** public. **Parameters:** none.
- **Success:** `200 {"status":"OK","server_time":"2026-11-13T06:54:57.416Z"}`
- **Errors:** `503 DB_UNAVAILABLE`. **Limits:** none.

## 2. Authentication

### 2.1 `POST /api/auth/login`
- **Description:** staff / manager login; returns a JWT that carries `role` and `center_id`.
- **Auth:** public.
- **Parameters (body):** `username` (string, required), `password` (string, required).
- **Success:** `200`
  ```json
  {"token":"eyJhbGciOiJIUzI1NiIs…","user":{"username":"nv.q10","full_name":"Nguyễn Thị Lan","role":"NHAN_VIEN","center_id":1,"center_name":"Trung tâm bảo hành Quận 10"}}
  ```
- **Errors:** `400 VALIDATION_ERROR` (missing field) · `401 INVALID_CREDENTIALS` "Sai tên đăng nhập hoặc mật khẩu" — the same message for an unknown user, a wrong password or a disabled account.
- **Limits:** token lifetime `JWT_EXPIRES_IN` (default 8 h). Passwords are stored as scrypt hashes.

## 3. Survey (customer side)

### 3.1 `POST /api/survey-invitations` — API1
- **Description:** create the survey invitation for a ticket that has just been closed (called by the warranty-ticket system; simulated with curl). Business rules QT-10 (only closed tickets, one invitation per ticket) and BR-L8-01 (valid 7 days).
- **Auth:** Bearer token, any role.
- **Parameters (body):** `ticket_code` (string, required, pattern `BH-\d{6}/\d{4}`, e.g. `BH-000106/2026`).
- **Success:** `201`
  ```json
  {"invitation_id":12401,"ticket_code":"BH-000106/2026","token":"8688ed4d2196…af70e","status":"CHO_TRA_LOI","expires_at":"2026-11-20T06:52:01.298Z","survey_url":"http://localhost:5173/khao-sat/8688ed4d2196…af70e"}
  ```
- **Errors:** `400 VALIDATION_ERROR` field `ticket_code` · `401 UNAUTHORIZED` · `404 TICKET_NOT_FOUND` · `409 TICKET_NOT_CLOSED` · `409 INVITATION_EXISTS` "Phiếu đã có lời mời khảo sát".
- **Limits:** one invitation per ticket, enforced by a UNIQUE constraint even for concurrent calls. `survey_url` uses `FRONTEND_URL` (`http://localhost:8080` under Docker).

### 3.2 `GET /api/surveys/{token}` — API2
- **Description:** data for the survey page the customer opens from the link.
- **Auth:** public (the token is the credential).
- **Parameters (path):** `token` — 64 hex characters.
- **Success:** `200`
  ```json
  {"ticket_code":"BH-000101/2026","center_name":"Trung tâm bảo hành Quận 10","device_model":"iPhone 13 128GB","closed_at":"2026-11-11T06:51:58.910Z","status":"CHO_TRA_LOI","expires_at":"2026-11-18T06:51:58.910Z"}
  ```
- **Errors:** `404 INVITATION_NOT_FOUND` "Link khảo sát không hợp lệ" · `409 ALREADY_RESPONDED` with `details` `{"csat_score":2,"nps_score":4,"responded_at":"…"}` · `410 INVITATION_EXPIRED` "Link khảo sát đã hết hạn".
- **Limits:** a link is valid until exactly `created_at + 7 days` (inclusive); 1 ms later it is expired.

### 3.3 `POST /api/surveys/{token}/responses` — API3
- **Description:** submit the customer's answer (BR-L8-02, BR-L8-05: one response per invitation, cannot be edited). CSAT ≤ 2 is flagged "Cần chăm sóc" (BR-L8-04).
- **Auth:** public (token in path).
- **Parameters (body):** `csat_score` integer 1–5 **required** · `nps_score` integer 0–10 optional · `comment` string optional, ≤ 500 characters (counted as Unicode characters; an emoji counts as one), trimmed, empty → `null`.
- **Success:** `201`
  ```json
  {"response_id":12401,"ticket_code":"BH-000101/2026","csat_score":2,"nps_score":5,"comment":"Sửa lâu, không báo trước","is_flagged":true,"responded_at":"2026-11-13T06:52:01.360Z"}
  ```
- **Errors:** `400 VALIDATION_ERROR` field `csat_score` ("Vui lòng chọn mức hài lòng" / "Điểm CSAT phải là số nguyên từ 1 đến 5"), `nps_score`, `comment` ("Nhận xét tối đa 500 ký tự (hiện có 501)") · `400 INVALID_JSON` · `404 INVITATION_NOT_FOUND` · `409 ALREADY_RESPONDED` (also for two simultaneous submissions — only one is stored) · `410 INVITATION_EXPIRED`.
- **Limits:** exactly one response per invitation (UNIQUE constraint).

## 4. Staff and manager

### 4.1 `GET /api/survey-responses` — API4
- **Description:** list of survey responses of the caller's service centre, newest first (QT-14). Phone numbers are masked for `NHAN_VIEN` and shown in full for `QUAN_LY` (QT-15).
- **Auth:** Bearer token, any role.
- **Parameters (query):** `center_id` (optional; must equal the caller's centre) · `from`, `to` (`YYYY-MM-DD`, Vietnam time, `to` inclusive) · `csat_max` (1–5) · `page` (≥ 1, default 1) · `page_size` (1–100, default 20).
- **Success:** `200` (example `?csat_max=2&page_size=1` as `nv.q10`)
  ```json
  {"total":16,"page":1,"page_size":1,"items":[{"response_id":12401,"ticket_code":"BH-000101/2026","center_name":"Trung tâm bảo hành Quận 10","customer_name":"Nguyễn Văn Hùng","phone":"090****567","technician_name":"Lê Minh Dũng","csat_score":2,"nps_score":5,"comment":"Sửa lâu, không báo trước","is_flagged":true,"responded_at":"2026-11-13T06:52:01.360Z"}]}
  ```
- **Errors:** `400 VALIDATION_ERROR` (`from` after `to`; range > 366 days; bad date; `csat_max` not 1–5 — e.g. `csat_max=2' OR '1'='1` → field `csat_max`) · `401` · `403 FORBIDDEN` "Bạn chỉ được xem phản hồi của trung tâm mình phụ trách".
- **Limits:** `page_size` ≤ 100; date range ≤ 366 days. `total = 0` and `items = []` when nothing matches.

### 4.2 `GET /api/reports/technicians` — US6
- **Description:** CSAT average, CSAT rate (% of 4–5) and NPS (% 9–10 minus % 0–6, among responses that have an NPS score) per technician of the caller's centre for one month, with the previous month for comparison. Lowest CSAT first.
- **Auth:** Bearer token, role `QUAN_LY` only.
- **Parameters (query):** `month` (`YYYY-MM`, default current month, Vietnam time).
- **Success:** `200` (shortened)
  ```json
  {"center_id":1,"month":"2026-10","previous_month":"2026-09",
   "center":{"current":{"responses":22,"csat_avg":4.05,"csat_rate":81.8,"nps":-17,"nps_responses":18},"previous":{"responses":41,"csat_avg":4.1,"csat_rate":70.7,"nps":16,"nps_responses":38}},
   "technicians":[{"technician_id":101,"technician_name":"Võ Hữu Phúc","level":"SO_CAP","current":{"responses":5,"csat_avg":3.6,"csat_rate":40,"nps":-60,"nps_responses":5},"previous":{…}}, …]}
  ```
- **Errors:** `400 VALIDATION_ERROR` field `month` · `401` · `403 FORBIDDEN` "Chỉ Quản lý trung tâm được xem báo cáo này".
- **Limits:** indicators are `null` (not 0) when there is no response; NPS is rounded half away from zero.

### 4.3 `GET /api/reports/monthly-trend` — US7
- **Description:** monthly CSAT/NPS of the caller's centre, with the whole system as a reference.
- **Auth:** Bearer token, role `QUAN_LY` only.
- **Parameters (query):** `from`, `to` (`YYYY-MM`; defaults: January of the `to` year … current month).
- **Success:** `200`
  ```json
  {"center_id":1,"from":"2026-09","to":"2026-10","months":[
   {"month":"2026-09","center":{"responses":41,"csat_avg":4.1,"csat_rate":70.7,"nps":16,"nps_responses":38},"system":{"responses":148,"csat_avg":3.75,"csat_rate":56.8,"nps":-11,"nps_responses":132}},
   {"month":"2026-10","center":{"responses":22,"csat_avg":4.05,"csat_rate":81.8,"nps":-17,"nps_responses":18},"system":{"responses":89,"csat_avg":3.96,"csat_rate":75.3,"nps":-4,"nps_responses":75}}]}
  ```
- **Errors:** `400 VALIDATION_ERROR` ("from phải có dạng YYYY-MM, ví dụ 2026-09"; `from` after `to`; more than 24 months) · `401` · `403 FORBIDDEN`.
- **Limits:** at most 24 months; every month of the range is present (indicators `null` when empty).

## 5. Customers (CRUD)

Auth for all five: Bearer token, any role. Phone numbers are always returned masked. "Delete" never removes a row (QT-13): it sets `is_active = false`.

| # | Endpoint | Description · parameters | Success (real example) | Errors | Limits |
|---|---|---|---|---|---|
| 5.1 | `GET /api/customers` | list; query `include_inactive=true` to include inactive | `200 {"total":1206,"items":[{"customer_id":1,"full_name":"Nguyễn Văn Hùng","phone":"090****567","is_active":true,"created_at":"…"}, …]}` | `401` | no paging (prototype) |
| 5.2 | `GET /api/customers/{id}` | one customer | `200 {"customer_id":6,"full_name":"Đặng Minh Thư","phone":"097****999","is_active":true,…}` | `400` bad id · `401` · `404 CUSTOMER_NOT_FOUND` | — |
| 5.3 | `POST /api/customers` | body `full_name` (required, ≤ 120), `phone` (required, 10 digits starting with 0, unique) | `201 {"customer_id":2201,"full_name":"Ngô Thị Hạnh","phone":"090****222","is_active":true,…}` | `400 VALIDATION_ERROR` field `phone` "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0" · `401` · `409 PHONE_EXISTS` | phone unique |
| 5.4 | `PUT /api/customers/{id}` | same body as 5.3 | `200` updated customer | `400` · `401` · `404` · `409 PHONE_EXISTS` · `409 CUSTOMER_INACTIVE` | inactive customers cannot be edited |
| 5.5 | `DELETE /api/customers/{id}` | deactivate | `200 {"customer_id":6,…,"is_active":false}` | `400` · `401` · `404` | idempotent: calling again returns the same result |

## 6. Technicians (CRUD)

A technician belongs to one service centre. Reading: any logged-in user. Creating, editing and deactivating: **only the `QUAN_LY` of that same centre**; a technician cannot be moved to another centre (OWASP A01, fixed in BUG-009).

| # | Endpoint | Description · parameters | Success (real example) | Errors | Limits |
|---|---|---|---|---|---|
| 6.1 | `GET /api/technicians` | list; query `center_id`, `include_inactive=true` | `200 {"total":5,"items":[{"technician_id":1,"center_id":1,"center_name":"Trung tâm bảo hành Quận 10","full_name":"Lê Minh Dũng","level":"CAO_CAP","is_active":true}, …]}` (`?center_id=1`) | `400` bad `center_id` · `401` | — |
| 6.2 | `GET /api/technicians/{id}` | one technician | `200 {"technician_id":1,…,"level":"CAO_CAP","is_active":true}` | `401` · `404 TECHNICIAN_NOT_FOUND` | — |
| 6.3 | `POST /api/technicians` | body `center_id` (required, existing centre), `full_name` (required, ≤ 120), `level` ∈ `SO_CAP`, `TRUNG_CAP`, `CAO_CAP` | `201 {"technician_id":119,"center_id":1,…,"full_name":"Bùi Văn Tài","level":"SO_CAP","is_active":true}` (as `ql.q10`) | `400 VALIDATION_ERROR` "Thiếu trường bắt buộc: full_name" · `400 CENTER_NOT_FOUND` · `401` · `403 FORBIDDEN` (staff, or another centre) | — |
| 6.4 | `PUT /api/technicians/{id}` | same body as 6.3 | `200` updated technician | `400` · `401` · `403 FORBIDDEN` · `404` · `409 TECHNICIAN_INACTIVE` | `center_id` must stay the caller's centre |
| 6.5 | `DELETE /api/technicians/{id}` | deactivate (kept for old reports, QT-13) | `200 {"technician_id":2,…,"is_active":false}` | `401` · `403 FORBIDDEN` "Chỉ Quản lý của trung tâm này được thay đổi kỹ thuật viên của trung tâm" · `404` | idempotent |

Any other path: `404 {"error":{"code":"NOT_FOUND","message":"Không có endpoint GET /api/khong-co"}}`.
