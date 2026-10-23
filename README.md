# Smart CRM – Khảo sát hài lòng CSAT / NPS

**Sinh viên:** Hà Gia Thiên Bảo – MSSV: 2374802010032
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang, HK1 2026–2027
**Luồng nghiệp vụ:** L8 – Khảo sát hài lòng CSAT / NPS (case study Mekong Mobile)

## 1. Mô tả hệ thống

Khi một phiếu bảo hành chuyển sang trạng thái Đã đóng, hệ thống tạo đúng một lời mời khảo sát có mã lời mời ngẫu nhiên và hạn trả lời 7 ngày (QT-10, BR-L8-01). Khách hàng mở link khảo sát trên điện thoại (M1), chấm điểm CSAT 1–5, điểm NPS 0–10 và để lại nhận xét; mỗi lời mời chỉ nhận một phản hồi và phản hồi không sửa được (BR-L8-02, BR-L8-05). Nhân viên đăng nhập để tra cứu danh sách phản hồi của trung tâm mình (M2), phản hồi CSAT ≤ 2 mang nhãn “Cần chăm sóc”; Quản lý trung tâm xem chỉ số CSAT/NPS theo kỹ thuật viên và xu hướng theo tháng có mốc so sánh (M3). Backend Node.js + Express tách lớp routes/controllers → services → repositories trên PostgreSQL; frontend React (Vite) gọi API qua một lớp client riêng.

- **Người dùng:** Khách hàng, Nhân viên (chăm sóc khách hàng), Quản lý trung tâm; hệ thống ngoài: Hệ thống quản lý phiếu bảo hành (mô phỏng bằng lời gọi API1).
- **Không làm:** gửi SMS/Zalo/email thật (mô phỏng bằng link có mã lời mời); tiếp nhận, phân công phiếu bảo hành (thuộc L2, L4); phân tích cảm xúc nhận xét.

## 2. Yêu cầu môi trường

- Node.js 20 LTS trở lên, npm 10 trở lên
- PostgreSQL 16 trở lên (máy em dùng PostgreSQL 18); user có quyền tạo database (mặc định `postgres`)
- Biến môi trường: xem `.env.example` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `APP_PORT`, `FRONTEND_URL`, `INVITATION_VALID_DAYS`, `SECRET_KEY`, `JWT_EXPIRES_IN`). `SECRET_KEY` bắt buộc, tối thiểu 16 ký tự.
- Trình duyệt Chrome/Edge bản mới; cổng 3000 (API) và 5173 (giao diện) còn trống
- Không cần Docker ở Bài tập 2; kiểm thử dùng repository giả nên **không cần PostgreSQL để chạy `npm test`**

## 3. Cài đặt và chạy (mỗi bước một lệnh, chạy từ thư mục gốc repo)

**Backend – terminal 1**

1. Tạo file cấu hình: `cp .env.example .env` (Windows CMD: `copy .env.example .env`) rồi sửa `DB_PASSWORD` cho đúng mật khẩu PostgreSQL và đặt `SECRET_KEY` là một chuỗi ngẫu nhiên ≥ 16 ký tự.
2. Vào thư mục backend: `cd src/backend`
3. Cài thư viện đúng phiên bản trong `package-lock.json`: `npm ci`
4. Tạo CSDL `smartcrm` (nếu chưa có) và các bảng: `npm run migrate`
5. Nạp dữ liệu mẫu: `npm run seed`
6. Khởi động API: `npm start` → `Smart CRM L8 API chạy tại http://localhost:3000`

**Frontend – terminal 2 (để terminal 1 chạy tiếp)**

7. Vào thư mục frontend: `cd src/frontend`
8. Cài thư viện: `npm ci`
9. Khởi động giao diện: `npm run dev` → mở http://localhost:5173

Dữ liệu mẫu: seed 001 (dữ liệu nhỏ có token cố định để thử API) + seed 002 (lịch sử 01–10/2026 **mô phỏng** có seed 42 theo quy mô case study: 24 kỹ thuật viên, ~1.200 khách, 2.409 phiếu, 2.230 lời mời, 1.476 phản hồi – xem TD-16) + seed 003 (tài khoản mẫu). Chạy lại bước 4 và 5 bao nhiêu lần cũng không lỗi và không nhân đôi dữ liệu. Muốn dữ liệu về trạng thái ban đầu (ví dụ token `aaaa…` đã bị dùng khi thử): `npm run db:reset`.

**Tài khoản mẫu** (mật khẩu chung `Matkhau@123`, chỉ dùng ở máy học tập):

| Tên đăng nhập | Vai trò | Trung tâm | Màn hình |
|---|---|---|---|
| `nv.q10` | Nhân viên | Quận 10 | M2 – số điện thoại dạng che |
| `ql.q10` | Quản lý trung tâm | Quận 10 | M2 (số đầy đủ) + M3 Dashboard |
| `nv.tb`, `ql.tb` | Nhân viên / Quản lý | Quận Tân Bình | như trên, dữ liệu trung tâm khác (QT-14) |

## 4. Chạy kiểm thử

```bash
cd src/backend
npm test
```

57 kiểm thử trong `tests/` (Jest + Supertest), mỗi tên ghi rõ loại ở đầu: **[Luồng đúng]**, **[Giá trị biên]**, **[Dữ liệu sai]**. Kiểm thử tự dựng dữ liệu bằng repository giả (`tests/fakes/`), không cần CSDL, không phụ thuộc dữ liệu trên máy chạy.

| Tệp | Kiểm cái gì |
|---|---|
| `invitation.service.test.js` | QT-10: chỉ phiếu Đã đóng, mỗi phiếu 1 lời mời (AC1.1–AC1.3) |
| `survey.service.test.js`, `api.survey.test.js` | BR-L8-01 hạn 7 ngày (biên tròn 7 ngày / trễ 1 ms), BR-L8-02 miền điểm, BR-L8-05 gửi trùng 409, AC2.1–AC2.4 |
| `response.service.test.js` | API4: QT-14 khác trung tâm → 403, AC5.3 ngày ngược, biên 366/367 ngày, hợp đồng `toResponseView`, QT-15 che số |
| `report.service.test.js` | BR-L8-03 công thức NPS và tỉ lệ CSAT, biên NPS 9/6, không có phản hồi → null, chỉ Quản lý được xem |
| `auth.service.test.js` | Đăng nhập đúng/sai, 401 khi thiếu hoặc sai token |
| `customer.service.test.js`, `api.validation.test.js` | CRUD khách hàng, số điện thoại trùng, body sai JSON → 400 |

## 5. Kiểm tra hệ thống đã chạy đúng – luồng chính end-to-end

Chi tiết sáu bước và kết quả quan sát được: [docs/luong-chinh.md](docs/luong-chinh.md).

1. Mô phỏng hệ thống quản lý phiếu báo phiếu đã đóng (terminal 3, Git Bash):
   `curl -s -X POST localhost:3000/api/survey-invitations -H "Content-Type: application/json" -d '{"ticket_code":"BH-000106/2026"}'` → `201` kèm `survey_url`.
2. Mở `survey_url` trên trình duyệt (bật chế độ điện thoại bằng F12 → biểu tượng điện thoại), chọn CSAT 2, NPS 5, nhập nhận xét, bấm **Gửi đánh giá** → lời cảm ơn.
3. Mở http://localhost:5173, đăng nhập `nv.q10` → **Danh sách phản hồi**, chọn CSAT tối đa ≤ 2, bấm **Tìm** → phản hồi vừa gửi ở dòng đầu, nhãn “Cần chăm sóc”, số điện thoại dạng che.
4. Đăng xuất, đăng nhập `ql.q10` → **Dashboard CSAT/NPS**, chọn tháng hiện tại → chỉ số có mốc so sánh với tháng trước và toàn hệ thống.
5. Ba trạng thái: lọc từ 01/12/2026 đến 31/12/2026 → trạng thái rỗng; tắt backend (Ctrl + C ở terminal 1) rồi bấm **Tìm** → thông báo lỗi có nút **Thử lại**; bật lại `npm start`, bấm **Thử lại** → dữ liệu hiện lại.

Kiểm tra nhanh bằng API: `curl -s localhost:3000/db-check` → `{"status":"OK",...}`. Danh sách endpoint: [docs/api-contract.md](docs/api-contract.md). Token mẫu trong seed 001: `aaaa…`, `eeee…` còn hạn · `bbbb…` hết hạn · `cccc…`, `dddd…` đã trả lời (mỗi token là 64 lần lặp một chữ cái).

## 6. Trạng thái hiện tại (buổi 10 – Sprint 2)

- [x] Sprint 1 (buổi 8): migration + seed chạy lại không nhân đôi; CRUD `customer`, `technician`; API1–API3
- [x] Đăng nhập JWT, bảng `app_user` (TD-14); API4 danh sách phản hồi với QT-14, QT-15
- [x] Báo cáo CSAT/NPS theo kỹ thuật viên và xu hướng theo tháng, kèm mốc so sánh (US6, US7)
- [x] Frontend React: M1 khảo sát, M2 danh sách phản hồi, M3 dashboard, Đăng nhập; mọi lời gọi qua `src/api/client.js`
- [x] Ba trạng thái đang tải / rỗng (phân biệt “chưa có dữ liệu” và “bộ lọc không ra kết quả”) / lỗi có nút Thử lại (`DataState`)
- [x] Luồng chính chạy end-to-end trên dữ liệu mẫu ([docs/luong-chinh.md](docs/luong-chinh.md))
- [x] 57 kiểm thử thuộc 3 loại, PASS bằng `npm test`
- [ ] Ảnh chụp luồng chính `docs/evidence/05…11` (em tự chụp trên máy)
- [ ] Sơ đồ kiến trúc thực tế `docs/architecture-thuc-te.drawio`; bổ sung `app_user` vào ERD – buổi 11
- [ ] Docker (khuyến khích), phép thử thư mục trống với link GitHub, báo cáo PDF, tag `v0.2` – buổi 11–12

## 7. Cấu trúc thư mục (ánh xạ với sơ đồ kiến trúc BT1)

```
├── docs/                         # SRS, API contract, luồng chính, nhật ký thay đổi thiết kế, khai báo AI, ảnh minh chứng
├── migrations/                   # 001 DDL BT1 · 002 app_user
├── seeds/                        # 001 mẫu nhỏ · 002 lịch sử mô phỏng (tự sinh) · 003 tài khoản mẫu
├── src/
│   ├── backend/
│   │   ├── routes/               # Lớp trình bày: URL -> controller
│   │   ├── controllers/          # Invitation, Survey, Response, Report, Auth, Customer, Technician Controller
│   │   ├── validators/           # Kiểm tầng 1: kiểu, định dạng dữ liệu vào
│   │   ├── middlewares/          # Xác thực JWT; ánh xạ mã lỗi nghiệp vụ -> mã HTTP (nơi duy nhất)
│   │   ├── services/             # Lớp nghiệp vụ (không có req/res/HTTP); response.contract.js = hợp đồng dữ liệu API4
│   │   ├── repositories/         # Lớp truy cập dữ liệu: chỉ SQL
│   │   ├── errors/, db/, config/ # AppError; pool PostgreSQL; biến môi trường
│   │   ├── scripts/              # migrate, seed, db-reset, gen-sample-data
│   │   └── app.js, container.js, index.js
│   └── frontend/
│       ├── src/api/              # client.js (lớp gọi API duy nhất) + *.api.js (hàm chuyển đổi ở ranh giới)
│       ├── src/components/       # DataState (3 trạng thái), Layout, useAsync, format
│       ├── src/pages/            # SurveyPage (M1), ResponsesPage (M2), DashboardPage (M3), LoginPage
│       └── vite.config.js        # proxy /api -> backend (TD-15)
├── tests/                        # Jest + Supertest, repository giả trong tests/fakes/
├── .env.example                  # Đủ mọi biến, giá trị mẫu (.env thật nằm trong .gitignore)
└── README.md
```

Chiều phụ thuộc một chiều: `pages → api/client → (HTTP) → routes → controllers → services → repositories → PostgreSQL`; chỉ `container.js` nối các lớp backend với nhau.

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
