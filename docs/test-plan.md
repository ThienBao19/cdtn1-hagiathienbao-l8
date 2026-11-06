# Test Plan – Luồng L8: Khảo sát hài lòng CSAT/NPS (track SE)

Hà Gia Thiên Bảo – 2374802010032 · Buổi 14 (06/11/2026) · Thành phần 1 của Bài tập 3. Kết quả chạy: [test-report.md](test-report.md) · lỗi: [bug-log.md](bug-log.md).

## 1. Phạm vi

**Kiểm:** tạo lời mời khảo sát khi phiếu Đã đóng (QT-10), hạn trả lời 7 ngày (BR-L8-01), miền điểm và độ dài nhận xét (BR-L8-02), công thức CSAT/NPS (BR-L8-03), nhãn “Cần chăm sóc” (BR-L8-04), mỗi lời mời một phản hồi kể cả khi gửi cùng lúc (BR-L8-05, NFR5), chỉ xem trung tâm mình (QT-14), che số điện thoại (QT-15), phân quyền các endpoint nội bộ (OWASP A01), chạy lại migration + seed (C8).

**Cố ý KHÔNG kiểm (và lý do):**

| Không kiểm | Lý do |
|---|---|
| Giao diện React bằng công cụ tự động (Playwright/Cypress) | Mọi quy tắc nằm ở backend và đã kiểm qua API; giao diện đã kiểm bằng tay theo `docs/luong-chinh.md` (ảnh `docs/evidence/`) |
| Hiệu năng, tải, NFR2 thời gian phản hồi | Thuộc Chuyên đề tốt nghiệp 2 |
| Gửi SMS/Zalo thật | Ngoài phạm vi L8 – lời mời mô phỏng bằng API1 |
| CRUD khách hàng/kỹ thuật viên ngoài phân quyền | Không có quy tắc của L8; đã có test riêng (`customer.service.test.js`, `api.validation.test.js`) |
| Docker Compose | Kiểm ở buổi 15–16 (thành phần 4 BT3) |

## 2. Loại test và số lượng mỗi tầng

12 test case trong Test Report, phân bố hình kim tự tháp: **7 unit** (TC-01 → TC-07, `tests/test-cases/tc-unit.test.js`) · **2 integration** với PostgreSQL thật (TC-09, TC-12, `tc-integration.test.js`) · **3 API** bằng Supertest (TC-08, TC-10, TC-11, `tc-api.test.js`). Ngoài ra còn 65 test tự động khác có từ Sprint 1–2 (tổng 77, chạy chung bằng `npm test`).

Đủ năm loại BT3: luồng đúng ×3 (TC-01, TC-04, TC-05) · giá trị biên ×4 (TC-02/TC-03 hai bên cùng ranh giới hạn 7 ngày; TC-06; TC-07) · dữ liệu sai ×2 (TC-08, TC-09) · bảo mật ×2 (TC-10, TC-11) · tái lập ×1 (TC-12).

Kỹ thuật chọn dữ liệu:

- **Phân vùng tương đương:** CSAT có ba vùng < 1 · 1–5 · > 5 → lấy 6 làm đại diện vùng sai (TC-08); người gọi có ba vùng chưa đăng nhập · Nhân viên · Quản lý (TC-10, TC-11).
- **Giá trị biên:** hạn trả lời đúng tạo + 7 ngày (còn hạn, vì quy tắc là “≤”) và trễ 1 ms (hết hạn) – TC-02, TC-03; nhận xét 500 / 501 ký tự – TC-07; NPS đúng nửa đơn vị ±12,5 – TC-06; CSAT 2 / 3 quanh ngưỡng nhãn – TC-04.
- **Kỳ vọng tính tay, không tính bằng chính hàm cần kiểm** (TC-05, TC-06).
- **Phép thử “test có khả năng thất bại”:** đổi tạm `>` thành `>=` trong `computeInvitationStatus` → TC-02 FAIL; đổi `FLAG_CSAT_MAX` từ 2 thành 3 → TC-04 FAIL; trả lại mã thì PASS.

Bao phủ quy tắc: QT-10 → TC-01 · BR-L8-01 → TC-02, TC-03 · BR-L8-02 → TC-07, TC-08 · BR-L8-03 → TC-05, TC-06 · BR-L8-04 → TC-04 · BR-L8-05/NFR5 → TC-09 · QT-14, QT-15 → TC-10 · A01 → TC-11 · C8 → TC-12.

## 3. Tiêu chí thành công (đặt TRƯỚC khi chạy)

- 12/12 test case có kết quả thực tế ghi cụ thể và ảnh chụp trong `docs/screenshots/`.
- Mỗi quy tắc đã hiện thực (QT-10, QT-14, QT-15, BR-L8-01 → BR-L8-05) có ≥ 1 test case.
- Không còn bug Critical đang mở; bug Major còn lại có lý do và hướng xử lý.
- `npm test` PASS toàn bộ bằng một lệnh, chạy hai lần liên tiếp cho cùng kết quả.

## 4. Môi trường và dữ liệu thử

- Node.js ≥ 20, PostgreSQL ≥ 16; `.env` như README mục 3. Lệnh: `cd src/backend && npm test` (một test: `npx jest -t "TC-05 "`).
- Unit và API: repository giả trong bộ nhớ (`tests/fakes/`), đồng hồ cố định (`now` tiêm vào service) – không phụ thuộc CSDL, ngày chạy hay dữ liệu có sẵn trên máy.
- Integration: CSDL riêng `smartcrm_test` (biến `DB_NAME_TEST`, bắt buộc đuôi `_test`), `resetDb()` xoá sạch schema và chạy lại migration **trước mỗi test**; TC-09 tự nạp 1 trung tâm, 1 khách, 1 phiếu Đã đóng, 1 lời mời; TC-12 dùng `seeds/001–003`. Không bao giờ chạm vào CSDL `smartcrm`.
- CI: `.github/workflows/ci.yml` chạy `npm ci` + `npm test` trên máy sạch của GitHub với dịch vụ `postgres:16-alpine`.
