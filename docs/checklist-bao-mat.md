# Checklist bảo mật – Luồng L8 Khảo sát hài lòng CSAT/NPS (BT3, thành phần 5)

Hà Gia Thiên Bảo – 2374802010032 · tự kiểm ngày 13/11/2026 bằng cách CHẠY lệnh trên hệ thống thật (backend + PostgreSQL 16, dữ liệu mẫu). Mỗi mục: trạng thái + minh chứng; ảnh trong `docs/screenshots/`. Điền checklist đã tìm ra một bug Critical thật (BUG-009, mục 3) và hai gói phụ thuộc có lỗ hổng (mục 7).

| # | Mục | OWASP Top 10:2025 | Trạng thái |
|---|---|---|---|
| 1 | Không có secret nào trong repo | A02 | ĐÃ LÀM |
| 2 | Dữ liệu vào được kiểm ở tầng ứng dụng | A05 | ĐÃ LÀM |
| 3 | Kiểm soát truy cập theo chủ sở hữu | A01 | ĐÃ LÀM (sau khi sửa BUG-006, BUG-009) |
| 4 | Mật khẩu, dữ liệu nhạy cảm được băm/che | A04 · A07 | ĐÃ LÀM |
| 5 | Thông báo lỗi không lộ cấu trúc bên trong | A10 · A02 | ĐÃ LÀM |
| 6 | Nhật ký không ghi secret, dữ liệu cá nhân | A09 | ĐÃ LÀM |
| 7 | Phụ thuộc ghim phiên bản, đã kiểm lỗ hổng | A03 | ĐÃ LÀM một phần – còn 2 cảnh báo moderate ở frontend, có kế hoạch |

## 1. Không có secret nào trong repo — ĐÃ LÀM

- `git log --all --oneline -- .env` → **rỗng** (`.env` chưa từng vào lịch sử); `git check-ignore -v .env` → `.gitignore:2:.env`.
- `.dockerignore` chặn `.env` → image không chứa `.env`; `docker-compose.yml` lấy `DB_PASSWORD`, `SECRET_KEY` từ `.env`, không ghi cứng.
- `grep -rniE "password|secret|api_key" src/` chỉ ra mã ĐỌC biến môi trường (`config/env.js`), hàm băm mật khẩu (`services/password.js`) và ô nhập mật khẩu của trang đăng nhập – không có giá trị secret nào.
- Giá trị trong `.env.example` (`your_password`, `doi-thanh-chuoi-ngau-nhien-cua-ban`) là giá trị MẪU để chạy thử; Deployment Guide mục 3 ghi phải đổi khi triển khai thật. Mật khẩu tài khoản demo `Matkhau@123` là dữ liệu mẫu, trong CSDL chỉ lưu dạng băm.
- Ảnh: `sec-1-secret.png`.

## 2. Dữ liệu vào được kiểm ở tầng ứng dụng — ĐÃ LÀM

- Hai tầng kiểm: `validators/` (kiểu, định dạng) và `services/` (quy tắc nghiệp vụ). Mọi câu SQL tham số hoá `$1, $2…`: lệnh tìm `${…}` trong chuỗi SQL của `repositories/` chỉ ra hằng số trong mã (`COLUMNS`, `COUNTS`, điều kiện `WHERE` dựng từ chuỗi cố định) – không có dữ liệu người dùng nào ghép vào SQL.
- Thử injection: `GET /api/survey-responses?csat_max=2' OR '1'='1` → `400 VALIDATION_ERROR, field csat_max`, không trả danh sách.
- Test dữ liệu sai PASS: TC-08 (CSAT = 6 → 400 field `csat_score`), `api.validation.test.js` (số điện thoại sai, body không phải JSON → 400 `INVALID_JSON`), TC-07 (nhận xét 501 ký tự → 400).
- Ảnh: `sec-2-5-loi.png`, `TC-08.png`.

## 3. Kiểm soát truy cập theo chủ sở hữu — ĐÃ LÀM

- Chỉ API2, API3 (khách mở link có mã lời mời 64 ký tự ngẫu nhiên) và đăng nhập là công khai; mọi endpoint khác cần JWT (BUG-006, TC-11).
- QT-14: Nhân viên xin `center_id` khác → `403 FORBIDDEN` (TC-10). QT-15: Nhân viên chỉ thấy số điện thoại dạng che `090****567`.
- Báo cáo CSAT/NPS: chỉ `QUAN_LY`, Nhân viên gọi → 403.
- **Phát hiện khi điền checklist – BUG-009 (Critical):** Nhân viên trung tâm Quận 10 ngừng được kỹ thuật viên của trung tâm Tân Bình (`DELETE /api/technicians/3` → 200). Đã sửa: chỉ Quản lý của chính trung tâm được tạo, sửa, ngừng kỹ thuật viên của trung tâm đó → 403; test `tests/access-control.test.js` (4 test) PASS.
- Ảnh: `TC-10.png`, `TC-11.png`, `BUG-009-tai-lap.png`, `BUG-009-xac-nhan.png`.

## 4. Mật khẩu, dữ liệu nhạy cảm được băm/che — ĐÃ LÀM

- `SELECT username, role, left(password_hash, 40) FROM app_user` → `scrypt$80cef72fb1be8b5eec1dc65d6b55502e$…` – băm scrypt có salt riêng, so sánh thời gian hằng (`crypto.timingSafeEqual`); đăng nhập sai tên hay sai mật khẩu cùng một thông báo `INVALID_CREDENTIALS`.
- Số điện thoại khách: che `090****567` với Nhân viên ở mọi API trả dữ liệu khách hàng (QT-15).
- Token khảo sát: 32 byte ngẫu nhiên (`crypto.randomBytes`) = 64 ký tự hex, không đoán được.
- Ảnh: `sec-4-bam.png`.

## 5. Thông báo lỗi không lộ cấu trúc bên trong — ĐÃ LÀM

- Body JSON hỏng → `400 {"error":{"code":"INVALID_JSON","message":"Body không phải JSON hợp lệ"}}`.
- Tắt PostgreSQL rồi gọi API → `503 DB_UNAVAILABLE` "Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau. Mã tra cứu: 32d5aaa2" – không có stack, tên bảng, chuỗi kết nối; chi tiết lỗi chỉ nằm trong log. `/health` → `503 {"status":"degraded","db":"down"}`.
- Header `X-Powered-By` đã tắt (`app.disable('x-powered-by')`). Test: `logging.test.js`, `health.test.js`.
- Ảnh: `sec-2-5-loi.png`.

## 6. Nhật ký không ghi secret, dữ liệu cá nhân — ĐÃ LÀM

- Chạy backend, đăng nhập sai và đúng, gọi API4, tạo khách hàng có số điện thoại, gửi JSON hỏng, tắt CSDL; sau đó `grep -ciE "Matkhau@123|SaiMatKhau|eyJhbGci|0[0-9]{9}" app.log` → **0** dòng (không mật khẩu, không JWT, không số điện thoại 10 chữ số).
- `logger.js` tự che khoá `password`, `token`, `authorization`, `phone`; test `logging.test.js` PASS. Mỗi dòng có `requestId` để đối chiếu.
- Ảnh: `sec-6-log.png`.

## 7. Phụ thuộc ghim phiên bản, đã kiểm lỗ hổng — ĐÃ LÀM một phần

- Ghim: `src/backend/package-lock.json`, `src/frontend/package-lock.json` đã commit; Docker và CI cài bằng `npm ci`; ảnh nền ghim `node:20-alpine`, `postgres:16-alpine`, `nginx:1.27-alpine`.
- `npm audit --omit=dev` lần đầu: backend 2 lỗ hổng (high `body-parser`, moderate `qs`), frontend 3 high (`@remix-run/router`, `react-router`, `react-router-dom`). Đã `npm audit fix` (không đổi phiên bản chính), chạy lại 83 test và build frontend: PASS. Commit [5b34d04](https://github.com/ThienBao19/cdtn1-hagiathienbao-l8/commit/5b34d0460e516be7a8dd77c0c8df61a0a6327678) `fix(deps): npm audit fix cho backend va frontend`.
- Sau khi sửa: backend `found 0 vulnerabilities`; frontend còn **2 moderate** ở `react-router` (open redirect qua dấu `\` trong `<Link>`/`useNavigate`; lỗi SSR hydration). Bản vá chỉ có ở `react-router-dom` 7 (đổi phiên bản chính). Đánh giá: ứng dụng không điều hướng tới đường dẫn do người dùng nhập và không dùng SSR. **Kế hoạch:** nâng lên React Router 7 sau khi nộp BT3, chạy lại luồng chính.
- Gói chỉ dùng khi phát triển (không vào image chạy thật): `vite`/`esbuild` (dev server) và `jest` (`deepmerge`, mức low) – ghi nhận, nâng cùng đợt trên.
- Ảnh: `sec-7-audit.png`.
