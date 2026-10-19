# Smart CRM – Khảo sát hài lòng CSAT / NPS

**Sinh viên:** Hà Gia Thiên Bảo – MSSV: 2374802010032
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang, HK1 2026–2027
**Luồng nghiệp vụ:** L8 – Khảo sát hài lòng CSAT / NPS (case study Mekong Mobile)

## 1. Mô tả hệ thống

Khi một phiếu bảo hành chuyển sang trạng thái Đã đóng, hệ thống tạo đúng một lời mời khảo sát có mã lời mời ngẫu nhiên và hạn trả lời 7 ngày (QT-10, BR-L8-01). Khách hàng mở link khảo sát, chấm điểm CSAT 1–5, điểm NPS 0–10 và để lại nhận xét; mỗi lời mời chỉ nhận một phản hồi và phản hồi không sửa được (BR-L8-02, BR-L8-05). Nhân viên tra cứu danh sách phản hồi, phản hồi CSAT ≤ 2 mang nhãn “Cần chăm sóc”; Quản lý trung tâm xem chỉ số CSAT/NPS theo kỹ thuật viên và theo tháng. Hệ thống gồm backend Node.js + Express tách ba lớp routes/controllers → services → repositories trên PostgreSQL; frontend React làm ở Sprint 2.

- **Người dùng:** Khách hàng, Nhân viên (chăm sóc khách hàng), Quản lý trung tâm; hệ thống ngoài: Hệ thống quản lý phiếu bảo hành.
- **Không làm:** gửi SMS/Zalo/email thật (mô phỏng bằng link có mã lời mời); tiếp nhận, phân công phiếu bảo hành (thuộc L2, L4); phân tích cảm xúc nhận xét.

## 2. Yêu cầu môi trường

- Node.js 20 LTS trở lên, npm 10 trở lên
- PostgreSQL 16 trở lên (máy em dùng PostgreSQL 18); user có quyền tạo database (mặc định `postgres`)
- Biến môi trường: xem `.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `APP_PORT`, `FRONTEND_URL`, `INVITATION_VALID_DAYS`, `SECRET_KEY`)
- Không cần Docker ở Bài tập 2; kiểm thử dùng repository giả nên **không cần PostgreSQL để chạy `npm test`**

## 3. Cài đặt và chạy (mỗi bước một lệnh, chạy từ thư mục gốc repo)

1. Tạo file cấu hình: `cp .env.example .env` (Windows CMD: `copy .env.example .env`) rồi sửa `DB_PASSWORD` cho đúng mật khẩu PostgreSQL của máy.
2. Vào thư mục backend: `cd src/backend`
3. Cài thư viện đúng phiên bản trong `package-lock.json`: `npm ci`
4. Tạo CSDL `smartcrm` (nếu chưa có) và 6 bảng theo DDL BT1: `npm run migrate`
5. Nạp dữ liệu mẫu (6 trung tâm, 6 kỹ thuật viên, 6 khách hàng, 9 phiếu, 5 lời mời, 2 phản hồi): `npm run seed`
6. Khởi động API: `npm start` → `Smart CRM L8 API chạy tại http://localhost:3000`

Chạy lại bước 4 và 5 bao nhiêu lần cũng không lỗi và không nhân đôi dữ liệu (migration đã chạy được ghi trong bảng `schema_migrations`; seed dùng khoá cố định + `ON CONFLICT DO NOTHING`). Muốn dữ liệu mẫu về trạng thái ban đầu (ví dụ lời mời `aaaa…` đã bị trả lời khi thử): `npm run db:reset`.

## 4. Chạy kiểm thử

```bash
cd src/backend
npm test
```

35 kiểm thử trong `tests/` (Jest + Supertest) thuộc ba loại, mỗi tên kiểm thử ghi rõ loại ở đầu:

| Loại | Ví dụ | Tệp |
|---|---|---|
| Luồng đúng | AC1.1 phiếu Đã đóng → tạo đúng 1 lời mời, token 64 hex, hạn 7 ngày | `tests/invitation.service.test.js` |
| Giá trị biên | BR-L8-01 tròn 7 ngày còn nhận, trễ 1 ms là hết hạn; CSAT 1/5 hợp lệ, 0/6 bị từ chối; nhận xét 500/501 ký tự | `tests/survey.service.test.js` |
| Luồng đúng / Dữ liệu sai qua HTTP (theo góp ý GV) | API3 AC2.1–AC2.4: gửi trùng → 409, hết hạn → 410, thiếu CSAT → 400 | `tests/api.survey.test.js` |
| Dữ liệu sai | Thiếu `csat_score` → 400 kèm `field: "csat_score"`; body không phải JSON → 400; trùng số điện thoại → 409 | `tests/api.validation.test.js`, `tests/customer.service.test.js` |

Kiểm thử tự dựng dữ liệu bằng repository giả trong bộ nhớ (`tests/fakes/`), không phụ thuộc dữ liệu trên máy chạy.

## 5. Kiểm tra hệ thống đã chạy đúng

Sau bước 6, mở terminal thứ hai (trên Windows PowerShell gõ `curl.exe` thay cho `curl`):

| Lệnh | Kết quả mong đợi |
|---|---|
| `curl -s localhost:3000/db-check` | `{"status":"OK","server_time":...}` |
| `curl -s localhost:3000/api/customers` | 6 khách hàng, số điện thoại dạng che `090****567` |
| `curl -s -X POST localhost:3000/api/survey-invitations -H "Content-Type: application/json" -d "{\"ticket_code\":\"BH-000106/2026\"}"` | `201`, có `token` 64 ký tự và `expires_at` sau 7 ngày; gọi lần 2 → `409 INVITATION_EXISTS` |
| `curl -s -X POST localhost:3000/api/survey-invitations -H "Content-Type: application/json" -d "{\"ticket_code\":\"BH-000108/2026\"}"` | `409 TICKET_NOT_CLOSED` (phiếu Hoàn tất, chưa đóng) |
| `curl -s localhost:3000/api/surveys/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | `200`, thông tin phiếu BH-000101/2026, `status: CHO_TRA_LOI` |
| `curl -s localhost:3000/api/surveys/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` | `410 INVITATION_EXPIRED` (lời mời tạo 8 ngày trước) |
| `curl -s -X POST localhost:3000/api/surveys/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/responses -H "Content-Type: application/json" -d "{\"nps_score\":9}"` | `400`, `"field":"csat_score"`, “Vui lòng chọn mức hài lòng” |
| như trên với `-d "{\"csat_score\":4,\"nps_score\":9}"` | `201`, `is_flagged: false`; gửi lại → `409 ALREADY_RESPONDED` |

Token mẫu trong seed: `aaaa…` và `eeee…` còn hạn · `bbbb…` hết hạn · `cccc…`, `dddd…` đã trả lời (mỗi token là 64 lần lặp một chữ cái). Danh sách endpoint đầy đủ: [docs/api-contract.md](docs/api-contract.md).

## 6. Trạng thái hiện tại (buổi 8 – Sprint 1)

- [x] Ghi quyết định điều chỉnh thiết kế sau phản hồi BT1: [docs/thay-doi-thiet-ke.md](docs/thay-doi-thiet-ke.md)
- [x] Cấu trúc `src/backend/` ánh xạ một–một với sơ đồ kiến trúc BT1 (mục 7)
- [x] Migration `001_init_schema.sql` theo DDL BT1, chạy lại không lỗi; seed dữ liệu mẫu chạy lại không nhân đôi
- [x] CRUD đủ 4 thao tác cho 2 thực thể `customer`, `technician` qua routes → services → repositories
- [x] API1 tạo lời mời (QT-10), API2 mở khảo sát, API3 gửi phản hồi (BR-L8-01, BR-L8-02, BR-L8-05)
- [x] 35 kiểm thử thuộc 3 loại, chạy bằng `npm test`, PASS
- [x] CSDL tắt → API trả `503 DB_UNAVAILABLE` sau ≤ 3 giây, không treo, không sập
- [ ] API4 danh sách phản hồi (US5) + đăng nhập JWT, phân quyền theo trung tâm (QT-14) – buổi 9
- [ ] Frontend React 3 màn hình M1–M3 với 3 trạng thái đang tải / rỗng / lỗi – buổi 10
- [ ] Báo cáo CSAT/NPS theo kỹ thuật viên, theo tháng (US6, US7) – buổi 10–11
- [ ] Sơ đồ kiến trúc thực tế `docs/architecture-thuc-te.drawio`, phép thử thư mục trống, tag `v0.2` – buổi 11–12

## 7. Cấu trúc thư mục (ánh xạ với sơ đồ kiến trúc BT1)

```
├── docs/                         # SRS, API contract, sơ đồ, nhật ký thay đổi thiết kế, khai báo AI
├── migrations/001_init_schema.sql   # Lớp lưu trữ – DDL BT1 (+ IF NOT EXISTS)
├── seeds/001_sample_data.sql        # Dữ liệu mẫu, chạy lại không nhân đôi
├── src/
│   ├── backend/
│   │   ├── routes/               # Lớp trình bày: URL -> controller
│   │   ├── controllers/          # Lớp trình bày: InvitationController, SurveyController, Customer/TechnicianController
│   │   ├── validators/           # Kiểm tầng 1: kiểu, định dạng dữ liệu vào
│   │   ├── middlewares/          # Ánh xạ mã lỗi nghiệp vụ -> mã HTTP (nơi duy nhất)
│   │   ├── services/             # Lớp nghiệp vụ: InvitationService, SurveyService, Customer/TechnicianService (không có req/res/HTTP)
│   │   ├── repositories/         # Lớp truy cập dữ liệu: Ticket/Invitation/Response/Customer/TechnicianRepository (chỉ SQL)
│   │   ├── errors/               # AppError (mã lỗi nghiệp vụ), ValidationError, DuplicateKeyError
│   │   ├── db/, config/          # Pool PostgreSQL, đọc biến môi trường
│   │   ├── scripts/              # migrate, seed, db-reset
│   │   ├── app.js, container.js, index.js
│   │   └── package.json, package-lock.json
│   └── frontend/                 # React (Sprint 2)
├── tests/                        # Jest + Supertest, repository giả trong tests/fakes/
├── .env.example                  # Đủ mọi biến, giá trị mẫu (.env thật nằm trong .gitignore)
└── README.md
```

Chiều phụ thuộc một chiều: `routes → controllers → services → repositories → PostgreSQL`; chỉ `container.js` nối các lớp với nhau.

## 8. Khai báo sử dụng công cụ AI

Chi tiết từng phần, kèm cách em đã kiểm chứng: [docs/ai-disclosure.md](docs/ai-disclosure.md)

## 9. Hồ sơ Bài tập 1 (Phân tích và Thiết kế)

| Thành phần | File gốc | Ảnh xuất |
|---|---|---|
| Bản nộp PDF | `BT1_2374802010032_HaGiaThienBao.pdf` | — |
| SRS rút gọn (mục 1) | `docs/srs.md` | — |
| Use Case (mục 2) | `docs/diagrams/usecase-l8.drawio` | `docs/export/usecase-l8.png` |
| Kiến trúc (mục 3) | `docs/architecture.drawio` | `docs/export/architecture.png` |
| ERD + DDL (mục 4) | `docs/erd.drawio`, `migrations/001_init_schema.sql` (trước đây `db/schema.sql`) | `docs/export/erd.png` |
| Wireframe (mục 5) | `docs/wireframe.drawio` | `docs/export/wireframe-m1..m3.png` |
| API contract (track SE) | `docs/api-contract.md` | — |

Mở file `.drawio` bằng https://app.diagrams.net (File → Open from → Device).
