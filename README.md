# Smart CRM – Khảo sát hài lòng CSAT / NPS

**Sinh viên:** Hà Gia Thiên Bảo – MSSV: 2374802010032
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang, HK1 2026–2027
**Luồng nghiệp vụ:** L8 – Khảo sát hài lòng CSAT / NPS (case study Mekong Mobile)

## 1. Mô tả bài toán

Thu thập và tổng hợp khảo sát hài lòng sau bảo hành: khi phiếu bảo hành chuyển sang trạng thái đã đóng, hệ thống tạo một lời mời khảo sát duy nhất cho khách hàng, khách hàng chấm điểm CSAT (1–5), NPS (0–10) và để lại nhận xét, hệ thống lưu phản hồi, gắn cờ phản hồi điểm thấp và tổng hợp chỉ số hài lòng theo trung tâm, kỹ thuật viên và theo tháng trên dashboard cho quản lý.

- **Bắt đầu:** phiếu bảo hành chuyển sang trạng thái đã đóng.
- **Kết thúc:** chỉ số CSAT/NPS được tổng hợp và hiển thị trên dashboard.
- **Người dùng:** Khách hàng, Marketing, Quản lý trung tâm bảo hành, Ban giám đốc.

## 2. Phạm vi

- **Làm:**
  - Tự tạo lời mời khảo sát khi phiếu đã đóng (mỗi phiếu một lần – QT-10).
  - Trang khảo sát cho khách: chấm CSAT 1–5, NPS 0–10, nhận xét.
  - Danh sách phản hồi, lọc theo trung tâm / thời gian / mức điểm; gắn cờ phản hồi điểm thấp.
  - Dashboard CSAT/NPS theo trung tâm, kỹ thuật viên, tháng.
- **Không làm:**
  - Tiếp nhận, phân loại, phân công phiếu bảo hành (thuộc L2, L4).
  - Gửi SMS / Zalo / email thật (mô phỏng bằng link có mã).
  - Phân tích cảm xúc nhận xét dạng văn bản (mức COULD).

## 3. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js 20 LTS + Express (REST API) |
| Cơ sở dữ liệu | PostgreSQL 16 (máy cài bản 18 vẫn chạy được schema) |
| Frontend | React + Vite |
| Kiểm thử | Jest + Supertest |
| Công cụ | Git/GitHub, VS Code, Postman |

## 4. Cấu trúc thư mục

```
├── docs/            # SRS, sơ đồ, khai báo AI
│   └── diagrams/
├── src/
│   ├── backend/     # Node.js + Express API
│   └── frontend/    # React (trang khảo sát, dashboard)
├── tests/           # Unit / API test
├── data/
│   └── sample/      # Mẫu dữ liệu nhỏ (bộ đầy đủ tải từ LMS)
├── .env.example     # Tên biến môi trường, không chứa giá trị thật
├── .gitignore
└── README.md
```

## 5. Hướng dẫn cài đặt & chạy

Yêu cầu: Node.js 20 LTS, PostgreSQL 16 (database `smartcrm`).

1. `cp .env.example .env` rồi điền `DB_USER`, `DB_PASSWORD`.
2. `cd src/backend && npm install`
3. `npm start`
4. Mở http://localhost:3000 (Hello Smart CRM), http://localhost:3000/health và http://localhost:3000/db-check (status: OK).

## 6. Khai báo sử dụng công cụ AI

| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
| Claude | Gợi ý cấu trúc repo, .gitignore, .env.example, README khung, endpoint kiểm tra môi trường | Đối chiếu tài liệu Bài thực hành 1; tự chạy backend và kiểm tra 3 endpoint |

Chi tiết: [docs/ai-disclosure.md](docs/ai-disclosure.md)

## 7. Trạng thái hiện tại

- [x] Khởi tạo cấu trúc repo, .gitignore, .env.example (Buổi 2)
- [x] Bài tập 1 – Phân tích và Thiết kế (Buổi 6): SRS, use case, kiến trúc, ERD + DDL, wireframe
- [ ] Smoke test: `/`, `/health`, `/db-check` chạy được, ảnh chụp lưu trong docs/
- [ ] Module 1 – Lời mời & trả lời khảo sát (Buổi 8–10)
- [ ] Module 2 – Tổng hợp & dashboard CSAT/NPS (Buổi 10–12)

## 8. Hồ sơ Bài tập 1 (Phân tích và Thiết kế)

| Thành phần | File gốc | Ảnh xuất |
|---|---|---|
| Bản nộp PDF | `BT1_2374802010032_HaGiaThienBao.pdf` | — |
| SRS rút gọn (mục 1) | `docs/srs.md` | — |
| Use Case (mục 2) | `docs/diagrams/usecase-l8.drawio` | `docs/export/usecase-l8.png` |
| Kiến trúc (mục 3) | `docs/architecture.drawio` | `docs/export/architecture.png` |
| ERD + DDL (mục 4) | `docs/erd.drawio`, `db/schema.sql` | `docs/export/erd.png` |
| Wireframe (mục 5) | `docs/wireframe.drawio` | `docs/export/wireframe-m1..m3.png` |
| API contract (track SE) | `docs/api-contract.md` | — |
| Khai báo AI | `docs/ai-disclosure.md` | — |

Mở file `.drawio` bằng https://app.diagrams.net (File → Open from → Device). Tạo CSDL: `psql -U postgres -d smartcrm -f db/schema.sql`.
