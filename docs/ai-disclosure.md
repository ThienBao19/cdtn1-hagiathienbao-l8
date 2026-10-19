# Khai báo sử dụng công cụ AI

## Bài tập 2 – Hiện thực hoá module cốt lõi (cập nhật buổi 8, 19/10/2026)

| Công cụ | Dùng vào việc gì | Áp dụng ở tệp / hàm nào | Em đã kiểm chứng thế nào |
|---|---|---|---|
| Claude (Anthropic) | Sinh mã khung 3 lớp và quy tắc nghiệp vụ theo thiết kế BT1 của em (QT-10, BR-L8-01, BR-L8-02, BR-L8-05) | `src/backend/services/invitation.service.js` (`createForTicket`, `computeInvitationStatus`), `src/backend/services/survey.service.js` (`validateResponseInput`, `submitResponse`) | Chạy `npm test` (28 PASS); gọi API1–API3 bằng curl với token mẫu `aaaa…`, `bbbb…`, `cccc…`, đối chiếu từng mã 201/400/404/409/410 với docs/api-contract.md; đọc từng dòng để giải thích được vì sao tại tròn 7 ngày vẫn còn hạn |
| Claude (Anthropic) | Sinh mã CRUD khách hàng, kỹ thuật viên (controller, validator, service, repository) | `src/backend/controllers/`, `validators/`, `services/customer.service.js`, `services/technician.service.js`, `repositories/*.js` | Gọi đủ GET/POST/PUT/DELETE bằng curl; kiểm DELETE chỉ đặt `is_active = false` (QT-13) bằng `SELECT` trong pgAdmin; kiểm sửa khách hàng giữ nguyên số điện thoại không bị báo trùng |
| Claude (Anthropic) | Sinh script migration/seed chạy lại không nhân đôi | `migrations/001_init_schema.sql`, `seeds/001_sample_data.sql`, `src/backend/scripts/migrate.js`, `seed.js`, `db-reset.js` | So sánh migration với `db/schema.sql` BT1 (chỉ khác `IF NOT EXISTS`); chạy `npm run migrate` và `npm run seed` hai lần, đếm số dòng 6 bảng không đổi |
| Claude (Anthropic) | Sinh bộ kiểm thử và repository giả | `tests/*.test.js`, `tests/fakes/in-memory-repositories.js` | Cố ý sửa sai quy tắc (đổi `>` thành `>=` trong `computeInvitationStatus`, đổi giới hạn 500 thành 501) để xác nhận kiểm thử biên báo FAIL, rồi trả lại |
| Claude (Anthropic) | Xử lý lỗi tập trung, ánh xạ mã lỗi nghiệp vụ → HTTP, phản ứng khi CSDL tắt | `src/backend/middlewares/error-handler.js`, `src/backend/errors/app-error.js` | Gửi body không phải JSON → 400 `INVALID_JSON`; tắt dịch vụ PostgreSQL rồi gọi `/api/customers` → 503 `DB_UNAVAILABLE`, server không sập; bật lại thì chạy tiếp |
| Claude (Anthropic) | Soạn nhật ký thay đổi thiết kế, cập nhật README, api-contract | `docs/thay-doi-thiet-ke.md`, `README.md`, `docs/api-contract.md` | Đối chiếu từng TD với SRS, ERD, API contract BT1; làm theo README từ thư mục trống để kiểm các bước |

| Claude (Anthropic) | Sinh kiểm thử HTTP cho API3 theo góp ý GV (AC2.1–AC2.4, 409, 410) | `tests/api.survey.test.js` | Chạy `npm test` (35 PASS); đổi tạm mã 410 trong `middlewares/error-handler.js` thành 400 để xác nhận kiểm thử AC2.3 báo FAIL, rồi trả lại |

**Cam kết:** Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung và mã nguồn nộp kèm, kể cả các phần có công cụ AI hỗ trợ được khai báo ở trên; tôi giải thích được mọi dòng mã khi được yêu cầu.
Họ tên: Hà Gia Thiên Bảo – MSSV: 2374802010032 – Ngày: 19/10/2026

## Bài tập 1 và các buổi trước

| Ngày | Công cụ | Phần áp dụng | Cách dùng (tóm tắt yêu cầu) | Đã chỉnh sửa / kiểm chứng gì |
|---|---|---|---|---|
| 25/09/2026 | Claude (Anthropic) | Cấu trúc repo, .gitignore, .env.example, README khung, endpoint `/`, `/health`, `/db-check` | “Setup repo theo Bài thực hành 1” | Đối chiếu tài liệu Bài thực hành 1; tự chạy backend, kiểm tra 3 endpoint, tự commit/push |
| 02/10/2026 | Claude (Anthropic) | SRS (User Story, GWT, NFR, truy vết), API contract | “Soạn SRS rút gọn 6 mục, API contract cho luồng L8 theo Buổi 3–4” | Đổi actor “Nhân viên Marketing” → “Nhân viên”, bỏ actor Ban giám đốc, chuyển xu hướng cho Quản lý trung tâm; giữ 3 MUST |
| 02/10/2026 | Claude (Anthropic) | Trình bày mục 2 (Use Case Diagram, đặc tả UC2) | “Chỉnh lại bố cục sơ đồ use case và định dạng bảng đặc tả cho rõ ràng, đẹp mắt” | Use case diagram và đặc tả UC2 do em tự xây dựng và tự vẽ; AI chỉ chỉnh trình bày |
| 09/10/2026 | Claude (Anthropic) | Trình bày mục 3, 4, 5 (kiến trúc, ERD, `db/schema.sql`, wireframe M1–M3) | “Chỉnh lại bố cục, định dạng bảng và cách trình bày sơ đồ cho rõ ràng, đẹp mắt” | Nội dung thiết kế, sơ đồ, wireframe và SQL DDL do em tự xây dựng và tự vẽ; AI chỉ chỉnh trình bày |
| — | Không dùng | Chọn luồng L8, track SE, phiếu phạm vi | — | Tự chọn theo tiêu chí phạm vi Buổi 2 |
